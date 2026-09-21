import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.festival import FestivalModel

def inspect():
    db = SessionLocal()
    try:
        festivals = db.query(FestivalModel).all()
        print(f"Total festivals in DB: {len(festivals)}")
        
        verified_count = sum(1 for f in festivals if f.is_verified_dates == 'VERIFIED')
        pending_count = sum(1 for f in festivals if f.is_verified_dates == 'PENDING_CONFIRMATION')
        estimated_count = sum(1 for f in festivals if f.is_verified_dates == 'ESTIMATED')
        
        print(f"VERIFIED: {verified_count}")
        print(f"PENDING_CONFIRMATION: {pending_count}")
        print(f"ESTIMATED: {estimated_count}")
        
        print("\nSample 25 festivals:")
        for f in festivals[:25]:
            print(f"ID: {f.id} | {f.name} ({f.city}, {f.province}) | {f.start_date} -> {f.end_date} | Source: {f.verification_source} | Status: {f.is_verified_dates}")
    finally:
        db.close()

if __name__ == "__main__":
    inspect()
