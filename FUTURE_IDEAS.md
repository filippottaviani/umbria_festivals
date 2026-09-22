# 🔮 Idee Future & Roadmap Evolutiva — Umbria Festivals (Sagra Umbra)

Questo documento raccoglie le proposte architetturali, di prodotto e di business emerse durante lo sviluppo del progetto, archiviate per essere implementate nelle successive iterazioni.

---

## 1. 🔐 Gestione Utenti & Portale Pro Loco
- **Autenticazione Sicura senza Password Statica**:
  - Eliminazione della chiave admin hardcoded nel frontend (`sagra_umbra_admin_secret_key_2026`).
  - Implementazione di autenticazione standard basata su **JWT (JSON Web Tokens)** con cookie `HttpOnly` e crittografia password con `bcrypt`.
- **Ruoli Differenziati (RBAC)**:
  - **Super Admin**: Accesso completo al database, approvazione segnalazioni, pulizia e script di deduplicazione/allineamento.
  - **Referente Pro Loco Verificato**: Ogni comitato festeggiamenti può richiedere l'accesso per gestire in autonomia la propria sagra, aggiornare il menù in tempo reale e pubblicare avvisi meteo o chiusure straordinarie.
- **Account Visitatori Opzionale**:
  - Possibilità per gli utenti di effettuare il login (anche via Google / Apple Sign-In) per sincronizzare i preferiti tra più dispositivi (smartphone, tablet, desktop) e ricevere notifiche personalizzate.

---

## 2. 📲 Scraping Avanzato & Ingestion da Social Network (Facebook & Instagram)
- **Il Contesto**: Oltre l'80% delle Pro Loco umbre non possiede un portale web aggiornato e diffonde locandine, programmi musicali e variazioni di date esclusivamente tramite post, grafiche e storie su Facebook e Instagram.
- **Implementazione Futura**:
  - Connettore per il monitoraggio periodico dei feed pubblici delle pagine Facebook delle Pro Loco e dei comitati umbri.
  - Pipeline di estrazione visiva tramite **Gemini 2.0 Flash Vision**: scaricamento automatico delle immagini delle locandine pubblicate sui social e OCR automatico di date, orari, menù e piatti tipici.
  - Sistema di **Confidence Score**: assegnazione di una percentuale di affidabilità (es. 95%) all'estrazione automatica, contrassegnando con alert le sagre che necessitano di revisione manuale prima della pubblicazione.

---

## 3. 🔎 Ricerca Full-Text Intelligente con PostgreSQL (`pg_trgm`)
- **Tolleranza agli Errori di Battitura**:
  - Abilitazione dell'estensione PostgreSQL `pg_trgm` con indici `GIN`.
  - Ricerca flessibile con distanza di Levenshtein / trigrammi: digitando *"tartuffo"* il motore trova *"tartufo"*, cercando *"strangozzi"* o *"umbricelli"* restituisce correttamente i risultati pertinenti.
- **Ricerca negli Ingredienti e Menù Gastronomici**:
  - Indicizzazione full-text dei campi `menu_info` e `dish_info`.
  - Possibilità di cercare per piatto specifico (es. *"cinghiale"*, *"gnocchi al sugo d'oca"*, *"arrosticini"*, *"torta al testo"*, *"baccalà"*) trovando anche le sagre che lo includono nel menù secondario.

---

## 4. 🚗 Itinerari del Weekend & Route Planner delle Sagre
- **Tour Enogastronomico nei Borghi**:
  - Molti borghi medievali umbri distano tra loro solo 10-25 minuti d'auto.
  - Funzione che permette di selezionare 2 o più sagre nello stesso fine settimana (es. pranzo a Colfiorito e cena a Foligno/Bevagna) e genera automaticamente l'itinerario ottimizzato.
  - Esportazione del percorso su Google Maps, Apple Maps o file GPX per cicloturisti e motociclisti.

---

## 5. 🌍 Internazionalizzazione & Turismo Estero (Umbria Experience)
- **Modalità Bilingue (Italiano / Inglese)**:
  - L'Umbria attrae flussi importanti di turisti stranieri (Assisi, Orvieto, Spoleto, Gubbio, Lago Trasimeno, Valnerina).
  - Traduzione automatica o localizzata delle schede evento.
  - Guida culturale illustrata: *"How an Umbrian Sagra Works"* (spiegazione del funzionamento della cassa, della fila per il ritiro dei vassoi e della convivialità delle tavolate paesane).
- **Integrazione "Cosa Fare prima di Cena"**:
  - Collegamento automatico tra la sagra e i principali monumenti o sentieri naturalistici del borgo ospitante (es. passeggiata panoramica a Trevi o visita ai vicoli fioriti di Spello prima dell'apertura degli stand).

---

## 6. 🔔 Notifiche Push & Allerte Meteo
- **Reminder Pre-Sagra**: Notifica push locale o Web Push 24/48 ore prima dell'inizio delle sagre salvate nei preferiti.
- **Avviso Stand al Coperto in Caso di Maltempo**: In caso di pioggia prevista nel comune dell'evento, notifica rassicurante agli utenti che gli stand gastronomici dispongono di tensostruttura al chiuso.

---

## 7. 🏛️ Database Migrations & Scalabilità Server-Side
- **Alembic**: Introduzione formale di migrazioni di schema versionate per SQLAlchemy, sostituendo i comandi `ALTER TABLE ADD COLUMN IF NOT EXISTS` eseguiti allo startup.
- **Paginazione Server-Side**: Aggiunta di parametri `limit` e `offset` o cursore per la consultazione dell'archivio storico quando supererà le migliaia di edizioni archiviate.
