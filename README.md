# 🍷 Umbria Festivals - Portale Sagre & Feste Popolari dell'Umbria

Un'applicazione full-stack moderna per la raccolta, geolocalizzazione, arricchimento AI e visualizzazione delle sagre e feste popolari nei borghi dell'Umbria.

---

## 📐 Architettura del Sistema

Il progetto è composto da tre moduli principali totalmente disaccoppiati e containerizzabili:

```
                  ┌──────────────────────────────┐
                  │    Scraper (Scrapy/Playwright)│
                  └──────────────┬───────────────┘
                                 │ Esegue scraping & enrichment
                                 ▼
┌─────────────────┐       ┌──────────────────────┐       ┌────────────────────────┐
│  Frontend React │ <---> │ Backend API (FastAPI)│ <---> │ PostgreSQL + PostGIS  │
│ (Vite + Leaflet)│       │ (SQLAlchemy + AI Gen)│       │      (Database)        │
└─────────────────┘       └──────────────────────┘       └────────────────────────┘
```

1. **`db`**: PostgreSQL (15) con estensione geospaziale PostGIS.
2. **`backend`**: API REST FastAPI in Python con SQLAlchemy, validazione geospaziale automatica, sistema di recensioni e generatore organico di descrizioni basato su AI.
3. **`scraper`**: Spider Scrapy + Playwright per l'estrazione automatica di sagre da portali regionali affidabili, con pipeline di deduplicazione e arricchimento non distruttivo.
4. **`frontend`**: Single Page Application React + Vite con mappa interattiva Leaflet, vista calendario, filtri per provincia/categoria e form per la segnalazione di sagre da parte delle Pro Loco.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.9+, FastAPI, SQLAlchemy 2.0, GeoAlchemy2, Pydantic v2, Uvicorn, `python-multipart`.
- **Scraper**: Scrapy 2.11, Scrapy-Playwright, BeautifulSoup4, ItemAdapter.
- **Frontend**: React 18, Vite, Leaflet / React-Leaflet, Axios, React Router v6.
- **Database**: PostgreSQL 15 + PostGIS 3.3.
- **Testing**: Python `unittest`, FastAPI `TestClient`, Vite Build Validation.

---

## 🌟 Funzionalità Principali

- 🗺️ **Mappa Interattiva & Geocodifica Ufficiale**: Posizionamento preciso di ciascuna sagra sul borgo umbro di appartenenza con validazione e autocorrezione delle coordinate.
- 🔍 **Ricerca Geospaziale (Raggio in KM)**: Endpoint `/search/nearby` per cercare sagre vicine a una latitudine/longitudine (con fallback automatico Haversine in assenza di PostGIS).
- 🍴 **Sistema Recensioni & Voto Forchette**: Recensioni per ogni festa con voto da 1 a 5 forchette, calcolo media voti e breakdown statistico.
- 📝 **Portale Segnalazioni Pro Loco / Gestori**: Form dedicato agli organizzatori per pubblicare programmi, menù, contatti e locandine.
- 🤖 **Generatore AI di Descrizioni Organiche**: Generazione di testi avvincenti ed evocativi per descrivere l'atmosfera ed i piatti di ciascuna sagra.
- 🖼️ **Gestione Locandine & Panorami dei Borghi**: Upload delle locandine e supporto per panorami aerei autentici dei comuni umbri.

---

## 🚀 Avvio Rapido

### 1. Avvio tramite Docker Compose (Consigliato)

Per avviare l'intero stack (Database, Backend, Frontend, Scraper) in container:

```bash
docker-compose up --build
```

Servizi attivi:
- **Frontend**: `http://localhost:3000` (o `http://localhost:5173`)
- **Backend API Docs (Swagger)**: `http://localhost:8000/docs`
- **Database PostGIS**: `localhost:5432`

---

### 2. Sviluppo Locale (Senza Docker)

#### **A. Backend API**
```bash
cd backend

# Installazione dipendenze
pip install -r requirements.txt

# Avvio del server di sviluppo
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### **B. Frontend React**
```bash
cd frontend

# Installazione dipendenze
npm install

# Avvio del server di sviluppo Vite
npm run dev
```

#### **C. Scraper**
```bash
cd scraper

# Esecuzione dello spider
python run_spider.py
```

---

## 🧪 Esecuzione della Suite di Test

Il progetto include una suite completa di test strutturali e di integrazione per verificare il corretto funzionamento di tutti i componenti:

```bash
# 1. Test Modulo Geospaziale & Coordinate
python backend/tests/test_geo.py

# 2. Test Integration Backend API & Endpoint
python backend/tests/test_backend_api.py

# 3. Test Scraper Item & Pipeline Validation
scraper/venv/Scripts/python.exe scraper/tests/test_scraper.py

# 4. Validazione Build Frontend Vite
cd frontend && npm run build
```

---

## 📡 Riferimento API REST (`/api/v1/festivals`)

| Metodo | Endpoint | Descrizione |
| :--- | :--- | :--- |
| `GET` | `/api/v1/festivals/` | Restituisce l'elenco delle sagre (filtro opzionale `?province=PG`) |
| `GET` | `/api/v1/festivals/{id}` | Restituisce il dettaglio di una sagra specifica con voti e recensioni |
| `POST` | `/api/v1/festivals/` | Crea una nuova sagra con validazione/autocorrezione coordinate |
| `PUT` | `/api/v1/festivals/{id}` | Aggiorna i dati di una sagra esistente |
| `DELETE` | `/api/v1/festivals/{id}` | Elimina una sagra dal database |
| `GET` | `/api/v1/festivals/search/nearby` | Ricerca geospaziale per raggio (`?latitude=...&longitude=...&radius_km=20`) |
| `POST` | `/api/v1/festivals/{id}/poster` | Caricamento locandina/immagine manifesti (multipart/form-data) |
| `GET` | `/api/v1/festivals/{id}/reviews` | Restituisce il riepilogo recensioni e media voti |
| `POST` | `/api/v1/festivals/{id}/reviews` | Aggiunge una recensione con voto da 1 a 5 forchette |
| `POST` | `/api/v1/festivals/submit-info` | Registra una segnalazione da parte di organizzatori / Pro Loco |
| `GET` | `/api/v1/festivals/admin/submissions` | Elenco segnalazioni inviate dagli organizzatori |
| `POST` | `/api/v1/festivals/generate-description-preview` | Genera una bozza di descrizione AI per un evento |

---

## 🛠️ Script di Manutenzione & Fix Dati

Nella cartella `backend/` sono disponibili script utili per il riallineamento e la cura dei dati:

- `fix_coordinates.py`: Riallinea le coordinate di tutte le sagre sul borgo ufficiale.
- `fix_authentic_covers.py`: Ripristina le locandine originali ed assegna panorami dei comuni.
- `seed_agent_festivals.py`: Popola il database con eventi e dati enogastronomici autentici.

---

## 📄 Licenza

Questo progetto è rilasciato per usi di promozione territoriale e sviluppo enogastronomico dell'Umbria.
