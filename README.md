# Umbria Festivals

Portale di sagre e feste popolari dell'Umbria con crawler, API e interfaccia utente.

## Descrizione

Questo progetto raccoglie e visualizza eventi popolari in Umbria tramite:
- un *scraper* Scrapy/Playwright che estrae sagre da fonti web affidabili;
- un *backend* FastAPI che espone i dati su un database PostgreSQL/PostGIS;
- un *frontend* React + Vite che mostra i festival su mappa e lista.

## Architettura

Il progetto è composto da quattro componenti principali:

1. `db` - PostgreSQL con estensione PostGIS, usato per memorizzare le sagre.
2. `scraper` - Scrapy spider che estrae informazioni da più siti e le salva nel database.
3. `backend` - API FastAPI con due endpoint per recuperare festival e ricerche geografiche.
4. `frontend` - interfaccia React con mappa Leaflet e vista calendario.

## Tech stack

- Python 3.11
- Scrapy 2.11
- Scrapy Playwright
- FastAPI
- SQLAlchemy, GeoAlchemy2
- PostgreSQL + PostGIS
- React, Vite, Leaflet
- Docker / docker-compose

## Avvio rapido

Usa `docker-compose` per avviare tutti i servizi insieme:

```bash
docker-compose up --build
```

Questo comando crea e avvia i servizi:
- `db` su `localhost:5432`
- `backend` su `localhost:8000`
- `frontend` su `localhost:3000`

## Servizi

### Database

Il servizio `db` usa l'immagine `postgis/postgis:15-3.3`.

Variabili impostate nel `docker-compose.yaml`:
- POSTGRES_USER=postgres
- POSTGRES_PASSWORD=password
- POSTGRES_DB=umbriafestivals

### Scraper

Lo scraper è configurato in `scraper/umbria_festivals/settings.py` e salva direttamente su PostgreSQL tramite `scraper/umbria_festivals/pipelines.py`.

Avvio nel container:

```bash
docker-compose run --rm scraper
```

Oppure, in locale:

```bash
cd scraper
python run_spider.py
```

### Backend

Il backend FastAPI è definito in `backend/app/main.py` e usa SQLAlchemy per connettersi al database.

Endpoint principali:
- `GET /api/v1/festivals` - restituisce tutte le sagre.
- `GET /api/v1/festivals?province=PG` - filtra per provincia.
- `GET /api/v1/festivals/nearby?latitude=...&longitude=...&radius_km=20` - ricerca geospaziale.

Il backend crea automaticamente le tabelle nel database all'avvio.

### Frontend

L'interfaccia React si trova in `frontend/src`.

Caratteristiche principali:
- mappa Leaflet dei festival
- vista calendario/lista
- filtro per provincia, categoria e ricerca testuale

Al momento l'app usa dati di esempio nella prima fase di sviluppo. Per usare l'API reale, attiva la chiamata `fetchFestivals()` in `frontend/src/App.jsx`.

## Fonti dei dati

Lo scraper usa le sorgenti definite in `scraper/umbria_festivals/sources.py` e cerca eventi in formato comune per nome, città, provincia, coordinate, date e URL di origine.

Fonti attualmente incluse:
- umbriaeventi.com
- staserasagra.it
- sagreumbre.it
- sagritaly.com

## Sviluppo locale

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Scraper

```bash
cd scraper
pip install -r requirements.txt
python run_spider.py
```

## Note

- Il backend si connette a PostgreSQL via `DATABASE_URL` definita in `backend/app/core/config.py`.
- Il frontend attualmente punta a `http://localhost:8000` per le chiamate API.

## Contatti

Questo repository è pensato come base per un portale italiano di sagre e festività regionali. Personalizzalo aggiungendo nuove categorie, fonti e funzionalità di ricerca avanzata.
