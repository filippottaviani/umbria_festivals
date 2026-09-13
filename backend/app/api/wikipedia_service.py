import wikipedia
from sqlalchemy.orm import Session
from app.models.city import CityInfoModel
from app.core.database import SessionLocal

wikipedia.set_lang("it")

def fetch_city_info_task(city_name: str, province: str):
    db = SessionLocal()
    try:
        # Check if already exists
        existing = db.query(CityInfoModel).filter(CityInfoModel.name == city_name).first()
        if existing:
            return

        city_info = CityInfoModel(name=city_name, province=province, status='PENDING')
        db.add(city_info)
    
        try:
            page = wikipedia.page(city_name)
            city_info.wiki_summary = page.summary
            city_info.wiki_url = page.url
            city_info.status = 'VERIFIED'
        except wikipedia.exceptions.DisambiguationError as e:
            city_info.status = 'AMBIGUOUS'
        except wikipedia.exceptions.PageError:
            try:
                page = wikipedia.page(f"{city_name} (Italia)")
                city_info.wiki_summary = page.summary
                city_info.wiki_url = page.url
                city_info.status = 'VERIFIED'
            except:
                city_info.status = 'NOT_FOUND'
        except Exception as e:
            print(f"Error fetching wikipedia for {city_name}: {e}")
            city_info.status = 'NOT_FOUND'
            
        db.commit()
    finally:
        db.close()
