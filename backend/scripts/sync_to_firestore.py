"""
Utility script to synchronize Sagra Umbra festivals from SQL (PostgreSQL/SQLite)
to Google Cloud Firestore.
"""
import os
import sys
import json

# Add backend app to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.festival import FestivalModel

def export_festivals_to_firestore_payload():
    payload = []
    # 1. Try PostgreSQL SessionLocal
    try:
        db = SessionLocal()
        festivals = db.query(FestivalModel).all()
        for f in festivals:
            payload.append({
                "id": str(f.id),
                "name": f.name,
                "city": f.city,
                "province": f.province,
                "latitude": f.latitude,
                "longitude": f.longitude,
                "start_date": f.start_date.isoformat() if f.start_date else None,
                "end_date": f.end_date.isoformat() if f.end_date else None,
                "description": f.description,
                "menu_info": f.menu_info,
                "image_url": f.image_url,
                "program_pdf_url": getattr(f, "program_pdf_url", None),
                "featured_dishes": getattr(f, "featured_dishes", []),
                "is_active": True
            })
        db.close()
        if payload:
            return payload
    except Exception as e:
        print(f"PostgreSQL connection unavailable ({e}), trying SQLite fallback...")

    # 2. Try SQLite fallback
    import sqlite3
    db_candidates = [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "festivals.db")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "umbria_festivals.db")),
    ]
    for candidate in db_candidates:
        if os.path.exists(candidate):
            try:
                conn = sqlite3.connect(candidate)
                conn.row_factory = sqlite3.Row
                cur = conn.cursor()
                rows = cur.execute("SELECT * FROM festivals").fetchall()
                for r in rows:
                    row_dict = dict(r)
                    payload.append({
                        "id": str(row_dict.get("id")),
                        "name": row_dict.get("name"),
                        "city": row_dict.get("city"),
                        "province": row_dict.get("province", "PG"),
                        "latitude": float(row_dict.get("latitude") or 43.1107),
                        "longitude": float(row_dict.get("longitude") or 12.3908),
                        "start_date": str(row_dict.get("start_date") or ""),
                        "end_date": str(row_dict.get("end_date") or ""),
                        "description": row_dict.get("description", ""),
                        "menu_info": row_dict.get("menu_info", ""),
                        "image_url": row_dict.get("image_url", ""),
                        "program_pdf_url": row_dict.get("program_pdf_url"),
                        "featured_dishes": [],
                        "is_active": True
                    })
                conn.close()
                if payload:
                    print(f"Loaded {len(payload)} festivals from SQLite ({candidate})")
                    return payload
            except Exception as sql_err:
                print(f"Error querying SQLite {candidate}: {sql_err}")
    # 3. Fallback to seed dataset from seed_agent_festivals.py
    try:
        from seed_agent_festivals import FESTIVALS_DATA
        for i, item in enumerate(FESTIVALS_DATA, start=1):
            payload.append({
                "id": str(i),
                "name": item.get("name"),
                "city": item.get("city"),
                "province": item.get("province", "PG"),
                "latitude": float(item.get("latitude") or 43.1107),
                "longitude": float(item.get("longitude") or 12.3908),
                "start_date": item.get("start_date"),
                "end_date": item.get("end_date"),
                "description": item.get("description", ""),
                "menu_info": item.get("menu_info", ""),
                "image_url": item.get("image_url", ""),
                "cultural_info": item.get("cultural_info", ""),
                "dish_info": item.get("dish_info", ""),
                "program_pdf_url": None,
                "featured_dishes": [],
                "is_active": True
            })
        if payload:
            print(f"Loaded {len(payload)} authentic festivals from seed dataset.")
            return payload
    except Exception as seed_err:
        print(f"Seed fallback error: {seed_err}")

    return payload


def main():
    print("Exporting festivals from local SQL database...")
    festivals = export_festivals_to_firestore_payload()
    print(f"Loaded {len(festivals)} festivals.")

    cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if cred_path and os.path.exists(cred_path):
        try:
            import firebase_admin
            from firebase_admin import credentials, firestore

            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            fs_db = firestore.client()

            print("Uploading festivals to Cloud Firestore...")
            batch = fs_db.batch()
            for f in festivals:
                doc_ref = fs_db.collection("festivals").document(f["id"])
                batch.set(doc_ref, f, merge=True)
            batch.commit()
            print("Successfully synchronized with Cloud Firestore!")
            return
        except Exception as e:
            print(f"Firebase Admin SDK sync failed: {e}")

    # Fallback: export to JSON file for offline inspection or manual import
    output_path = os.path.join(os.path.dirname(__file__), "firestore_festivals_backup.json")
    with open(output_path, "w", encoding="utf-8") as out:
        json.dump(festivals, out, indent=2, ensure_ascii=False)
    print(f"Exported {len(festivals)} festivals to {output_path} (ready for Firestore import).")

if __name__ == "__main__":
    main()
