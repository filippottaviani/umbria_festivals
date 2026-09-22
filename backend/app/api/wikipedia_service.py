try:
    import wikipedia
    wikipedia.set_lang("it")
    HAS_WIKIPEDIA = True
except ImportError:
    wikipedia = None
    HAS_WIKIPEDIA = False

from sqlalchemy.orm import Session
from app.models.city import CityInfoModel
from app.core.database import SessionLocal

def fetch_city_info_task(city_name: str, province: str):
    if not HAS_WIKIPEDIA or wikipedia is None:
        return
    try:
        db = SessionLocal()
    except Exception:
        return

    try:
        # Check if already exists
        existing = db.query(CityInfoModel).filter(CityInfoModel.name == city_name).first()
        if existing:
            return

        city_info = CityInfoModel(name=city_name, province=province, status='PENDING')
        db.add(city_info)
    
        try:
            page = wikipedia.page(city_name)
            try:
                summary = wikipedia.summary(city_name, sentences=4)
            except Exception:
                summary = page.summary
            city_info.wiki_summary = summary
            city_info.wiki_url = page.url
            city_info.status = 'VERIFIED'
        except wikipedia.exceptions.DisambiguationError as e:
            city_info.status = 'AMBIGUOUS'
        except wikipedia.exceptions.PageError:
            try:
                page = wikipedia.page(f"{city_name} (Italia)")
                try:
                    summary = wikipedia.summary(f"{city_name} (Italia)", sentences=4)
                except Exception:
                    summary = page.summary
                city_info.wiki_summary = summary
                city_info.wiki_url = page.url
                city_info.status = 'VERIFIED'
            except:
                city_info.status = 'NOT_FOUND'
        except Exception as e:
            print(f"Error fetching wikipedia for {city_name}: {e}")
            city_info.status = 'NOT_FOUND'
            
        db.commit()
    except Exception as db_err:
        print(f"Database error in background task fetch_city_info_task for {city_name}: {db_err}")
    finally:
        try:
            db.close()
        except Exception:
            pass
