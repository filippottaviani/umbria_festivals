import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.festival import FestivalModel

def inspect_castiglione():
    db = SessionLocal()
    try:
        festivals = db.query(FestivalModel).filter(FestivalModel.city.ilike("%Castiglione%")).all()
        print(f"Total festivals assigned to Castiglione del Lago: {len(festivals)}\n")
        for f in festivals:
            print(f"ID: {f.id} | Name: '{f.name}' | City: '{f.city}' | Dates: {f.start_date} to {f.end_date} | Image: {f.image_url[:60]}")
    finally:
        db.close()

if __name__ == "__main__":
    inspect_castiglione()
