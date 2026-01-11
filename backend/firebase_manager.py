# backend/firebase_manager.py
import firebase_admin
from firebase_admin import credentials, firestore
import os
from datetime import datetime

# Global Mock DB
class MockCollection:
    def __init__(self, name):
        self.name = name
    def document(self, doc_id):
        return MockDocument(f"{self.name}/{doc_id}")
    def where(self, field, op, value):
        return self # Mock query
    def limit(self, count):
        return self # Mock limit
    def stream(self):
        # Return a mock job IF we are querying analysis_jobs
        if "analysis_jobs" in self.name:
             # Check if we already processed it to avoid loop in this simple mock
             if not getattr(self, "_job_yielded", False):
                 self._job_yielded = True
                 print("   [MOCK DB] Simulating a pending job for demo...")
                 return [MockDocument("analysis_jobs/mock_job_123")]
        return []
    def update(self, data):
         print(f"   [MOCK DB] Update {self.name}: {data}")

class MockDocument:
    def __init__(self, path):
        self.path = path
        self.id = path.split('/')[-1]
    def to_dict(self):
        return {
            "origin": "PEK", "destination": "LHR",
            "startDate": "2026-03-01", "endDate": "2026-03-05",
            "minDays": 5, "maxDays": 5,
            "userId": "test_mock_user"
        }
    def update(self, data):
        print(f"   [MOCK DB] Update {self.path}: {data}")
    def set(self, data, merge=False):
        print(f"   [MOCK DB] Set {self.path}: {data}")
    def collection(self, name):
        return MockCollection(f"{self.path}/{name}")

class MockDB:
    def collection(self, name):
        return MockCollection(name)

# Initialize only once
if not firebase_admin._apps:
    try:
        # Expect serviceAccountKey.json in the same directory
        key_path = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
        if os.path.exists(key_path):
            cred = credentials.Certificate(key_path)
            firebase_admin.initialize_app(cred)
            print("✅ Firebase initialized with key.")
        else:
            print(f"⚠️ Warning: serviceAccountKey.json not found. Using MOCK database mode.")
    except Exception as e:
         print(f"⚠️ Firebase init failed: {e}")

def get_db():
    if firebase_admin._apps:
        return firestore.client()
    
    # Fallback to Mock DB if no credentials
    # This allows the loop to run and logic to be tested
    return MockDB()

def upload_flight_data(user_id, date_str, trip_day_key, flight_data):
    """
    Uploads flight data to Firestore.
    Path: users/{user_id}/analysis_results/{date_str}
    Field: {trip_day_key}: [data]
    """
    db = get_db()
    if not db:
        print("❌ Firebase not initialized. Data not saved.")
        return

    try:
        doc_ref = db.collection("users").document(user_id)\
                    .collection("analysis_results").document(date_str)
        
        # Check if it's a mock
        if isinstance(db, MockDB):
             print(f"   [MOCK] Would upload {len(flight_data) if flight_data else 0} items to {trip_day_key}")
             return

        doc_ref.set({
            trip_day_key: flight_data,
            "last_updated": firestore.SERVER_TIMESTAMP
        }, merge=True)
        print(f"   ☁️ Uploaded {len(flight_data)} flights to Firebase ({trip_day_key})")
    except Exception as e:
        print(f"   ❌ Firebase Upload Error: {e}")
