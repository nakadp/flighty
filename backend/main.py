# backend/main.py
import asyncio
import sys
import time
from datetime import datetime
from google.cloud import firestore  # Need this for transactional updates if possible, or just use current way
from firebase_manager import get_db
from scraper import FlightScraper

# ------------------------------------------------------------------------------
# JOB WORKER
# Listens for tasks in 'analysis_jobs' collection with status='pending'
# ------------------------------------------------------------------------------

async def process_job(job_id, job_data, scraper):
    print(f"\n🔔 New Job Detected: {job_id}")
    print(f"   Params: {job_data.get('origin')} -> {job_data.get('destination')} "
          f"[{job_data.get('startDate')} to {job_data.get('endDate')}]")

    db = get_db()
    job_ref = db.collection("analysis_jobs").document(job_id)

    # 1. Mark as Running
    job_ref.update({
        "status": "running",
        "startedAt": datetime.now()
    })

    try:
        # 2. Run Scraper
        # Extract params
        origin = job_data.get('origin')
        dest = job_data.get('destination')
        start_date = job_data.get('startDate')
        end_date = job_data.get('endDate')
        min_days = int(job_data.get('minDays', 5))
        max_days = int(job_data.get('maxDays', 9))
        
        # Determine User ID (important for where to save results)
        user_id = job_data.get('userId', 'test_user_001')
        
        # Update scraper's context if needed (e.g., user_id)
        scraper.user_id = user_id
        
        await scraper.scrape_trip_data(
            origin=origin,
            dest=dest,
            start_date=start_date,
            end_date=end_date,
            min_days=min_days,
            max_days=max_days,
            job_id=job_id
        )

        # 3. Mark as Completed
        job_ref.update({
            "status": "completed",
            "completedAt": datetime.now()
        })
        print(f"✅ Job {job_id} Completed Successfully.")

    except Exception as e:
        print(f"❌ Job {job_id} Failed: {e}")
        job_ref.update({
            "status": "failed",
            "error": str(e),
            "completedAt": datetime.now()
        })

async def run_worker():
    db = get_db()
    if not db:
        print("❌ Database connection failed.")
        return

    print("👷 Flighty Analysis Worker Started")
    print("   Waiting for jobs in 'analysis_jobs' collection (Check Firestore)...")

    # Initialize Scraper once and keep browser open
    scraper = FlightScraper()
    await scraper.start()

    try:
        # Polling Loop (Simple and robust)
        # We could use on_snapshot, but polling is easier to manage control flow in async python for now
        while True:
            # Query for pending jobs
            # Order by createdAt to process oldest first (FIFO)
            loading_query = db.collection("analysis_jobs").where("status", "==", "pending").limit(1)
            docs = loading_query.stream()
            
            job_found = False
            for doc in docs:
                job_found = True
                await process_job(doc.id, doc.to_dict(), scraper)
                # Process one at a time, then loop again to check for more
                break 
            
            if not job_found:
                # No jobs, sleep a bit
                print(".", end="", flush=True) # Simple heartbeat
                await asyncio.sleep(3)
                
    except KeyboardInterrupt:
        print("\nStopping worker...")
    finally:
        await scraper.close()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        
    asyncio.run(run_worker())
