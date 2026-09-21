import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.festival import FestivalModel

def inspect_all():
    db = SessionLocal()
    try:
        festivals = db.query(FestivalModel).order_by(FestivalModel.city, FestivalModel.name).all()
        print(f"Total count: {len(festivals)}\n")
        for f in festivals:
            print(f"[{f.id}] '{f.name}' | City: '{f.city}' ({f.province}) | Dates: {f.start_date} to {f.end_date} | Source: {f.source_url[:50]}")
    finally:
        db.close()

if __name__ == "__main__":
    inspect_all()
