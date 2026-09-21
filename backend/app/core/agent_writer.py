"""
Agente Generatore di Contenuti AI per SagraUmbra.
Genera descrizioni autentiche per eventi e sezioni di storia e cultura dei borghi umbri,
eliminando qualsiasi formula pomposa, retorica o cliché artificiale.
"""

import os
import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)

TOWN_CULTURAL_KNOWLEDGE = {
    "paciano": "Paciano è un borgo medievale inserito tra i 'Borghi più belli d'Italia', situato sulle colline occidentali dell'Umbria che guardano il Lago Trasimeno. Il centro storico è racchiuso da una cinta muraria del XIV secolo ben conservata, caratterizzata da tre torri difensive rompitratta e vicoli lastricati in pietra.",
    "casa del diavolo": "Situato lungo la valle del Tevere a nord di Perugia, Casa del Diavolo è un centro agricolo dell'Umbria il cui nome singolare è legato a storiche stazioni di posta d'epoca romana e a leggende popolari del territorio perugino.",
    "pila": "Pila è una frazione collinare di Perugia immersa tra oliveti e vigneti dell'Umbria centrale. Ha una storica vocazione agricola fondata sulla coltivazione della vite e dell'olivo e sulle tradizioni contadine locali.",
    "pozzo": "Frazione collinare del comune di Gualdo Cattaneo nella provincia di Perugia, Pozzo sorge su un colle costellato di uliveti. L'antico insediamento conserva resti di fortificazioni medievali e torri d'avvistamento.",
    "spoleto": "Importante città d'arte dell'Umbria meridionale, Spoleto vanta un patrimonio storico e monumentale millenario: dal Teatro Romano del I secolo alla Rocca Albornoziana che sovrasta la città, fino al celebre Ponte delle Torri e al Duomo romanico.",
    "gubbio": "Antica città umbra alle falde del Monte Ingino, Gubbio conserva un assetto urbano medievale caratterizzato da imponenti edifici in pietra, tra cui il Palazzo dei Consoli del XIV secolo e la cattedrale, celebre per la tradizionale Corsa dei Ceri.",
    "narni": "Situata su uno sperone roccioso a ridosso delle gole del fiume Nera in provincia di Terni, Narni vanta origini preromane e medievali, testimoniate dalla Narni Sotterranea, dal Ponte di Augusto di epoca augustea e dalla Rocca Albornoz.",
    "bettona": "Antico insediamento etrusco e borgo fortificato della Valle Umbra, Bettona è noto come il 'Balcone del Subasio' per l'ampia vista sulla piana di Assisi. È racchiuso da mura medievali che poggiano in parte su basamenti etruschi.",
    "cannaiola": "Borgo agricolo situato nella pianura tra Trevi e Montefalco, in provincia di Perugia, Cannaiola è storicamente legato alle colture tradizionali della Valle Spoletina e alla vicinanza alle Fonti del Clitunno.",
    "gaglietole": "Frazione collinare del comune di Collazzone, Gaglietole è un borgo fortificato dell'Umbria centrale che conserva tracce della cinta muraria medievale e delle porte di accesso.",
    "castelnuovo": "Frazione situata nella pianura del comune di Assisi, Castelnuovo ha origini rurali legate alle bonifiche medievali della valle assisana e alla devozione francescana che caratterizza il territorio circostante.",
    "san brizio": "Frazione del comune di Spoleto situata nella pianura spoletina, San Brizio è un centro rurale dell'Umbria noto per le coltivazioni agricole e per l'antica pieve.",
    "castiglion fosco": "Borgo medievale della Valnestore, nella provincia di Perugia, Castiglion Fosco si distingue per la singolare torre circolare in mattoni del XVI secolo che domina l'abitato circostante.",
    "castiglione del lago": "Situato su un promontorio calcareo affacciato sulla riva occidentale del Lago Trasimeno, Castiglione del Lago è dominato dalla Rocca del Leone del XIII secolo e dal rinascimentale Palazzo della Corgna.",
    "assisi": "Città simbolo dell'Umbria e patrimonio UNESCO, Assisi si adagia sulle pendici del Monte Subasio. È celebre in tutto il mondo per la Basilica papale di San Francesco, la Basilica di Santa Chiara, la Rocca Maggiore e i monumenti di epoca romana.",
    "foligno": "Principale centro della Valle Umbra, Foligno è una città di pianura attraversata dal fiume Topino. Storico polo mercantile e tipografico, vi fu stampata nel 1472 la prima edizione della Divina Commedia.",
    "montefranco": "Comune collinare della Valnerina ternana arroccato a circa 400 metri di altitudine, Montefranco nacque come castello difensivo a guardia della valle del fiume Nera.",
    "stroncone": "Borgo medievale dell'Umbria meridionale arroccato sui contrafforti dei Monti Sabini in provincia di Terni, Stroncone conserva l'impianto viario fortificato con porte d'accesso in pietra e conventi francescani.",
    "monteleone d'orvieto": "Borgo situato su una dorsale collinare tra la Valdichiana e la Valnestore, al confine nord-occidentale dell'Umbria. È caratterizzato dalla Torre Civica in laterizio e da una struttura a spina di pesce tipica dei borghi franchi medievali.",
    "case nuove": "Frazione collinare del comune di Foligno situata lungo l'Appennino umbro, immersa in boschi di castagni e querce a monte della valle del Topino.",
    "baiano": "Frazione rurale del comune di Spoleto nella piana spoletina, sviluppatasi storicamente intorno a pievi medievali e tenute agricole del territorio circostante.",
    "papiano": "Frazione collinare del comune di Marsciano lungo la media valle del Tevere, dominata dai resti del castello medievale e dalla torre duecentesca.",
    "baschi": "Comune dell'Umbria ternana che sorge sopra una rupe affacciata sulla valle del Tevere. Il nucleo antico presenta una fitta trama di vicoli e volte in pietra denominati 'I Buci'.",
    "fossato di vico": "Comune della fascia appenninica umbra alle pendici del Monte Cucco. Antico castello fortificato lungo la via Flaminia, è noto per 'Le Rughe', camminamenti coperti di epoca medievale.",
    "marsciano": "Centro della media valle del Tevere in provincia di Perugia, rinomato storicamente per la lavorazione del laterizio e per la rete di borghi e castelli che costellano la sua campagna.",
    "perugia": "Capoluogo dell'Umbria, Perugia è un'antica città di origine etrusca e medievale. Custodisce monumenti come la Fontana Maggiore, il Palazzo dei Priori, l'Arco Etrusco e i sotterranei della Rocca Paolina.",
    "ammeto": "Frazione adiacente alla cittadina di Marsciano, situata nei pressi della confluenza del fiume Nestore, di antica vocazione agricola e manifatturiera.",
    "castel rigone": "Borgo collinare a 650 metri di quota che sovrasta il Lago Trasimeno. Ospita il Santuario di Maria Santissima dei Miracoli, rilevante esempio di architettura rinascimentale umbra edificato a fine Quattrocento.",
    "norcia": "Città situata nella piana di Santa Scolastica ai piedi dei Monti Sibillini, in Valnerina. Patria di San Benedetto da Norcia, vanta un'importante tradizione storica nella norcineria e nella lavorazione del tartufo nero.",
    "colfiorito": "Borgo montano sull'altopiano appenninico a oltre 750 metri di altitudine, al confine tra Umbria e Marche. Noto per il Parco Naturale delle Paludi, la coltivazione della patata rossa e i ritrovamenti dell'antica civiltà dei Plestini.",
    "guardea": "Borgo collinare della Teverina ternana che si affaccia sulla valle del Tevere e sull'Oasi di Alviano, con origini medievali legate alla rocca e alle torri di guardia.",
    "montefalco": "Città collinare denominata la 'Ringhiera dell'Umbria' per la visuale a trecentosessanta gradi sulla Valle Spoletina. È celebre per la produzione del vino Sagrantino e per il Complesso Museale di San Francesco affrescato da Benozzo Gozzoli.",
    "bevagna": "Borgo della Valle Umbra annoverato tra i 'Borghi più Belli d'Italia', l'antica Mevania romana conserva i resti del teatro e delle terme, oltre alla scenografica Piazza Silvestri con le chiese romaniche di San Michele e San Silvestro.",
    "cannara": "Comune della pianura umbra attraversato dal Topino, legato alla tradizione agricola della coltivazione della cipolla e a memorie francescane come la predica agli uccelli a Piandarca.",
    "costano": "Storica frazione del comune di Bastia Umbra adagiata lungo il corso del fiume Chiascio, nota per la tradizione artigianale della lavorazione della porchetta umbra.",
    "sigillo": "Borgo medievale lungo l'antica Via Flaminia ai piedi del Parco Regionale del Monte Cucco. Conserva il ponte romano di Spiano, mura trecentesche e tradizioni montane.",
    "pietralunga": "Borgo fortificato dell'Alta Valle del Tevere circondato da boschi montani, dominato dai resti della Rocca longobarda e rinomato per le produzioni boschive e la patata bianca.",
    "umbertide": "Città dell'Alta Valle del Tevere raccolta intorno alla maestosa Rocca trecentesca, oggi sede museale ed espositiva, con chiese rinascimentali che custodiscono opere d'arte sacra.",
    "todi": "Città d'arte adagiata su una collina che domina la media valle del Tevere. Il centro storico gravita intorno a Piazza del Popolo, con il Duomo, i palazzi comunali del Duecento e il Tempio rinascimentale della Consolazione.",
    "orvieto": "Città dell'Umbria sud-occidentale eretta su una caratteristica rupe di tufo. Custodisce capolavori architettonici come il Duomo gotico con la cappella di San Brizio, il Pozzo di San Patrizio e la fitta rete di cunicoli sotterranei.",
    "amelia": "Città dell'Umbria meridionale nota per le imponenti mura poligonali ciclopiche di epoca preromana, palazzi rinascimentali, cisterne romane e la statua in bronzo del generale Germanico.",
    "acquasparta": "Borgo situato sul tracciato della Via Flaminia in provincia di Terni, famoso per il Palazzo Cesi cinquecentesco, dove fu istituita l'Accademia dei Lincei con la presenza di Galileo Galilei.",
    "san gemini": "Borgo medievale dell'Umbria meridionale dalle caratteristiche architetture in pietra, sorge a poca distanza dalle rovine romane dell'antica città di Carsulae ed è storicamente rinomato per le fonti minerali.",
    "ferentillo": "Borgo della Valnerina ternana diviso in due nuclei contrapposti (Matterella e Precetto) sorvegliati da rocche medievali. Nella cripta della chiesa di Santo Stefano ospita il Museo delle Mummie.",
    "arrone": "Borgo della Valnerina inserito tra i 'Borghi più belli d'Italia', dominato dalla trecentesca torre degli ulivi del castello e circondato dalle pendici montuose prossime alla Cascata delle Marmore.",
    "alviano": "Borgo collinare della Teverina dominato dal rinascimentale Castello Doria Pamphili, situato a monte dell'Oasi naturalistica del Lago di Alviano gestita dal WWF.",
    "bastia umbra": "Bastia Umbra è un importante centro della Valle Umbra situato lungo il corso del fiume Chiascio, tra Perugia ed Assisi. Ha una ricca storia industriale ed agricola, nota per il centro fieristico Umbriafiere e per il centro storico sviluppatosi attorno alla Chiesa di Santa Croce e a Piazza Mazzini.",
    "massa martana": "Borgo fortificato dell'Umbria ai piedi dei Monti Martani, cinto da mura medievali con torri difensive lungo l'antico tracciato della via Flaminia."
}


