"""
Agente Generatore di Contenuti AI per SagraUmbra.
Genera descrizioni organiche per eventi e sezioni di storia e cultura dei borghi umbri.
"""

import os
import random
import logging
from typing import Optional

logger = logging.getLogger(__name__)

EVENT_TEMPLATES = [
    (
        "Un appuntamento simbolo del calendario estivo dell'Umbria, nato dalla passione della comunità locale per valorizzare le proprie radici e creare momenti di autentica convivialità. Ogni anno la manifestazione richiama visitatori ed appassionati per vivere serate all'insegna del buonumore, del calore paesano e della festa.",
        "Le serate prendono vita con un'atmosfera vibrante: le piazze si riempiono di musica dal vivo, risate e spettacoli popolari. L'entusiasmo dei volontari e l'organizzazione curata nei dettagli trasformano l'evento in un momento di autentica gioia condivisa.",
        "Tra concerti sotto le stelle, intrattenimento dal vivo e momenti dedicati a famiglie e visitatori di ogni età, l'evento rappresenta un'esperienza speciale per riscoprire il piacere delle feste paesane."
    ),
    (
        "Nata come momento di ritrovo festoso per celebrare la bella stagione e lo spirito di comunità, questa manifestazione si distingue per la grande energia e l'accoglienza calorosa che si respirano in ogni angolo.",
        "Dall'apertura serale fino a tarda notte, l'evento propone un ricco calendario di intrattenimento con complessi musicali, danze tradizionali ed esibizioni dal vivo che coinvolgono tutto il pubblico.",
        "Un'occasione ideale per trascorrere una serata all'aria aperta in allegria, scoprendo l'ospitalità più sincera ed il sapore genuino delle tradizioni estive umbre."
    ),
    (
        "Una manifestazione dal carattere autentico che unisce generazioni di paesani nella celebrazione dell'identità locale. La grande dedizione degli organizzatori si riflette nell'energia contagiosa che anima l'intero paese per tutta la durata dell'evento.",
        "L'evento regala serate ricche di vita con spettacoli itineranti, concerti di gruppi locali ed attività ricreative pensate per offrire divertimento e svago a tutti i partecipanti.",
        "Partecipare significa entrare a far parte di una grande festa di piazza, dove musica, sorrisi e spirito di condivisione sono i veri protagonisti dell'estate."
    )
]

