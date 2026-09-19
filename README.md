# 🍷 Umbria Festivals (Sagra Umbra) - Portale & Guida Digitale

Un'applicazione **full-stack di livello enterprise** per la digitalizzazione, geolocalizzazione, arricchimento tramite **IA (LLM & Vision)** e visualizzazione delle sagre, feste popolari e palii storici nei 92 comuni dell'Umbria.

---

## 📐 Architettura del Sistema

L'architettura di **Umbria Festivals** si basa su moduli disaccoppiati, scalabili e totalmente containerizzabili con Docker:

```
                   ┌─────────────────────────────────────────┐
                   │    AI Agent Scraper Engine              │
                   │  (Scrapy + Playwright + Gemini/Ollama)  │
                   └────────────────────┬────────────────────┘
                                        │ Estrazione & Ingestion IA
                                        ▼
┌─────────────────┐           ┌──────────────────┐           ┌────────────────────────┐
│  Frontend React │ <-------> │ Backend REST API │ <-------> │ PostgreSQL + PostGIS   │
│ (Vite + Leaflet)│  HTTP/JSON│ (FastAPI + ORM)  │ SQL/Spatial│  (Database Spaziale)   │
└─────────────────┘           └──────────────────┘           └────────────────────────┘
```

1. **Database Spaziale (`db`)**: PostgreSQL 15 con estensione **PostGIS 3.3** per la gestione di tipi geografici (`Geography(Point, 4326)`), indicizzazione geospaziale `GIST` e query di prossimità.
2. **Backend API (`backend`)**: Web API RESTful ad alte prestazioni realizzata in **FastAPI** (Python 3.9+), con **SQLAlchemy 2.0**, **GeoAlchemy2**, validazione Pydantic v2 e servizio integrato di arricchimento culturale via Wikipedia.
3. **Engine Scraper IA (`scraper`)**: Sistema di scraping intelligente basato su Scrapy, Playwright e moduli IA Vision/LLM (**Google Gemini API / Ollama**). In grado di estrarre dati strutturati da pagine web HTML, testi non strutturati, locandine/immagini (JPG/PNG) e brochure in formato PDF.
4. **Frontend Single Page Application (`frontend`)**: Interfaccia utente moderna in **React 18 + Vite**, con mappe interattive Leaflet, vista calendario mensile/settimanale, sistema di filtro avanzato, supporto Light/Dark mode e gestione recensioni.

---

## 🌟 Funzionalità Principali

### 🗺️ 1. Mappa Interattiva & Ricerca Geospaziale (`/map`)
- **Mappa Leaflet Personalizzata**: Mappa dinamica con basemap a tema chiaro e scuro.
- **Geocodifica Ufficiale**: Coordinate geografiche ad alta precisione ancorate ai centri storici dei borghi umbri.
- **Ricerca in Raggio (KM)**: Endpoint spaziale `/search/nearby` che consente di trovare le sagre entro un raggio specifico ($X$ km) a partire dalle coordinate dell'utente o da un borgo prescelto. Calcolo tramite PostGIS `ST_DWithin` o fallback Haversine.
- **Filtri Combinati**: Filtra contemporaneamente per provincia (PG/TR), categoria (Gastronomia, Vino, Storia, Musica), intervallo di date e stato (In corso, In arrivo, Conclusa).

### 📅 2. Calendario Eventi & Esportazione iCal (`/calendar`)
- **Visualizzazione Flessibile**: Vista per mese intero, settimana o giorno singolo con evidenziazione del giorno corrente.
- **Esportazione Calendario (.ics)**: Sincronizzazione in 1-Click con Google Calendar, Apple Calendar, Microsoft Outlook o download diretto del file `.ics`.

### 🍴 3. Schede Evento Dettagliate & Voto Forchette (`/festival/:id`)
- **Menù & Piatto Regina**: Scheda approfondita sulle specialità enogastronomiche e i piatti tipici serviti durante la festa.
- **Cenni Storico-Culturali**: Scheda informativa autogenerata ed integrata sulle origini del borgo ospitante.
- **Sistema Recensioni a "Forchette" (1-5)**: Gli utenti possono esprimere un voto da 1 a 5 forchette, rilasciare un commento e consultare la media voti con breakdown statistico delle recensioni.
- **Viewer Locandine & Manifesti**: Modale d'ingrandimento ad alta definizione per consultare il programma completo riportato sulle locandine ufficiali.

### 🌤️ 4. Integrazione Meteo in Tempo Reale
- Widget meteo integrato nelle schede dei festival che fornisce le previsioni per il comune e le date specifiche dell'evento.

### 🤖 5. Engine di Ingestion & Scraper basato su Agenti IA
- **Estrazione Multimediale (Vision & Document OCR)**: L'agente IA (`ai_agent.py`) analizza sia markup HTML sia immagini di locandine o file PDF scaricati dai siti delle Pro Loco, convertendoli in oggetti JSON validati (`FestivalItemSchema`).
- **Pipeline Deduplicativa Non-Distruttiva**: Pipeline Scrapy (`pipelines.py`) che confronta le nuove sagre estratte con il DB esistente (in base a comune, intervallo date e similarità del nome), aggiornando solo i campi mancanti e preservando le informazioni verificate.