def build_event_description_prompt(
    name: str,
    city: str,
    province: str = "PG",
    dish_info: Optional[str] = None,
    cultural_info: Optional[str] = None,
    menu_info: Optional[str] = None,
    program_info: Optional[str] = None
) -> str:
    """
    Costruisce il prompt AI per la descrizione di una sagra o evento gastronomico umbro.
    Impedisce esplicitamente qualsiasi formula pomposa, cliché o retorica artificiale.
    """
    prov_label = "Perugia" if province.upper() == "PG" else "Terni" if province.upper() == "TR" else province
    context_lines = [
        f"- Nome evento: {name}",
        f"- Borgo / Città ospitante: {city} ({prov_label}), Umbria",
    ]
    if dish_info and len(dish_info.strip()) > 10:
        context_lines.append(f"- Specialità gastronomica principale: {dish_info.strip()}")
    if menu_info and len(menu_info.strip()) > 10:
        context_lines.append(f"- Proposte gastronomiche o menù: {menu_info.strip()[:350]}")
    if program_info and len(program_info.strip()) > 10:
        context_lines.append(f"- Dettagli del programma o attività: {program_info.strip()[:350]}")

    context_str = "\n".join(context_lines)

    return (
        f"Sei un redattore esperto del patrimonio enogastronomico dell'Umbria.\n"
        f"Redigi una descrizione informativa, vivace e autentica per questo evento gastronomico "
        f"(2 paragrafi chiari e leggibili, complessivamente circa 100-140 parole).\n\n"
        f"DATI DELL'EVENTO:\n{context_str}\n\n"
        f"REQUISITI OBBLIGATORI E DIVIETI:\n"
        f"1. DIVIETO ASSOLUTO DI FORMULE POMPOSE O RETORICHE: Non utilizzare in nessun caso formule fatte, "
        f"cliché o frasi preconfezionate come:\n"
        f"   - 'appuntamento simbolo del calendario estivo'\n"
        f"   - 'manifestazione ricca di fascino e tradizione'\n"
        f"   - 'unisce generazioni di paesani'\n"
        f"   - 'nel cuore verde dell'Umbria'\n"
        f"   - 'il tempo sembra essersi fermato'\n"
        f"   - 'un viaggio tra sapori d'altri tempi e autentica convivialità'\n"
        f"   - 'l'entusiasmo contagioso dei volontari'\n"
        f"2. FOCALIZZAZIONE SUGLI ASPETTI REALI: Spiega concretamente cosa aspetta il visitatore: i piatti tipici "
        f"preparati sul momento, gli stand della sagra, la comunità che accoglie e gli eventi di intrattenimento "
        f"o musica previsti dal programma.\n"
        f"3. FORMATTAZIONE: Esattamente due paragrafi scorrevoli. Niente elenchi puntati, niente titoli promozionali, "
        f"niente frasi esclamative artificiose."
    )


