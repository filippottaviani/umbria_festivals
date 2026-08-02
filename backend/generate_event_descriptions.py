"""
Script per l'esecuzione autonoma dell'Agente Generatore di Descrizioni Organiche.
Scandisce il database delle sagre dell'Umbria e genera testi coinvolgenti,
organici e personalizzati per valorizzare ogni borgo ed evento.
"""

import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.festival import FestivalModel
from app.core.agent_writer import generate_organic_festival_description

def run_description_agent(overwrite_existing: bool = False):
    db = SessionLocal()
    try:
        festivals = db.query(FestivalModel).all()
        print(f"[Agente Descrizioni] Analisi di {len(festivals)} sagre nel database...")
        
        generated_count = 0
        for f in festivals:
            needs_description = (
                overwrite_existing or
                not f.description or
                len(f.description.strip()) < 50 or
                "Manifestazioni Sportive" in f.name
            )
            
            if needs_description:
                organic_text = generate_organic_festival_description(
                    name=f.name,
                    city=f.city,
                    province=f.province,
                    dish_info=f.dish_info,
                    cultural_info=f.cultural_info,
                    menu_info=f.menu_info,
                    program_info=f.program_info
                )
                f.description = organic_text
                generated_count += 1
                print(f"[{generated_count}] Generata descrizione per: {f.name} ({f.city})")

        db.commit()
        print(f"\n[Agente Descrizioni] Completato con successo! {generated_count} descrizioni organiche generate ed aggiornate.")
        return generated_count
    finally:
        db.close()


if __name__ == "__main__":
    run_description_agent(overwrite_existing=True)