### 📝 6. Portale Segnalazioni Pro Loco & Gestori (`/submit`)
- Form dedicato ai comitati organizzatori e Pro Loco umbre per segnalare nuove edizioni.
- **Generatore IA di Descrizioni**: Assistente integrato che genera automaticamente bozze di descrizioni avvincenti ed evocative sul programma ed i piatti della sagra.
- Upload file locandina e geocodifica automatica dell'indirizzo.

### 🛠️ 7. Pannello di Amministrazione e Moderazione (`/admin`)
- Controllo ed approvazione delle segnalazioni inviate dalle Pro Loco.
- Monitoraggio degli eventi presenti in archivio.
- Strumenti di riparazione e sanificazione dei dati in un solo click (ricalcolo coordinate, fix locandine, rigenerazione schede culturali).

---

## ⚙️ Meccanismi Interni e Flussi di Lavoro

### A. Flusso di Ingestion & Deduplicazione IA
```
[Sorgente: Sito Web / PDF / Immagine Locandina]
                     │
                     ▼
        [AI Agent Engine (Gemini / Ollama)]
                     │ (Estrazione in Schema Pydantic)
                     ▼
          [Validazione Coordinate & Borgo]
                     │
                     ▼
       [Pipeline Deduplicazione Non-Distruttiva]
                     ├──> Sagra Esistente? ──> Merge campi mancanti (Menu, Immagini)
                     └──> Nuova Sagra?     ──> Inserimento PostgreSQL/PostGIS
```

### B. Flusso Calcolo Distanza Geospaziale
La ricerca di sagre nelle vicinanze (`GET /api/v1/festivals/search/nearby?latitude=...&longitude=...&radius_km=20`) esegue il seguente algoritmo:
1. **Con PostGIS attivo**: Esegue una query nativa geospaziale `ST_DWithin(geom, ST_MakePoint(lng, lat)::geography, radius_meters)`.
2. **Fallback Haversine**: Qualora la query nativa non sia disponibile (es. SQLite in ambiente di dev ridotto), applica la formula trigonometrica dell'Haversine per calcolare la distanza ortodromica in km ed applica il filtro direttamente in memoria o SQL.

### C. Generazione delle Schede Storico-Culturali dei Borghi
L'endpoint `/generate-cultural-info-preview` interpella in background il modulo `wikipedia_service.py` che recupera i dettagli enciclopedici ufficiali sul borgo umbro, sintetizzando storia, monumenti e curiosità tramite l'agente LLM.

---

## 🛠️ Tech Stack Dettagliato

| Livello | Tecnologia | Utilizzo / Descrizione |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 18** + **Vite** | SPA reattiva ad altissime prestazioni con HMR |
| **Mappe Interattive** | **Leaflet** / **React-Leaflet** | Rendering mappa geospaziale con custom markers e popup |
| **Styling & Theme** | **Vanilla CSS Tokens** | Identità visiva nativa (Travertino, Cypress, Sagrantino) |
| **Backend API** | **FastAPI** (Python 3.9+) | Framewok REST asincrono, Swagger UI automatica |
| **ORM & Database** | **SQLAlchemy 2.0** + **GeoAlchemy2** | Mappatura oggetto-relazionale con supporto spaziale |
| **Database Engine** | **PostgreSQL 15** + **PostGIS 3.3** | DB Relazionale spaziale con indici `GIST` |
| **Scraper Engine** | **Scrapy 2.11** + **Playwright** | Crawling headless per pagine dinamiche JavaScript |
| **IA / LLM / OCR** | **Google Gemini API** / **Ollama** | Estrazione multimodale (testo, immagini, PDF) |
| **SEO & Meta** | **React Helmet Async** | Iniezione OpenGraph, JSON-LD schema.org `Event` |

---

## 🎨 Identità Visiva e Palette Cromatica

La palette cromatica del sito è ispirata ai paesaggi, alla pietra dei borghi e al vino dell'Umbria:

- 🏛️ **Travertino** (`#FAFAF8` / `#F0EFEB`): Sfondi chiari, leggeri ed eleganti che richiamano la pietra dei borghi umbri.
- 🌲 **Verde Cypress** (`#2A4B3C` / `#3D6B57`): Colore primario naturale per intestazioni, badge e pulsanti principali.
- 🍷 **Rosso Sagrantino** (`#7A2E39`): Colore di accento e call-to-action che evoca il famoso vino DOCG umbro e la convivialità delle sagre.
- 🪨 **Antracite** (`#1E2320` / `#5C6661`): Colore per il testo ad alto contrasto per garantire leggibilità ottimale.
- **Tipografia**: *Plus Jakarta Sans* (Google Fonts).

---

## 📡 Riferimento Completo API REST (`/api/v1/festivals`)