def build_cultural_prompt(city: str, province: str = "PG", name: Optional[str] = None) -> str:
    """
    Costruisce il prompt AI per la sezione 'Storia e Cultura del Borgo',
    assicurando l'indicazione esplicita del contesto umbro ed eliminando ogni retorica pomposa.
    """
    prov_label = "Perugia" if province.upper() == "PG" else "Terni" if province.upper() == "TR" else province
    festival_context = f"- Evento o sagra ospitata: {name}\n" if name else ""

    return (
        f"Sei una guida culturale e storico specializzato sul territorio dell'Umbria.\n"
        f"Redigi un testo chiaro, storicamente accurato e divulgativo (1 o 2 paragrafi, circa 90-130 parole) "
        f"per la sezione 'Storia e Cultura del Borgo' dell'applicazione SagraUmbra.\n\n"
        f"DATI DEL LUOGO:\n"
        f"- Borgo / Città: {city}\n"
        f"- Provincia: {prov_label} ({province})\n"
        f"- Regione: Umbria\n"
        f"{festival_context}\n"
        f"REQUISITI OBBLIGATORI E DIVIETI:\n"
        f"1. INDICAZIONE ESPLICITA DI BORGO UMBRO: Specifica con precisione fin dalle prime parole che si tratta "
        f"di un borgo o centro urbano situato in Umbria, nella provincia di {prov_label}.\n"
        f"2. DIVIETO ASSOLUTO DI FORMULE POMPOSE O CLICHÉ: Non impiegare espressioni vuote o enfatiche come "
        f"'scrigno di bellezza', 'in cui il tempo sembra scorrere a una velocità diversa', "
        f"'dove il tempo sembra essersi fermato', 'dove l'antico incontra il moderno', 'atmosfera d'altri tempi', "
        f"'fascino intatto', 'perla incastonata tra le colline'.\n"
        f"3. INFORMAZIONI STORICHE E ARCHITETTONICHE CONCRETE: Evidenzia le origini reali del borgo (romane, "
        f"etrusche, medievali o rurali), la posizione geografica nel territorio umbro e gli elementi architettonici "
        f"o monumentali significativi (come mura, torri, rocche o chiese principali).\n"
        f"4. FORMATTAZIONE: Testo continuo in 1 o 2 paragrafi leggibili. Nessun elenco puntato o convenevole artificiale."
    )


