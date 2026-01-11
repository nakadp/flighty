# backend/config.py

# ==============================================================================
# ⚠️ IMPORTANT MAINTENANCE NOTE ⚠️
# ==============================================================================
# The CSS selectors below (e.g., "div.flight-item", ".price-text") are subject 
# to change frequenty by the target websites (Trip.com/Expedia) as part of their 
# anti-scraping measures.
# 
# IF THE SCRAPER FAILS TO FIND ELEMENTS:
# 1. Open the URL in your browser (F12 Developer Tools).
# 2. Inspect the elements manually.
# 3. Update the selectors below with the new class names or IDs.
# ==============================================================================

# Trip.com URL Template (Round Trip)
TRIP_URL_TEMPLATE = "https://www.trip.com/flights/{origin}-to-{dest}/tickets-{origin}-{dest}?dflighttype=roundtrip&dcity={origin}&acity={dest}&ddate={dep_date}&rdate={ret_date}&class=economy&quantity=1"

# Expedia URL Template
EXPEDIA_URL_TEMPLATE = "https://www.expedia.com/Flights-Search?flight-type=on&mode=search&trip=roundtrip&leg1=from:{origin},to:{dest},departure:{dep_date}TANYT&leg2=from:{dest},to:{origin},departure:{ret_date}TANYT&passengers=children:0,adults:1,seniors:0,infantinlap:Y"

# CSS Selectors
SELECTORS = {
    "trip": {
        # Container for each flight option card
        "card": "div.flight-item",  
        
        # Primary info
        "price": "span.price-text",
        
        # Segment details (Departure)
        "airline_dep": "div.depart-box .airline-name",
        "time_dep": "div.depart-box .time",
        "airport_dep": "div.depart-box .airport-name",
        
        # Segment details (Arrival)
        "time_arr": "div.arrive-box .time",
        "airport_arr": "div.arrive-box .airport-name",
        
        # Duration and Stops
        "duration": "div.flight-duration",
        "stops": "div.stop-info",
        
        # Rich Data (Requires Hover/Click interaction to be visible)
        # Mouse hover target often reveals fleet/baggage info
        "hover_target": "div.flight-schedule", 
        "baggage": "span.baggage-info", 
        "aircraft": "span.aircraft-info",
        "flight_no": "span.flight-no"
    },
    "expedia": {
        "card": "li[data-test-id='offer-listing']",
        "price": "span.uitk-price-a11y",
        # Add updated Expedia selectors here based on inspection
    }
}