TOWN_CULTURAL_KNOWLEDGE = {
    "paciano": "Paciano è un suggestivo borgo medievale inserito tra i 'Borghi più belli d'Italia', arroccato sulle colline che dominano il Lago Trasimeno. Conserva intatta la sua cinta muraria del XIV secolo con tre torri rompitratta e caratteristiche stradine in pietra ricche di fascino e vista sulla campagna umbra.",
    "casa del diavolo": "Situato lungo la valle del Tevere a nord di Perugia, Casa del Diavolo è un caratteristico centro agricolo ed enogastronomico dell'Umbria il cui nome curioso affonda le radici in antiche leggende popolari e storiche stazioni di posta d'epoca romana.",
    "pila": "Pila è una frazione collinare di Perugia immersa tra olivi secolari e vigneti. Questo tipico borgo rurale umbro è noto per la forte vocazione agricola e le tradizioni culinarie legate ai prodotti della terra, offrendo uno scorcio autentico sulla vita contadina del territorio perugino.",
    "pozzo": "Frazione del comune di Gualdo Cattaneo nel cuore dell'Umbria, Pozzo sorge su un rilievo panoramico costellato di uliveti. L'antico borgo umbro conserva una torre medievale e vicoli in pietra dove ogni anno si celebrano le eccellenze dell'olio e della gastronomia locale.",
    "spoleto": "Città d'arte umbra di fama internazionale celebrata per il Festival dei Due Mondi, Spoleto vanta un patrimonio millenario che spazia dal Teatro Romano alla maestosa Rocca Albornoziana e al celebre Ponte delle Torri, incastonata tra i monti e la fertile valle spoletina.",
    "gubbio": "Una delle più antiche e affascinanti città dell'Umbria, Gubbio domina la pianura con i suoi imponenti palazzi in pietra grigia, tra cui il celebre Palazzo dei Consoli. Famosa per la Corsa dei Ceri e la tradizione della ceramica, conserva un'atmosfera medievale intatta unica al mondo.",
    "narni": "Arroccato su uno sperone roccioso sopra la suggestiva gola del fiume Nera, Narni è uno straordinario borgo medievale dell'Umbria ternana. Custodisce un centro storico eccezionale con la Narni Sotterranea, la Rocca Albornoziana e il monumentale Ponte di Augusto di epoca romana, la cui atmosfera ha ispirato persino le Cronache di Narnia.",
    "bettona": "Antico insediamento etrusco e borgo medievale umbro soprannominato il 'Balcone del Subasio' per la vista spettacolare sulla valle di Assisi. Racchiuso da antiche mura intatte, il borgo è rinomato per la Pinacoteca Comunale e l'eccellente tradizione norcina umbra.",
    "cannaiola": "Piccolo e caloroso borgo agricolo della Valle Umbra situato nella pianura di Trevi, Cannaiola è noto per la sua accogliente comunità contadina, i paesaggi rurali immersi tra campi coltivati e la vicinanza al Tempietto sul Clitunno, patrimonio UNESCO.",
    "gaglietole": "Borgo castellano adagiato sulle colline umbre di Collazzone, Gaglietole conserva i resti delle antiche fortificazioni medievali e offre un panorama meraviglioso sulla media valle del Tevere, celebre per la sua atmosfera quieta e le sagre paesane autentiche.",
    "castelnuovo": "Immerso nel verde territorio di Assisi, Castelnuovo è una vivace frazione rurale dell'Umbria rinomata per le rievocazioni storiche, le feste patronali e la cucina contadina tipica basata su prodotti a chilometro zero.",
    "san brizio": "Frazione di Spoleto situata nella fertile pianura spoletina, San Brizio è un borgo umbro celebre per le sue tradizioni culinarie d'eccellenza legate alla lavorazione artigianale della pasta fresca e all'ospitalità della comunità locale.",
    "castiglion fosco": "Caratterizzato dalla celebre torre circolare del XVI secolo che svetta sull'abitato, Castiglion Fosco è un pittoresco borgo di origine feudale immerso tra i boschi e le colline della Valnestore, nella provincia di Perugia.",
    "castiglione del lago": "Splendido borgo umbro affacciato sulle acque del Lago Trasimeno, sorge su un promontorio calcareo dominato dalla trecentesca Rocca del Leone e dal rinascimentale Palazzo della Corgna, meta d'elezione per gli amanti della natura e della storia.",
    "assisi": "Città simbolo di pace e spiritualità nel mondo, Assisi è la perla dell'Umbria e patria di San Francesco e Santa Chiara. Riconosciuta Patrimonio dell'Umanità UNESCO, incanta per le sue basiliche affrescate da Giotto, i vicoli lastricati in pietra rosa del Subasio e i panorami mozzafiato.",
    "foligno": "Importante città d'arte e centro pulsante della Valle Umbra, Foligno è celebre per la storica Giostra della Quintana, per aver stampato nel 1472 la prima copia della Divina Commedia e per i suoi raffinati palazzi nobiliari affacciati su grandi piazze.",
    "montefranco": "Borgo fortificato dell'Umbria arroccato su un colle panoramico della Valnerina ternana. Offre scorci suggestivi sulle gole del fiume Nera ed è immerso in una natura verdeggiante ricca di sentieri montani e tradizioni norcine.",
    "stroncone": "Incantevole borgo medievale umbro perfettamente conservato a ridosso dei Monti Sabini. Caratterizzato da vicoli stretti, portali in pietra, scalinate e una forte tradizione francescana legata all'antico convento di San Francesco.",
    "monteleone d'orvieto": "Splendido borgo umbro di confine situato su una dorsale collinare tra Umbria e Toscana. Dominato dalla scenografica Torre Civica in laterizio, offre un panorama a perdita d'occhio sui vigneti e sulle valli circostanti.",
    "case nuove": "Borgo collinare alle porte di Foligno sulle prime pendici dell'Appennino umbro, immerso in boschi rigogliosi di querce e castagni, rinomato per l'aria pura e le feste comunitarie all'aperto.",
    "baiano": "Piccolo borgo agricolo situato nella pianura di Spoleto, sviluppatosi intorno all'antica pieve parrocchiale e noto per la produzione di olio extravergine d'oliva e le calorose sagre paesane estive.",
    "papiano": "Frazione collinare del comune di Marsciano adagiata sulle dolci alture dell'Umbria centrale, dominata dall'antico Castello di Papiano con la sua torre merlata contornata da uliveti secolari.",
    "baschi": "Caratteristico borgo umbro arroccato su uno sperone di roccia affacciato sulle rive del fiume Tevere. Il suo nucleo più antico, detto 'I Buci', è un labirinto affascinante di vicoli strettissimi, volte e archi in pietra locale.",
    "fossato di vico": "Antico borgo fortificato dell'Umbria appenninica adagiato ai piedi del Parco del Monte Cucco. Famoso per 'Le Rughe', caratteristiche vie coperte medievali, e per le sorgenti d'acqua purissima che sgorgano dalle montagne.",
    "marsciano": "Importante centro della media valle del Tevere, rinomato in tutta l'Umbria per la secolare tradizione del laterizio e della terracotta artigianale, circondato da una suggestiva corona di borghi e castelli medievali.",
    "perugia": "Capoluogo dell'Umbria e gloriosa città d'arte dalle radici etrusche e medievali. Ricca di monumenti celebri come la Fontana Maggiore, l'Arco Etrusco e la Rocca Paolina, rappresenta il cuore pulsante della cultura e della vita universitaria regionale.",
    "ammeto": "Frazione umbra alle porte di Marsciano situata nei pressi della confluenza del fiume Nestore, caratterizzata da un forte spirito associativo e ampi spazi verdi dove si rinnovano le feste di comunità.",
    "castel rigone": "Suggestivo borgo collinare dell'Umbria affacciato a 650 metri di altitudine con vista aerea sul Lago Trasimeno. Custodisce il Santuario di Maria Santissima dei Miracoli, mirabile esempio di architettura rinascimentale umbra.",
    "norcia": "Città simbolo della Valnerina e del Parco Nazionale dei Monti Sibillini, patria di San Benedetto da Norcia e capitale mondiale della norcineria e del tartufo nero pregiato, racchiusa da possenti mura a forma di cuore.",
    "colfiorito": "Celebre borgo montano dell'Appennino umbro situato su un vasto altopiano carsico a oltre 750 metri di quota, noto per il Parco Naturale delle Paludi, la coltivazione della patata rossa IGP e le tracce dell'antica civiltà dei Plestini.",
    "guardea": "Panoramico borgo umbro della Teverina ternana situato a dominare la fertile valle del Tevere. Conserva i resti dell'antico castello medievale e confina con la splendida Oasi Naturalistica del Lago di Alviano.",
    "montefalco": "Conosciuto in tutto il mondo come la 'Ringhiera dell'Umbria' per la sua straordinaria posizione dominante sulla Valle Umbra da Perugia a Spoleto. Borgo celebre per il pregiato vino Sagrantino DOCG e gli affreschi di Benozzo Gozzoli nel complesso museale di San Francesco.",
    "bevagna": "Perla medievale della Valle Umbra annoverata tra i 'Borghi più Belli d'Italia'. Famosa per la splendida Piazza Silvestri con le chiese romaniche di San Michele e San Silvestro e la suggestiva rievocazione del Mercato delle Gaite che fa rivivere le botteghe artigiane medievali.",
    "cannara": "Grazioso borgo della pianura assisana lambito dal fiume Topino, celebre per la secolare coltivazione della cipolla rossa di Cannara e per il legame profondo con San Francesco d'Assisi, dove il Santo tenne la celebre predica agli uccelli a Piandarca.",
    "costano": "Storica frazione del comune di Bastia Umbra adagiata lungo il corso del fiume Chiascio. L'antico borgo umbro vanta una tradizione plurisecolare nella produzione artigianale della vera porchetta umbra cotta a legna.",
    "sigillo": "Borgo medievale umbro situato lungo l'antica Via Flaminia alle falde del Monte Cucco. Noto per il suggestivo ponte romano Spiano, le mura trecentesche e come punto di riferimento europeo per il volo libero in deltaplano.",
    "pietralunga": "Borgo fortificato dell'Alta Valle del Tevere circondato da boschi incontaminati e pascoli montani. Rinomato per la Rocca longobarda, il tartufo bianco e la storica tradizione della patata bianca di Pietralunga.",
    "umbertide": "Vivace cittadina umbra situata alla confluenza del torrente Regghia nel fiume Tevere. Dominata dalla maestosa Rocca medievale oggi centro d'arte contemporanea, vanta chiese rinascimentali che custodiscono capolavori del Signorelli e del Pomarancio.",
    "todi": "Elegante borgo medievale e rinascimentale umbro arroccato su una collina che domina la media valle del Tevere. Famosa per la monumentale Piazza del Popolo, i Palazzi Comunali, il Duomo dell'Annunziata e il capolavoro bramantesco del Tempio di Santa Maria della Consolazione.",
    "orvieto": "Spettacolare città umbra che si erge maestosa su una rupe di tufo dominante la piana del fiume Paglia. Celebre a livello mondiale per il magnifico Duomo gotico con la cappella di San Brizio affrescata dal Signorelli, il Pozzo di San Patrizio e l'intricata Orvieto Underground.",
    "amelia": "Una delle città più antiche d'Umbria e d'Italia, celebre per le sue possenti mura poligonali ciclopiche di epoca preromana. Il borgo conserva eleganti palazzi rinascimentali, la Cattedrale, la torre civica dodecagonale e la statua bronzea del generale romano Germanico.",
    "acquasparta": "Elegante borgo umbro situato lungo l'antico tracciato della via Flaminia. Rinomato per il maestoso Palazzo Cesi, sede in cui Federico Cesi fondò nel Seicento l'Accademia dei Lincei ospitando Galileo Galilei, e per le benefiche acque minerali.",
    "san gemini": "Borgo medievale dell'Umbria meridionale tra i più intatti e caratteristici, rinomato per le sue terme e le storiche fonti d'acqua minerale. Nelle immediate vicinanze sorgono gli straordinari scavi archeologici dell'antica città romana di Carsulae.",
    "ferentillo": "Borgo medievale della Valnerina ternana diviso in due borghi gemelli (Matterella e Precetto) sorvegliati da due rocche a strapiombo sulla valle del Nera. Famoso per il Museo delle Mummie conservato nella cripta dell'antica chiesa di Santo Stefano.",
    "arrone": "Autentico gioiello medievale della Valnerina inserito tra i 'Borghi più belli d'Italia'. Arroccato su un colle roccioso nei pressi della Cascata delle Marmore, custodisce il nucleo fortificato del Castello con la torre degli ulivi e pregevoli affreschi rinascimentali.",
    "alviano": "Borgo collinare della Teverina umbra dominato dall'imponente Castello Doria Pamphili, fortezza rinascimentale con cortile nobile. Sotto al colle si estende l'Oasi WWF Lago di Alviano, una delle zone umide più importanti d'Italia per il birdwatching.",
    "massa martana": "Antico borgo fortificato umbro incastonato ai piedi dei Monti Martani lungo la Via Flaminia. Racchiuso da mura medievali con torri di guardia, vanta nelle vicinanze catacombe paleocristiane e splendide abbazie romaniche immerse tra boschi e ulivi."
}


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
    Genera un testo organico dedicato ESCLUSIVAMENTE all'evento ed alla sua atmosfera.
    Non ripete la descrizione geografica del borgo né la scheda del piatto tipico.
    """
    p1_template, p2_template, p3_template = random.choice(EVENT_TEMPLATES)

    p1 = f"La {name} a {city} è una manifestazione ricca di fascino e tradizione. {p1_template}"

    if program_info and len(program_info.strip()) > 30:
        p2 = f"Durante i giorni dell'evento, il programma offre un ricco calendario di appuntamenti: {program_info.strip()}."
    else:
        p2 = p2_template

    p3 = p3_template

    return f"{p1}\n\n{p2}\n\n{p3}"


def build_cultural_prompt(city: str, province: str = "PG", name: Optional[str] = None) -> str:
    """
    Costruisce il prompt dettagliato per il generatore AI, includendo rigorosamente
    l'indicazione esplicita che si tratta di un borgo umbro situato in Umbria.
    """
    prov_label = "Perugia" if province.upper() == "PG" else "Terni" if province.upper() == "TR" else province
    festival_context = f"- Sagra o Evento locale ospitato: {name}\n" if name else ""

    return (
        f"Sei un autorevole storico, narratore e guida culturale dell'Umbria (il Cuore Verde d'Italia).\n"
        f"Il tuo compito è redigere un testo avvincente, storicamente curato ed evocativo (2 paragrafi fluidi) "
        f"destinato alla sezione 'Storia e Cultura del Borgo' del portale turistico SagraUmbra.\n\n"
        f"DATI DEL LUOGO:\n"
        f"- Borgo / Città: {city}\n"
        f"- Provincia: {prov_label} ({province})\n"
        f"- Regione: Umbria\n"
        f"{festival_context}\n"
        f"REQUISITI IMPRESCINDIBILI DEL PROMPT:\n"
        f"1. INDICAZIONE ESPLICITA DI BORGO UMBRO: Sottolinea con estrema chiarezza fin dalle primissime righe "
        f"di che luogo si tratta descrivendo brevementela sua collocazione geografica "
        f"nel territorio umbro.\n"
        f"2. RADICI STORICHE ED EVOLUZIONE: Narra brevementele origini del borgo umbro.\n"
        f"3. PATRIMONIO ARCHITETTONICO: Menziona i monumenti simbolo del posto se ci sono.\n"
        f"4. STILE E FORMATTAZIONE: Scrivi in italiano elegante, caldo e divulgativo (circa 100-150 parole). "
        f"Evita elenchi puntati o convenevoli artificiali. Suddividi il testo in paragrafi leggibili."
    )


def _try_llm_generation(prompt: str) -> Optional[str]:
    """Tentativo di generazione tramite API LLM esterne se configurate nelle variabili d'ambiente."""
    # 1. Verifica OpenAI API Key
    openai_key = os.environ.get("OPENAI_API_KEY")
    if openai_key:
        try:
            import httpx
            headers = {
                "Authorization": f"Bearer {openai_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": "Sei una raffinata guida storica e culturale specializzata sui borghi dell'Umbria."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.7,
                "max_tokens": 700
            }
            with httpx.Client(timeout=15.0) as client:
                res = client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"]
                    if content and len(content.strip()) > 80:
                        return content.strip()
        except Exception as e:
            logger.warning(f"Errore generazione LLM OpenAI: {e}")

    # 2. Verifica Gemini API Key
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if gemini_key:
        try:
            import httpx
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
            payload = {
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
                            if text and len(text.strip()) > 80:
                                return text.strip()
        except Exception as e:
            logger.warning(f"Errore generazione LLM Gemini: {e}")

    return None


def _format_curated_cultural_text(city: str, prov_label: str, base_desc: str) -> str:
    """Arricchisce la voce storica di base garantendo la formula narrativa di borgo umbro."""
    p1 = base_desc
    p2 = (
        f"Camminando tra i vicoli in pietra di {city}, si respira tutta l'autenticità di un borgo umbro "
        f"in cui il tempo sembra scorrere a una velocità diversa. Le facciate degli edifici medievali, "
        f"i portali storici e gli scorci aperti sui declivi coltivati della provincia di {prov_label} "
        f"testimoniano la secolare armonia tra la mano dell'uomo e il meraviglioso paesaggio naturale dell'Umbria."
    )
    p3 = (
        f"Oggi la comunità locale custodisce con profondo orgoglio le proprie radici: la vita del paese si raccoglie "
        f"intorno alle piazze storiche, dove le feste popolari, le manifestazioni culturali e i sapori della cucina contadina "
        f"rinnovano ogni anno il fascino intatto dell'accoglienza umbra."
    )
    return f"{p1}\n\n{p2}\n\n{p3}"


def _try_wikipedia_summary(city: str, prov_label: str) -> Optional[str]:
    """Cerca e sintetizza informazioni storiche autentiche via Wikipedia in lingua italiana."""
    try:
        import wikipedia
        wikipedia.set_lang("it")
        summary = None
        for query in [f"{city} Umbria", f"{city} (Italia)", city]:
            try:
                text = wikipedia.summary(query, sentences=4)
                if "umbria" in text.lower() or "perugia" in text.lower() or "terni" in text.lower():
                    summary = text
                    break
            except Exception:
                continue

        if summary:
            # Assicura la dicitura esplicita di borgo umbro fin dal primo paragrafo
            if "borgo umbro" not in summary.lower() and "umbria" not in summary[:100].lower():
                p1 = f"{city} è un suggestivo borgo umbro della provincia di {prov_label}, nel cuore verde dell'Umbria. {summary}"
            else:
                p1 = summary

            p2 = (
                f"Immerso nel classico paesaggio collinare dell'Umbria tra uliveti e storiche architetture in pietra viva, "
                f"{city} conserva il fascino intatto dei borghi umbri d'altri tempi, dove le memorie del passato convivono "
                f"con una vibrante tradizione comunitaria e folkloristica."
            )
            return f"{p1}\n\n{p2}"
    except Exception as e:
        logger.debug(f"Wikipedia lookup error per {city}: {e}")

    return None


def _generate_dynamic_umbrian_village_text(city: str, prov_label: str, name: Optional[str] = None) -> str:
    """Generatore di fallback dinamico per borghi umbri non specificamente censiti in knowledge base."""
    p1 = (
        f"{city} è un affascinante borgo umbro situato nella provincia di {prov_label}, nel cuore più autentico dell'Umbria. "
        f"Adagiato in una splendida cornice collinare caratterizzata da distese di ulivi e profili appenninici, "
        f"questo borgo racchiude un ricco patrimonio di memorie storiche, le cui origini affondano nelle antiche vicende "
        f"delle comunità medievali umbre."
    )
    p2 = (
        f"Il tessuto urbano conserva i tratti inconfondibili dei borghi dell'Umbria: vicoli lastricati in pietra, "
        f"antiche mura difensive, pievi romaniche e scorci panoramici che regalano una vista aperta sulla valle. "
        f"Ogni angolo di {city} racconta la cura e la maestria degli artigiani locali, che nei secoli hanno saputo "
        f"plasmare un ambiente raccolto, sicuro e accogliente."
    )
    p3 = (
        f"Vivere {city} significa immergersi nello spirito genuino della tradizione umbra, dove l'ospitalità calorosa "
        f"degli abitanti e l'amore per i prodotti della terra si esprimono al meglio durante le feste di piazza e gli eventi comunitari, "
        f"custodendo un'identità culturale preziosa e vibrante."
    )
    return f"{p1}\n\n{p2}\n\n{p3}"


def generate_borgo_cultural_info(
    city: str,
    province: str = "PG",
    name: Optional[str] = None
) -> str:
    """
    Genera il testo per la sezione 'Storia e Cultura del Borgo',
    assicurando sempre che nel prompt e nel testo generato sia chiaramente
    ed esplicitamente indicato il fatto che si tratta di un borgo umbro.
    """
    city_clean = (city or "Umbria").strip()
    province_clean = (province or "PG").strip().upper()
    prov_label = "Perugia" if province_clean == "PG" else "Terni" if province_clean == "TR" else province_clean

    # 1. Costruzione del prompt formale focalizzato sull'identità di borgo umbro
    prompt = build_cultural_prompt(city=city_clean, province=province_clean, name=name)

    # 2. Tentativo tramite LLM (OpenAI o Gemini) se configurato
    ai_text = _try_llm_generation(prompt)
    if ai_text and len(ai_text.strip()) > 80:
        return ai_text.strip()

    # 3. Consultazione della Knowledge Base curata dei borghi umbri
    city_key = city_clean.lower()
    for key, text in TOWN_CULTURAL_KNOWLEDGE.items():
        if key == city_key or key in city_key or city_key in key:
            return _format_curated_cultural_text(city_clean, prov_label, text)

    # 4. Ricerca e sintesi tramite Wikipedia Italia
    wiki_text = _try_wikipedia_summary(city_clean, prov_label)
    if wiki_text and len(wiki_text.strip()) > 80:
        return wiki_text.strip()

    # 5. Generatore di sintesi narrativo per borghi umbri
    return _generate_dynamic_umbrian_village_text(city_clean, prov_label, name)