def _try_llm_generation(prompt: str, system_prompt: Optional[str] = None) -> Optional[str]:
    """Tentativo di generazione tramite API LLM esterne (OpenAI o Gemini) se configurate nelle variabili d'ambiente."""
    # 1. Verifica OpenAI API Key
    openai_key = os.environ.get("OPENAI_API_KEY")
    if openai_key:
        try:
            import httpx
            sys_msg = system_prompt or "Sei un autorevole redattore culturale ed enogastronomico specializzato sull'Umbria. Scrivi in modo concreto, asciutto, privo di cliché pomposi."
            headers = {
                "Authorization": f"Bearer {openai_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": sys_msg},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.6,
                "max_tokens": 600
            }
            with httpx.Client(timeout=15.0) as client:
                res = client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"]
                    if content and len(content.strip()) > 60:
                        return content.strip()
        except Exception as e:
            logger.warning(f"Errore generazione LLM OpenAI: {e}")

    # 2. Verifica Gemini API Key
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if gemini_key:
        try:
            import httpx
            sys_msg = system_prompt or "Sei un autorevole redattore culturale ed enogastronomico specializzato sull'Umbria. Scrivi in modo concreto, asciutto, privo di cliché pomposi."
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
            payload = {
                "system_instruction": {
                    "parts": [{"text": sys_msg}]
                },
                "contents": [{
                    "parts": [{"text": prompt}]
                }]
            }
            with httpx.Client(timeout=15.0) as client:
                res = client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            text = parts[0].get("text", "")
                            if text and len(text.strip()) > 60:
                                return text.strip()
        except Exception as e:
            logger.warning(f"Errore generazione LLM Gemini: {e}")

    return None