### 🎪 Gestione Festività & Sagre
- `GET /api/v1/festivals/`: Restituisce l'elenco delle sagre (filtri opzionali: `province`, `category`, `search`).
- `GET /api/v1/festivals/{id}`: Dettaglio completo di una singola sagra (inclusi recensioni, menù e cenni culturali).
- `POST /api/v1/festivals/`: Creazione nuova sagra con validazione geospaziale automatica delle coordinate.
- `PUT /api/v1/festivals/{id}`: Aggiornamento dati di una sagra esistente.
- `DELETE /api/v1/festivals/{id}`: Eliminazione di una sagra dall'archivio.
- `GET /api/v1/festivals/search/nearby`: Ricerca per raggio (`?latitude=...&longitude=...&radius_km=20`).
- `POST /api/v1/festivals/{id}/poster`: Caricamento e salvataggio locandina (`multipart/form-data`).

### 🍴 Recensioni & Voto Forchette
- `GET /api/v1/festivals/{id}/reviews`: Restituisce l'elenco delle recensioni e la media voti espresso in forchette.
- `POST /api/v1/festivals/{id}/reviews`: Invia una recensione con voto da 1 a 5 forchette ed un commento testuale.

### 📝 Segnalazioni Organizzatori & Pro Loco
- `POST /api/v1/festivals/submit-info`: Invia una nuova segnalazione di evento da parte degli organizzatori.
- `GET /api/v1/festivals/admin/submissions`: Consultazione segnalazioni da approvare (Riservato Admin).

### 🤖 Generatori IA & Servizi Arricchimento
- `POST /api/v1/festivals/generate-description-preview`: Genera una bozza di descrizione organica IA prima del salvataggio.
- `POST /api/v1/festivals/generate-cultural-info-preview`: Recupera cenni storici e culturali sul borgo selezionato.
- `POST /api/v1/festivals/{id}/generate-description`: Rigenera ed aggiorna la descrizione IA di una sagra specifica.
- `POST /api/v1/festivals/{id}/generate-cultural-info`: Rigenera ed aggiorna la scheda culturale di una sagra specifica.

---

## 🚀 Avvio Rapido & Guida all'Installazione

### 1. Avvio con Docker Compose (Metodo Consigliato)

È sufficiente eseguire il seguente comando dalla radice del progetto per avviare l'intero stack (PostGIS, Backend API, Frontend React, Scraper):

```bash
docker-compose up --build
```

**URL dei servizi attivi**:
- **Frontend SPA**: `http://localhost:3000` (o `http://localhost:5173`)
- **Backend API Docs (Swagger UI)**: `http://localhost:8000/docs`
- **Database PostGIS**: `localhost:5432` (Utente: `postgres`, Password: `postgres`, DB: `umbria_festivals`)

---

### 2. Sviluppo Locale Manuale (Senza Docker)

#### **A. Backend FastAPI**
```bash
cd backend

# 1. Creazione ed attivazione ambiente virtuale
python -m venv venv
# Windows: venv\Scripts\activate | Linux/macOS: source venv/bin/activate

# 2. Installazione dipendenze
pip install -r requirements.txt

# 3. Avvio server di sviluppo Uvicorn
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### **B. Frontend React + Vite**
```bash
cd frontend

# 1. Installazione pacchetti Node.js
npm install

# 2. Avvio server di sviluppo Vite
npm run dev
```

#### **C. Scraper Engine IA**
```bash
cd scraper

# 1. Installazione dipendenze scraper
pip install -r requirements.txt
playwright install

# 2. Esecuzione dello spider Scrapy
python run_spider.py
```

---

## 🧪 Esecuzione della Suite di Test

Il progetto include una suite completa di test unitari, spaziali e di integrazione:

```bash
# 1. Test Geospaziali & Correttezza Coordinate
python backend/tests/test_geo.py

# 2. Test Integration Backend API & Endpoints REST
python backend/tests/test_backend_api.py

# 3. Test Scraper Pipeline & Model Validation
python scraper/tests/test_scraper.py

# 4. Validazione della Build Frontend Vite
cd frontend && npm run build
```

---

## 🛠️ Script di Manutenzione Dati

Nella cartella `backend/` sono disponibili diversi script utili per la pulizia, l'arricchimento e il riallineamento dell'archivio:

- `deduplicate_festivals.py`: Individua ed unifica edizioni o sagre duplicate.
- `fix_all_coordinates.py`: Riallinea ed autocorregge le coordinate geografiche di tutte le sagre facendole coincidere con il centro del comune.
- `fix_authentic_covers.py`: Assegna ad ogni sagra locandine autentiche e immagini panoramiche ad alta risoluzione del borgo.
- `fix_dishes_and_categories.py`: Normalizza i piatti del menù ed assegna le categorie appropriate.
- `purge_canned_data.py`: Rimuove eventuali dati di test o segnaposto incoerenti.
- `seed_agent_festivals.py`: Popola il database con una ricca selezione di sagre e feste tradizionali autentiche dell'Umbria.

---

## 📄 Licenza

Questo progetto è rilasciato per usi di promozione territoriale, valorizzazione del patrimonio enogastronomico e sviluppo turistico dei borghi dell'Umbria.
