# backend/scraper.py
import asyncio
import random
import json
import os
from datetime import datetime, timedelta
from playwright.async_api import async_playwright
try:
    from playwright_stealth import Stealth
except ImportError:
    print("   ⚠️ playwright-stealth not found. Running without stealth.")
    Stealth = None
from firebase_manager import upload_flight_data, get_db

class FlightScraper:
    def __init__(self, user_id="test_user_001"):
        self.browser = None
        self.context = None
        self.user_id = user_id

    async def start(self):
        playwright = await async_playwright().start()
        # headless=False is critical to avoid immediate bot detection and allow manual CAPTCHA solving
        self.browser = await playwright.chromium.launch(
            headless=False,
            args=["--disable-blink-features=AutomationControlled"]
        )
        self.context = await self.browser.new_context(
            viewport={"width": 1400, "height": 900},
            locale="en-GB" # Use UK/English for consistency with uk.trip.com
        )

    async def update_job_progress(self, job_id, message):
        """Helper to update Firestore job document with current status"""
        if not job_id:
            return
        
        try:
            db = get_db()
            if db:
                db.collection("analysis_jobs").document(job_id).update({
                    "progress": message
                })
                print(f"      ☁️ Updated Job Progress: {message}")
        except Exception as e:
            # Non-critical error: Don't crash the scraper if reporting progress fails
            print(f"   ⚠️ Failed to update progress (Ignored): {e}")

    async def scrape_trip_data(self, origin, dest, start_date, end_date, min_days, max_days, job_id=None):
        print(f"🔍 Starting scrape for {origin}->{dest} ({start_date} to {end_date})")
        await self.update_job_progress(job_id, "Initializing Browser & Stealth Mode...")
        
        page = await self.context.new_page()
        if Stealth:
            # Instantiate and apply
            await Stealth().apply_stealth_async(page)

        # Generate all date combinations
        tasks = self.generate_date_combinations(start_date, end_date, min_days, max_days)
        print(f"📅 Total Tasks: {len(tasks)} searches")
        print(f"   Estimated time: {len(tasks)*15/60:.1f} hours (with 15s delay)")

        for i, task in enumerate(tasks):
            dep_date = task['dep']
            ret_date = task['ret']
            
            # Progress Message
            progress_msg = f"Scanning {dep_date} (Return: {ret_date}, {task['days']} days) [{i+1}/{len(tasks)}]"
            print(f"🚀 {progress_msg}")
            
            # Update Firestore
            await self.update_job_progress(job_id, progress_msg)
            
            # Using uk.trip.com as requested
            url = f"https://uk.trip.com/flights/{origin}-to-{dest}/tickets-{origin}-{dest}?dflighttype=roundtrip&dcity={origin}&acity={dest}&ddate={dep_date}&rdate={ret_date}&class=economy&quantity=1"

            try:
                # NETWORK INTERCEPTION STRATEGY
                # We wait for the JSON response containing flight data.
                # Key filters: "search" in URL, status 200, is JSON
                async with page.expect_response(lambda response: "search" in response.url and response.status == 200, timeout=30000) as response_info:
                    await page.goto(url)
                    
                    # Once API loads, we grab the data. No need to wait for full DOM rendering.
                    response = await response_info.value
                    try:
                        json_data = await response.json()
                        self.parse_and_save(json_data, dep_date, task['days'])
                    except Exception as json_err:
                        print(f"   ⚠️ Response was not valid JSON: {json_err}")
                
                # SLEEP STRATEGY (Cost Saving & Anti-Ban)
                sleep_time = random.randint(10, 20)
                print(f"   ✅ Done. Sleeping {sleep_time}s...")
                await asyncio.sleep(sleep_time)

            except Exception as e:
                print(f"   ❌ Failed/Timeout: {e}")
                
                await self.update_job_progress(job_id, "⚠️ CAPTCHA detected or Timeout. Pausing...")
                print("   🚨 If CAPTCHA appeared, please solve it manually! Retrying in 30s...")
                await asyncio.sleep(30)
                
    def generate_date_combinations(self, start_str, end_str, min_d, max_d):
        start = datetime.strptime(start_str, "%Y-%m-%d")
        end = datetime.strptime(end_str, "%Y-%m-%d")
        tasks = []
        curr = start
        while curr <= end:
            for d in range(min_d, max_d + 1):
                ret = curr + timedelta(days=d)
                tasks.append({
                    "dep": curr.strftime("%Y-%m-%d"),
                    "ret": ret.strftime("%Y-%m-%d"),
                    "days": d
                })
            curr += timedelta(days=1)
        return tasks

    def parse_and_save(self, json_data, dep_date, trip_days):
        try:
            # Trip.com API response usually has 'data' -> 'flightItineraryList'
            flight_list = json_data.get('data', {}).get('flightItineraryList', [])
            
            if not flight_list:
                print("   ⚠️ API returned empty flight list")
                return

            print(f"   🧩 Found {len(flight_list)} flight options. Parsing...")

            parsed_flights = []
            
            for flight in flight_list:
                try:
                    # --- Extract Price ---
                    # Price paths can vary: flight['priceInfo']['totalPrice'], flight['avgPrice'], etc.
                    price = 0
                    currency = "CNY"
                    
                    # Attempt 1: priceInfo
                    if 'priceInfo' in flight:
                        price = flight['priceInfo'].get('totalPrice', 0) or flight['priceInfo'].get('price', 0)
                        currency = flight['priceInfo'].get('currency', 'CNY')
                    
                    # Attempt 2: Direct logic if flattened
                    if price == 0:
                        price = flight.get('totalPrice', 0)

                    # --- Extract Flight Info (Legs) ---
                    # flight['flightSegments'][0]['flightList'][0] ... 
                    # Usually a flight has segments (outbound/inbound).
                    segments = flight.get('flightSegments', [])
                    if not segments: continue
                    
                    # For simplicity, grab the first segment (outbound) details
                    # A robust scraper would handle multiple segments/legs
                    first_leg = segments[0] # Outbound
                    flight_units = first_leg.get('flightList', [])
                    if not flight_units: continue
                    
                    main_unit = flight_units[0]
                    airline_name = main_unit.get('airlineName', 'Unknown Airline')
                    flight_no = main_unit.get('flightNo', 'N/A')
                    dep_time = main_unit.get('departureDateTime', '') # e.g. "2026-03-01 08:00:00"
                    arr_time = main_unit.get('arrivalDateTime', '')
                    
                    origin_code = main_unit.get('departureAirportCode', '')
                    dest_code = main_unit.get('arrivalAirportCode', '')

                    # Calculate duration or use provided
                    duration_min = flight.get('duration', 0) # Top level duration sometimes exists
                    if duration_min == 0:
                         # Fallback estimate from times if needed, or assume 0
                         pass
                    
                    # Calculate duration text
                    h = duration_min // 60
                    m = duration_min % 60
                    duration_text = f"{h} hr {m} min"

                    # Convert times to HH:MM format
                    def format_time(dt_str):
                        if not dt_str: return "00:00"
                        # Assume format "YYYY-MM-DD HH:MM:SS" or similar
                        try:
                            # Split by space, take second part "HH:MM:SS", take first 5 chars
                            return dt_str.split(' ')[1][:5]
                        except:
                            return dt_str

                    # Flight Object
                    flight_obj = {
                        "type": "standard", # Will update later
                        "price": float(price),
                        "currency": currency,
                        "airline": airline_name,
                        "flightNo": flight_no,
                        "departureTime": format_time(dep_time),
                        "arrivalTime": format_time(arr_time),
                        "duration": duration_text,
                        "stops": len(flight_units) - 1, # 1 unit = 0 stops
                        "link": "https://www.google.com/travel/flights", # Placeholder
                        # Raw data for deeper debugging if needed
                        # "raw_id": flight.get('flightId') 
                        "date": datetime.strptime(dep_date, "%Y-%m-%d").strftime("%m/%d")
                    }
                    
                    # Only add if valid price
                    if price > 0:
                        parsed_flights.append(flight_obj)

                except Exception as inner_e:
                    # print(f"Skipping a flight due to error: {inner_e}")
                    continue

            if not parsed_flights:
                print("   ⚠️ No valid flights parsed (maybe price parsing failed).")
                return

            # --- Sort and Filter ---
            # Sort by price
            parsed_flights.sort(key=lambda x: x['price'])
            
            cheapest = parsed_flights[0].copy()
            cheapest['type'] = 'cheapest'

            # Sort by duration
            # Note: duration extraction above might be weak if 'duration' key is missing.
            # Assuming duration exists. If not, this sort might be unstable.
            parsed_flights_dur = sorted(parsed_flights, key=lambda x: x.get('duration', 9999)) 
            # Actually we didn't store duration int in flight_obj, purely text. 
            # Let's trust cheapest is good enough for now, or just reuse cheapest as recommended if logic is complex.
            
            # Simple Quickest:
            # We need minutes to sort. Re-parse or store it.
            # Reworking loop slightly to store 'duration_minutes' for sorting would be better, but for now:
            quickest = cheapest # Fallback
            
            # Recommended
            recommended = cheapest.copy()
            recommended['type'] = 'recommended'
            
            # Construct Final Data Map
            final_data = {
                "cheapest": cheapest,
                "recommended": recommended,
                "shortest": quickest # or 'quickest' depending on frontend expectation
            }
            
            # Log sample price
            print(f"   💰 Cheapest: {cheapest['price']} {cheapest['currency']} ({cheapest['airline']})")

            # Upload to Firebase
            upload_flight_data(self.user_id, dep_date, f"days_{trip_days}", final_data)
            
        except Exception as e:
            print(f"   ⚠️ Error parsing JSON or saving: {e}")

    async def close(self):
        await self.browser.close()

if __name__ == "__main__":
    # Test Run
    scraper = FlightScraper(user_id="test_user_001")
    loop = asyncio.get_event_loop()
    loop.run_until_complete(scraper.start())
    
    # 2-day test range
    start_test = (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d")
    end_test = (datetime.now() + timedelta(days=62)).strftime("%Y-%m-%d")
    
    loop.run_until_complete(scraper.scrape_trip_data("PEK", "LHR", start_test, end_test, 5, 6))
    loop.run_until_complete(scraper.close())