def _clean_factual_event_description(
    name: str,
    city: str,
    province: str = "PG",
    dish_info: Optional[str] = None,
    menu_info: Optional[str] = None,
    program_info: Optional[str] = None
) -> str:
    """
    Costruisce una sintesi fattuale, sobria ed essenziale dell'evento quando non sono attive API LLM.
    Non fa uso di alcun template retorico o frase pomposa.
    """
    prov_label = "Perugia" if province.upper() == "PG" else "Terni" if province.upper() == "TR" else province

    # Paragrafo 1: Presentazione evento e cucina tipica
    p1 = f"{name} è una manifestazione tradizionale che si tiene a {city} ({prov_label}), in Umbria."
    if dish_info and len(dish_info.strip()) > 10:
        dish_clean = dish_info.strip()
        if not dish_clean.endswith('.'):
            dish_clean += '.'
        p1 += f" L'offerta gastronomica della festa valorizza la tradizione locale con la preparazione di {dish_clean}"
    elif menu_info and len(menu_info.strip()) > 10:
        p1 += " Durante la manifestazione gli stand culinari propongono piatti tipici della gastronomia locale e ricette tradizionali."
    else:
        p1 += " Durante le serate della festa sono allestiti stand gastronomici con specialità della cucina del territorio."

    # Paragrafo 2: Attività del programma o intrattenimento
    if program_info and len(program_info.strip()) > 20:
        prog_clean = program_info.strip()
        if not prog_clean.endswith('.'):
            prog_clean += '.'
        p2 = f"Il programma dell'evento propone diversi appuntamenti per i partecipanti: {prog_clean}"
    else:
        p2 = "La manifestazione propone momenti di intrattenimento musicale, spettacoli serali e spazi di ritrovo all'aperto."

    return f"{p1}\n\n{p2}"


def generate_organic_festival_description(
    name: str,
    city: str,
    province: str = "PG",
    dish_info: Optional[str] = None,
    cultural_info: Optional[str] = None,
    menu_info: Optional[str] = None,
    program_info: Optional[str] = None
) -> str:
    """
    Genera la descrizione per una sagra o evento umbro.
    1. Tenta la generazione con AI (LLM) tramite prompt rigoroso e privo di retorica.
    2. In assenza di API AI esterne, genera una sintesi pulita e fattuale senza template preconfezionati.
    """
    city_clean = (city or "Umbria").strip()
    province_clean = (province or "PG").strip().upper()

    # 1. Costruzione prompt dettagliato anti-fluff
    prompt = build_event_description_prompt(
        name=name,
        city=city_clean,
        province=province_clean,
        dish_info=dish_info,
        cultural_info=cultural_info,
        menu_info=menu_info,
        program_info=program_info
    )

    # 2. Generazione LLM (OpenAI / Gemini)
    ai_text = _try_llm_generation(
        prompt,
        system_prompt="Sei un autorevole redattore di eventi enogastronomici dell'Umbria. Scrivi in modo chiaro, asciutto e privo di formule pompose o retorica."
    )
    if ai_text and len(ai_text.strip()) > 60:
        return ai_text.strip()

    # 3. Fallback sintetico fattuale pulito (zero formule pompose)
    res = _clean_factual_event_description(
        name=name,
        city=city_clean,
        province=province_clean,
        dish_info=dish_info,
        menu_info=menu_info,
        program_info=program_info
    )
    return re.sub(r"^[\s,–—]+", "", res).strip()


