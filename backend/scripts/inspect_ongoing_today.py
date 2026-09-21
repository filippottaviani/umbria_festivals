import os
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.festival import FestivalModel

def inspect_ongoing():
    db = SessionLocal()
    try:
        today = date(2026, 9, 21)
        festivals = db.query(FestivalModel).all()
        ongoing = [f for f in festivals if f.start_date <= today <= f.end_date]
        print(f"Total ongoing festivals today ({today}): {len(ongoing)}\n")
        for f in ongoing[:15]:
            print(f"[{f.city} ({f.province})] '{f.name}' | Dates: {f.start_date} -> {f.end_date} | Image: {f.image_url[:50]}")
    finally:
        db.close()

if __name__ == "__main__":
    inspect_ongoing()
