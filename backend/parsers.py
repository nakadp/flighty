# backend/parsers.py
from bs4 import BeautifulSoup

def normalize_flight_data(html_content, platform="trip"):
    """
    Parses raw HTML content into a standardized JSON format for the frontend.
    Assumes HTML has been fully loaded (including interactions) by Playwright.
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    flights = []
    
    # Selectors should be imported from config, but for parser isolation we'll use string literals 
    # that match config.py or use robust searching.
    # In a real scenario, pass `SELECTORS` as an arg or import it.
    
    # 1. Locate all flight cards
    # Note: Class names here must match config.py. 
    # Using simple checks for demonstration; in production, refer strictly to config.
    cards = soup.select("div.flight-item") 
    
    if not cards:
        # Fallback or logging if no cards found
        pass

    for card in cards:
        try:
            # --- Extract Price ---
            price_tag = card.select_one("span.price-text")
            if not price_tag: continue
            price_raw = price_tag.text.strip()
            # Remove currency symbols and commas (e.g. "¥ 1,200" -> 1200)
            price = int(''.join(filter(str.isdigit, price_raw)))
            
            # --- Extract Airline ---
            airline_tag = card.select_one("div.airline-name")
            airline = airline_tag.text.strip() if airline_tag else "Unknown Airline"
            
            # --- Extract Times ---
            # Trip.com list structure often has separate blocks for outbound/inbound
            # This logic assumes a single leg or synthesizes the main leg info.
            # Adjust selectors based on actual DOM structure.
            dep_time = card.select_one("div.depart-box .time")
            arr_time = card.select_one("div.arrive-box .time")
            
            time_dep = dep_time.text.strip() if dep_time else "00:00"
            time_arr = arr_time.text.strip() if arr_time else "00:00"
            
            # --- Extract Airports ---
            dep_airport = card.select_one("div.depart-box .airport-name")
            arr_airport = card.select_one("div.arrive-box .airport-name")
            
            airport_dep_code = dep_airport.text.strip() if dep_airport else "N/A"
            airport_arr_code = arr_airport.text.strip() if arr_airport else "N/A"

            # --- Duration ---
            dur_tag = card.select_one("div.flight-duration")
            duration_text = dur_tag.text.strip() if dur_tag else "0h 0m"
            duration_minutes = parse_duration(duration_text)

            # --- Rich Data (Baggage/Aircraft) ---
            # These might exist only if we successfully hovered in scraper.py
            baggage_tag = card.select_one("span.baggage-info")
            baggage = baggage_tag.text.strip() if baggage_tag else "Check details"
            
            aircraft_tag = card.select_one("span.aircraft-info") # Hypothetical selector
            if not aircraft_tag: 
                aircraft_tag = card.select_one("span.flight-no") # Fallback to flight no
            
            aircraft = aircraft_tag.text.strip() if aircraft_tag else ""

            # --- Stops ---
            stops_tag = card.select_one("div.stop-info")
            stops_text = stops_tag.text.strip() if stops_tag else "Non-stop"
            stops = 0 if "Non-stop" in stops_text or "Direct" in stops_text else 1

            # --- Link ---
            # Usually the whole card is clickable, or there is a Book button
            # Trip.com links are complex; often just redirecting the user to the search page is safer
            # or extracting the deep link if available.
            link_tag = card.select_one("button.book-btn")
            link = "https://uk.trip.com" # Default fallback

            flight_obj = {
                "price": price,
                "currency": "CNY", # Or extract from symbol
                "airline": airline,
                "flight_no": aircraft, # Often combined
                "departure_info": {
                    "time": time_dep,
                    "airport": airport_dep_code
                },
                "arrival_info": {
                    "time": time_arr,
                    "airport": airport_arr_code
                },
                "duration_text": duration_text,
                "duration_minutes": duration_minutes,
                "stops": stops,
                "baggage": baggage,
                "link": link,
                "platform": platform
            }
            flights.append(flight_obj)

        except Exception as e:
            # print(f"Parser error on card: {e}")
            continue
            
    return flights

def filter_best_flights(flights):
    """
    Returns a dict with 'cheapest', 'quickest', 'recommended'
    """
    if not flights:
        return None
        
    # Sorts
    sorted_by_price = sorted(flights, key=lambda x: x['price'])
    sorted_by_duration = sorted(flights, key=lambda x: x['duration_minutes'])
    
    # Simple recommendation logic: Weighted score (Price * 0.7 + Duration * 0.3 normalized)
    # For now, just return cheapest as recommended
    recommended = sorted_by_price[0]

    return {
        "cheapest": sorted_by_price[0],
        "quickest": sorted_by_duration[0],
        "recommended": recommended
    }

def parse_duration(text):
    """
    Converts '2h 30m' or '2h30m' to minutes (integer).
    """
    text = text.lower().replace(" ", "")
    h = 0
    m = 0
    
    if 'h' in text:
        parts = text.split('h')
        try:
            h = int(parts[0])
            text = parts[1]
        except: pass
        
    if 'm' in text:
        parts = text.split('m')
        try:
            m = int(parts[0])
        except: pass
        
    return h * 60 + m