def _format_curated_cultural_text(city: str, prov_label: str, base_desc: str) -> str:
    """Restituisce la voce storica curata, garantendo la citazione dell'Umbria senza frasi retoriche."""
    desc = base_desc.strip()
    if "umbria" not in desc.lower():
        desc = f"{city} è un borgo della provincia di {prov_label}, in Umbria. {desc}"
    return desc


def _try_wikipedia_summary(city: str, prov_label: str) -> Optional[str]:
    """Cerca e sintetizza informazioni storiche autentiche via Wikipedia in lingua italiana senza aggiunte retoriche."""
    try:
        import wikipedia
        wikipedia.set_lang("it")
        summary = None
        for query in [f"{city} Umbria", f"{city} (Italia)", city]:
            try:
                text = wikipedia.summary(query, sentences=3)
                if "umbria" in text.lower() or "perugia" in text.lower() or "terni" in text.lower():
                    summary = text
                    break
            except Exception:
                continue

        if summary:
            clean_summary = summary.strip()
            if "umbria" not in clean_summary.lower():
                clean_summary = f"{city} è un comune della provincia di {prov_label}, in Umbria. {clean_summary}"
            return clean_summary
    except Exception as e:
        logger.debug(f"Wikipedia lookup error per {city}: {e}")

    return None


def _generate_dynamic_umbrian_village_text(city: str, prov_label: str, name: Optional[str] = None) -> str:
    """Fallback minimale e fattuale per borghi non presenti nella knowledge base né su Wikipedia."""
    return f"{city} è un borgo situato nella provincia di {prov_label}, nella regione Umbria."


def generate_borgo_cultural_info(
    city: str,
    province: str = "PG",
    name: Optional[str] = None
) -> str:
    """
    Genera il testo per la sezione 'Storia e Cultura del Borgo',
    assicurando l'indicazione esplicita di borgo umbro ed eliminando ogni cliché pomposo o retorico.
    """
    city_clean = (city or "Umbria").strip()
    province_clean = (province or "PG").strip().upper()
    prov_label = "Perugia" if province_clean == "PG" else "Terni" if province_clean == "TR" else province_clean

    # 1. Costruzione del prompt formale focalizzato sull'identità di borgo umbro e anti-fluff
    prompt = build_cultural_prompt(city=city_clean, province=province_clean, name=name)

    # 2. Tentativo tramite LLM (OpenAI o Gemini) se configurato
    ai_text = _try_llm_generation(
        prompt,
        system_prompt="Sei una guida storica e culturale dell'Umbria. Scrivi testi chiari, asciutti ed eleganti, senza alcuna retorica o formula pomposa."
    )
    if ai_text and len(ai_text.strip()) > 60:
        return ai_text.strip()

    # 3. Consultazione della Knowledge Base curata dei borghi umbri (senza filler retorico)
    city_key = city_clean.lower().strip()
    if city_key in TOWN_CULTURAL_KNOWLEDGE:
        res = _format_curated_cultural_text(city_clean, prov_label, TOWN_CULTURAL_KNOWLEDGE[city_key])
        return re.sub(r"^[\s,–—]+", "", res).strip()

    for key, text in sorted(TOWN_CULTURAL_KNOWLEDGE.items(), key=lambda x: len(x[0]), reverse=True):
        if key in city_key or city_key in key:
            res = _format_curated_cultural_text(city_clean, prov_label, text)
            return re.sub(r"^[\s,–—]+", "", res).strip()

    # 4. Ricerca e sintesi tramite Wikipedia Italia (senza filler retorico)
    wiki_text = _try_wikipedia_summary(city_clean, prov_label)
    if wiki_text and len(wiki_text.strip()) > 60:
        return re.sub(r"^[\s,–—]+", "", wiki_text).strip()

    # 5. Fallback fattuale per borghi umbri (nessun testo finto-poetico)
    res = _generate_dynamic_umbrian_village_text(city_clean, prov_label, name)
    return re.sub(r"^[\s,–—]+", "", res).strip()
