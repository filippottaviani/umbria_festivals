import re
import json
import requests
from datetime import datetime
from typing import Optional
import scrapy
from umbria_festivals.items import FestivalItem
from umbria_festivals.sources import SOURCES

INVALID_IMG_KEYWORDS = [
    "flag", "bandiera", "stemma", "coat_of_arms", "emblem", "gonfalone",
    ".svg", "favicon", "avatar", "gravatar", "facebook", "instagram",
    "whatsapp", "share", "button", "badge", "px.gif", "1x1", "logo"
]

DISH_DESCRIPTIONS = {
    "frittella": "La Frittella di Pozzo è la regina incontrastata della festa: un impasto lievitato ad arte e fritto sul momento in olio bollente. Dorata e croccante all'esterno e soffice all'interno, viene servita caldissima in versione salata (con salumi nostrani e pecorino fresco) oppure spolverata di zucchero velato per la versione dolce.",
    "oca": "L'Oca arrostita è il piatto simbolo della tradizione contadina umbra. Le oche, allevate al pascolo, vengono marinate con finocchietto selvatico, aglio e rosmarino, per poi essere cotte lentamente nei forni a legna. La carne risulta estremamente tenera e saporita, servita con patate al guscio dorate.",
    "carbonai": "Lo Spaghetto dei Carbonai celebra l'antico piatto energetico dei boschiaioli appenninici. Spaghetti trafilati al bronzo conditi con una ricca base di guanciale stagionato locale ben rosolato, uova fresche di gallina, pecorino stagionato e una spolverata di pepe nero macinato al momento.",
    "tartufo": "Il Tartufo Nero pregiato viene lavorato a crudo pestato nel mortaio con olio extravergine d'oliva d'eccellenza, aglio e un pizzico di sale. Va a condire deliziosi umbrichelli e strangozzi fatti a mano o crostini di pane casereccio caldo.",
    "piccantissima": "Festa dedicata alle prelibatezze speziate e al peperoncino: il piatto forte comprende carne alla brace marinata in salse piccanti della tradizione e crostoni con sugo di pomodoro, salsiccia e peperoncini umbri coltivati a chilometro zero.",
    "asparagi": "Gli asparagi selvatici, raccolti manualmente tra le macchie collinari in primavera, sono i protagonisti assoluti: saltati in padella con uova biologiche, impiegati per condire tagliolini all'uovo fatti in casa o utilizzati come ripieno per fragranti frittate su torte al testo.",
    "gnocchi": "Gli gnocchi di patate tradizionali, impastati a mano ogni mattina dalle massaie locali con patate rosse dei monti umbri, vengono serviti conditi con sugo denso di cinghiale al ragù, oca in umido oppure con fonduta di pecorino e scaglie di tartufo.",
    "ortolano": "Trionfo delle verdure di stagione raccolte nei campi della piana del Tevere: parmigiane di melanzane dorate, fiori di zucca ripieni di ricotta e alici, caponate di verdure fresche e la classica torta al testo umbra farcita con erbe di campo ripassate.",
    "diavoli": "Specialità della casa sono le abbondanti grigliate miste di maiale (costine, salsicce e spuntature) cotte sulla brace viva di legna di quercia, accompagnate da patate fritte e la tipica torta al testo farcita con erbe miste o prosciutto crudo.",
    "ciriola": "La Ciriola è la tipica pasta acrobatica in acqua e farina della provincia di Terni: spessa e morbida, la versione Copparola viene condita con un profumatissimo sugo di pomodoro fresco, aglio, prezzemolo, peperoncino ed erbe spontanee della Valnerina.",
    "umbrichelli": "Gli Umbrichelli sono il formato di pasta cacio e pepe per eccellenza dell'orvietano. Lavorati a mano a spaghetto spesso, vengono saltati in padella con sugo all'arrabbiata, ragù di lepre o aglione fresco.",
    "antifestival": "Menù giovanile ed eclettico che affianca ai classici panini con la porchetta umbra cotta a legna e gli arrosticini alla brace anche opzioni vegetariane e birre artigianali prodotte nei microbirrifici della regione.",
    "gaglietole": "Piatti forti della cucina paesana: gnocchi al sugo d'oca, carni alla brace speziate, tagliate di manzo nostrano ed i celebri dolci della tradizione casalinga sfornati dalle donne del borgo.",
    "autunno": "Piatti dedicati ai sapori autunnali ed alla cucina umbra di campagna: polenta calda con sugo di spuntature e salsicce, funghi porcini trifolati, bruciate di castagne e vino novello dei colli d'Assisi.",
    "torre": "Gnocchi e fagioli con le cotiche stufati nel coccio secondo antiche ricette contadine, torte al testo ripiene di salsiccia e verdure, e bruschette all'olio nuovo della Valnestore.",
    "stramaialata": "Festa interamente dedicata al maiale ed all'arte norcina: grigliate miste, porchetta allo spiedo croccante, fegatelli con la rete all'alloro e stinco di maiale cotto al forno con patate.",
    "giacchio": "Celebrazione del pesce del Lago Trasimeno captato con la tipica rete 'giacchio': tegamaccio di pesce di lago (carpa, regina, luccio e persico) stufato in salsa di pomodoro piccante ed erbe aromatiche del lago.",
    "ammeto": "Primi piatti della tradizione marscianese tra cui tagliatelle al ragù di cinghiale, umbrichelli al sugo finto, grigliate miste e frittelle dolci per chiudere in bellezza.",
    "pizza": "Pizze cotte ad altissima temperatura nel forno a legna secondo la tradizione paesana: impasti a lunga lievitazione conditi con pomodoro nostrano, mozzarella filante, salsiccia umbra e verdure di campo.",
    "gaite": "Piatti storici del Medioevo umbro ricreati fedelmente sulle fonti archivistiche: zuppe di farro ed orzo con erbe aromatiche, ipocrasso (vino speziato), arrosti d'oca al miele e dolcetti allo zenzero e mandorle.",
    "arrosticini": "Squisiti spiedini di carne ovina rosolati e salati a puntino sui bracieri longitudinali ('canaline'), accompagnati da bruschette al pane di casa unte d'olio d'oliva ed abbondante vino rosso.",
    "cipolla": "La Cipolla di Cannara (dolce e digeribile) è declinata in ogni portata: dalla zuppa di cipolle dorata in crosta di pane alle penne alla cannarina, fino alla frittata di cipolle ed i bomboloni dolci alla confettura di cipolla.",
    "cinghiale": "Carne di cinghiale selvatico frollata ed intenerita in marinatura di vino rosso e spezie, stufata in umido 'alla cacciatora' con bacche di ginepro e servita con polenta di granoturco fumante.",
    "tagliatella": "Tagliatelle trafilate al mattarello con uova fresche di fattoria, condite con sughi ricchi ed aromatici di ragù tradizionale, funghi porcini degli Appennini o rigaglie di pollo.",
    "primi": "Il festival nazionale dei primi piatti raccoglie le eccellenze di tutta Italia: dai cappelletti in brodo umbri ai pici toscani, lasagne, gnocchi, risotti e paste ripiene preparati dai più grandi chef.",
    "sagrantino": "Abbinamento tra il maestoso vino Sagrantino di Montefalco DOCG e la cucina d'eccellenza: strangozzi al tartufo, spezzatini di chianina brasati al Sagrantino e tozzetti alle mandorle da intingere nel Passito."
}

def is_invalid_image(url_str: str) -> bool:
    if not url_str:
        return True
    u = url_str.lower()
    return any(k in u for k in INVALID_IMG_KEYWORDS)

def is_flag_or_emblem(url_str: str) -> bool:
    return is_invalid_image(url_str)


def fetch_wikipedia_info(query: str, lang: str = "it") -> dict:
    """Fetch a short summary, image, and coordinates from Wikipedia API."""
    result = {"extract": "", "image_url": None, "lat": None, "lon": None}
    headers = {"User-Agent": "UmbriaFestivalsBot/1.0 (https://github.com/umbriafestivals; contact@example.com)"}
    try:
        url = f"https://{lang}.wikipedia.org/w/api.php"
        params = {
            "action": "query",
            "format": "json",
            "prop": "extracts|pageimages|coordinates",
            "exintro": True,
            "explaintext": True,
            "pithumbsize": 1000,
            "titles": query,
            "redirects": 1
        }
        response = requests.get(url, headers=headers, params=params, timeout=5)
        if response.status_code == 200:
            data = response.json()
            pages = data.get("query", {}).get("pages", {})
            for page_id, page_info in pages.items():
                if page_id != "-1":
                    extract = page_info.get("extract", "")
                    if extract:
                        result["extract"] = extract[:400] + "..." if len(extract) > 400 else extract
                    
                    thumbnail = page_info.get("thumbnail", {})
                    if thumbnail and "source" in thumbnail:
                        candidate_img = thumbnail["source"]
                        if not is_flag_or_emblem(candidate_img):
                            result["image_url"] = candidate_img
                        
                    coords = page_info.get("coordinates", [])
                    if coords and len(coords) > 0:
                        result["lat"] = coords[0].get("lat")
                        result["lon"] = coords[0].get("lon")
                    break

        if not result["image_url"]:
            img_params = {
                "action": "query",
                "titles": query,
                "generator": "images",
                "gimlimit": 25,
                "prop": "imageinfo",
                "iiprop": "url",
                "iiurlwidth": 1000,
                "format": "json"
            }
            img_resp = requests.get(url, headers=headers, params=img_params, timeout=5)
            if img_resp.status_code == 200:
                img_data = img_resp.json()
                img_pages = img_data.get("query", {}).get("pages", {})
                for p_id, p_val in img_pages.items():
                    info_list = p_val.get("imageinfo", [])
                    if info_list and "thumburl" in info_list[0]:
                        t_url = info_list[0]["thumburl"]
                        if not is_flag_or_emblem(t_url) and any(ext in t_url.lower() for ext in [".jpg", ".jpeg", ".webp"]):
                            result["image_url"] = t_url
                            break
    except Exception as e:
        pass
    return result

TR_CITIES = {
    "terni", "orvieto", "narni", "amelia", "guardea", "stroncone", "montefranco",
    "monteleone dorvieto", "monteleone d'orvieto", "lugnano in teverina", "otricoli",
    "san gemini", "ferentillo", "arrone", "acquasparta", "montecastrilli", "alviano",
    "attigliano", "avigliano umbro", "baschi", "calvi dell'umbria", "castel viscardo",
    "fabro", "ficulle", "giove", "penna in teverina", "polino", "porano", "san venanzo",
    "montecchio"
}

OTHER_PROVINCES = {
    "marciano della chiana": "AR",
    "brolio": "AR",
    "cortona": "AR",
    "castiglione d'orcia": "SI",
    "altidona": "FM",
    "urbino": "PU",
    "serravalle di chienti": "MC"
}

def get_real_province(city_name: str) -> str:
    if not city_name:
        return "PG"
    c_lower = city_name.strip().lower()
    for tr_city in TR_CITIES:
        if tr_city in c_lower:
            return "TR"
    for other_city, prov in OTHER_PROVINCES.items():
        if other_city in c_lower:
            return prov
    return "PG"

TOWN_COORDINATES = {
    "Perugia": (43.1107, 12.3908),
    "Terni": (42.5642, 12.6406),
    "Foligno": (42.9561, 12.7034),
    "Città di Castello": (43.4566, 12.2393),
    "Spoleto": (42.7352, 12.7368),
    "Orvieto": (42.7186, 12.1121),
    "Narni": (42.5181, 12.5153),
    "Todi": (42.7818, 12.4069),
    "Gubbio": (43.3516, 12.5786),
    "Bastia Umbra": (43.0678, 12.5511),
    "Marsciano": (42.9125, 12.3364),
    "Assisi": (43.0707, 12.6196),
    "Umbertide": (43.3061, 12.3314),
    "Castiglione del Lago": (43.1264, 12.0469),
    "Gualdo Tadino": (43.2307, 12.7844),
    "Amelia": (42.5544, 12.4178),
    "Bevagna": (42.9347, 12.6083),
    "Montefalco": (42.8933, 12.6517),
    "Norcia": (42.7925, 13.0931),
    "Cascia": (42.7189, 13.0131),
    "Colfiorito": (43.0167, 12.9167),
    "Balanzano": (43.0767, 12.4239),
    "Pietrafitta": (42.9903, 12.2131),
    "Pozzo": (42.8711, 12.5317),
    "Pila": (43.0681, 12.3344),
    "Cannaiola": (42.8681, 12.6289),
    "Gaglietole": (42.8647, 12.4639),
    "Guardea": (42.6231, 12.2961),
    "San Brizio": (42.7911, 12.6847),
    "Lugnano in Teverina": (42.5744, 12.3308),
    "Scheggino": (42.7125, 12.8317),
    "Baiano": (42.6989, 12.6981),
    "Trevi": (42.8931, 12.7461),
    "Spello": (42.9922, 12.6719),
    "Cannara": (42.9953, 12.5839),
    "Montecastrilli": (42.6498, 12.4878),
    "Casa Del Diavolo": (43.1970, 12.4680),
    "Pierantonio": (43.2650, 12.3360),
    "Grutti": (42.8600, 12.4840),
    "Marcellano": (42.8560, 12.4850),
    "Fratticiola Selvatica": (43.2080, 12.5530),
    "Castelnuovo": (43.0450, 12.5550),
    "Castiglion Fosco": (42.9690, 12.1930),
    "Ammeto": (42.9180, 12.3350),
    "Annifo": (43.0200, 12.8460),
    "Paciano": (43.0223, 12.0708),
    "Sigillo": (43.3323, 12.7408),
    "Papiano": (42.9329, 12.3551),
    "Fossato Di Vico": (43.2962, 12.7601),
    "Cerreto Di Spoleto": (42.8189, 12.9197),
    "Costano": (43.0336, 12.5647),
    "Massa Martana": (42.7758, 12.5273),
    "Stroncone": (42.4994, 12.6631),
    "Montefranco": (42.5975, 12.7642),
    "Baschi": (42.6739, 12.2217),
    "Monteleone Dorvieto": (42.8406, 12.0514),
    "Monteleone D'Orvieto": (42.8406, 12.0514),
    "Magione": (43.1428, 12.2042),
    "Pianello": (43.1361, 12.5489),
    "Tavernelle": (42.9892, 12.1706)
}

TOWN_DESCRIPTIONS = {
    "Paciano": "Paciano è un suggestivo borgo medievale inserito tra i 'Borghi più belli d'Italia', arroccato sulle colline che dominano il Lago Trasimeno. Conserva intatta la sua cinta muraria del XIV secolo con tre torri rompitratta e stradine in pietra ricche di fascino e vista sulla campagna umbra.",
    "Casa del Diavolo": "Situato lungo la valle del Tevere a nord di Perugia, Casa del Diavolo è un caratteristico centro agricolo ed enogastronomico il cui nome curioso affonda le radici in antiche leggende popolari e stazioni di posta d'epoca romana.",
    "Pila": "Pila è una frazione collinare di Perugia immersa tra olivi e vigneti. Nota per la forte vocazione agricola e le tradizioni culinarie legate ai prodotti della terra, offre uno scorcio autentico sulla vita rurale del perugino.",
    "Pozzo": "Frazione del comune di Gualdo Cattaneo, Pozzo sorge su un rilievo panoramico costellato di uliveti. Il borgo conserva una torre medievale e vicoli in pietra dove ogni anno si celebrano le eccellenze dell'olio e della gastronomia locale.",
    "Spoleto": "Città d'arte di fama internazionale celebrata per il Festival dei Due Mondi, Spoleto vanta un patrimonio millenario che spazia dal Teatro Romano alla maestosa Rocca Albornoziana e al celebre Ponte delle Torri.",
    "Gubbio": "Una delle più antiche città dell'Umbria, Gubbio domina la valle con i suoi imponenti palazzi in pietra grigia, tra cui il Palazzo dei Consoli. Famosa per la Corsa dei Ceri e la tradizione della ceramica, conserva un fascino medievale unico al mondo.",
    "Narni": "Arroccata su uno sperone roccioso sopra la gola del fiume Nera, Narni custodisce un centro storico straordinario con la Narni Sotterranea, il Ponte di Augusto e una storia millenaria che ha inspirato persino le Cronache di Narnia.",
    "Bettona": "Antico insediamento etrusco e romano soprannominato il 'Balcone del Subasio' per la vista spettacolare sulla valle di Assisi. Racchiuso da mura antiche, il borgo è rinomato per la Pinacoteca Comunale e l'eccellente tradizione norcina.",
    "Cannaiola": "Piccolo borgo agricolo situato nella pianura di Trevi, Cannaiola è noto per la sua accogliente comunità, i paesaggi rurali immersi tra i campi coltivati e gli eventi culturali giovanili della Valle Umbra.",
    "Gaglietole": "Borgo castellano adagiato sulle colline di Collazzone, Gaglietole conserva resti delle antiche fortificazioni e offre uno splendido panorama sulla media valle del Tevere, celebre per le sue sagre paesane autentiche.",
    "Castelnuovo": "Immerso nel verde territorio di Assisi, Castelnuovo di Assisi è una vivace frazione rurale rinomata per le rievocazioni storiche, le feste patronali e la cucina contadina d'eccellenza.",
    "San Brizio": "Frazione di Spoleto situata nella fertile pianura spolentina, San Brizio è celebre per le sue tradizioni culinarie d'eccellenza legate alla lavorazione artigianale della pasta fatta in casa.",
    "Castiglion Fosco": "Caratterizzato dalla celebre torre circolare del XVI secolo che domina l'abitato, Castiglion Fosco è un pittoresco borgo di origine feudale immerso tra i boschi e le colline della Valnestore.",
    "Castiglione del Lago": "Spettacolare fortezza situata su un promontorio calcareo proteso nel Lago Trasimeno. Vanta il maestoso Palazzo della Corgna e la Rocca del Leone, ed è la meta ideale per gli amanti della natura e degli sport lacustri.",
    "Assisi": "Città simbolo di pace nel mondo e patria di San Francesco e Santa Chiara. Dichiarata Patrimonio dell'Umanità UNESCO, incanta i visitatori con la Basilica affrescata da Giotto e Cimabue e le sue stradine mistiche.",
    "Foligno": "Terza città dell'Umbria per popolazione, operosa e ricca di cultura. Situata nel cuore della Valle Umbra, è famosa per la Quintana, la stampa della prima edizione della Divina Commedia e il festival 'I Primi d'Italia'.",
    "Montefranco": "Borgo fortificato della Valnerina arroccato su un colle panoramico. Offre scorci suggestivi sulle gole del fiume Nera ed è immerso in una natura incontaminata ricca di sentieri e tradizione norcina.",
    "Stroncone": "Incantevole borgo medievale perfettamente conservato a ridosso dei Monti Sabini. Caratterizzato da vicoli stretti, portali in pietra e una forte tradizione francescana legata all'Abbazia di San Simeone.",
    "Monteleone d'Orvieto": "Splendido borgo di confine situato su una cresta collinare tra Umbria e Toscana. Dominato dalla Torre Civica in cotto, offre un panorama mozzafiato sulla Valdichiana e la Val de Chiana.",
    "Case Nuove": "Frazione collinare alle porte di Foligno situata sulle prime pendici dell'Appennino umbro-marchigiano, immersa nei boschi e rinomata per la purezza dell'aria e le feste di paese.",
    "Baiano": "Piccolo centro abitato nella pianura spoletina, sviluppatosi intorno all'antica chiesa parrocchiale, noto per le sagre comunitarie e la produzione agricola locale.",
    "Papiano": "Frazione del comune di Marsciano adagiata sulle colline umbre, dominata dal Castello di Papiano con la sua imponente torre medievale e contornata da uliveti secolari.",
    "Baschi": "Borgo arroccato su uno sperone roccioso affacciato sul corso del fiume Tevere. Il suo centro storico noto come 'I Buci' è un intreccio affascinante di vicoli strettissimi, scalinate ed edifici in pietra.",
    "Marciano della Chiana": "Borgo toscano ai confini con l'Umbria domina la Valdichiana con la sua rocca medicea e la torre dell'orologio, custode di un ricco patrimonio storico e culturale.",
    "Brolio": "Frazione di Castiglion Fiorentino adagiata nella fertile pianura della Valdichiana, nota per i ritrovamenti archeologici di epoca etrusca e le vivaci tradizioni contadine.",
    "Pianello": "Frazione alle pendici del Monte Subasio lungo la valle del Chiascio, caratterizzata da una forte vocazione agricola e dalla vicinanza ai percorsi naturalistici francescani.",
    "Fossato di Vico": "Antico borgo di montagna incastonato nel Parco del Monte Cucco. Famoso per 'Rugato', le vie coperte d'epoca medievale, e per le sorgenti d'acqua purissima dell'Appennino.",
    "Marsciano": "Importante centro agricolo della media valle del Tevere, noto per la secolare tradizione della terracotta e dei laterizi, circondato da splendidi castelli e frazioni medievali.",
    "Perugia": "Capoluogo dell'Umbria, città d'arte e prestigioso centro universitario. Custodisce tesori etruschi e medievali come la Fontana Maggiore, la Rocca Paolina e il Palazzo dei Priori.",
    "Ammeto": "Frazione alle porte di Marsciano adagiata nei pressi del fiume Nestore, caratterizzata da una vivace vita comunitaria e parchi verdi attrezzati per le sagre estive.",
    "Castel Rigone": "Splendido borgo collinare affacciato sul Lago Trasimeno, celebre per il Santuario di Maria Santissima dei Miracoli capolavoro del Rinascimento umbro e i panorami mozzafiato.",
    "Norcia": "Città simbolo della Valnerina e del Parco Nazionale dei Monti Sibillini, patria di San Benedetto e capitale italiana della norcineria e del tartufo nero pregiato.",
    "Colfiorito": "Famoso altopiano appenninico noto per il Parco Naturale delle Paludi, la coltivazione delle rinomate patate rosse e lenticchie e la natura incontaminata.",
    "Guardea": "Borgo panoramico tra Orvieto e Amelia domina la valle del Tevere dall'alto dei suoi colli, celebre per il Castello di Alviano e le tradizioni enogastronomiche."
}

KNOWN_TOWNS = [
    "Perugia", "Terni", "Foligno", "Città di Castello", "Spoleto", "Orvieto", "Narni", "Todi",
    "Gubbio", "Bastia Umbra", "Marsciano", "Assisi", "Umbertide", "Castiglione del Lago",
    "Gualdo Tadino", "Amelia", "Bevagna", "Montefalco", "Norcia", "Cascia", "Colfiorito",
    "Balanzano", "Pietrafitta", "Pozzo", "Pila", "Cannaiola", "Gaglietole", "Guardea",
    "San Brizio", "Lugnano in Teverina", "Scheggino", "Baiano", "Trevi", "Spello", "Cannara",
    "Passignano sul Trasimeno", "Magione", "Corciano", "Deruta", "Nocera Umbra", "Valfabbrica",
    "Acquasparta", "Arrone", "Ferentillo", "Montecastrilli", "San Gemini", "Otricoli",
    "Casa del Diavolo", "Pierantonio", "Grutti", "Marcellano", "Fratticiola Selvatica",
    "Castelnuovo", "Castiglion Fosco", "Ammeto", "Annifo", "Paciano", "Sigillo", "Papiano",
    "Fossato di Vico", "Cerreto di Spoleto", "Costano", "Massa Martana", "Case Nuove", "Altidona",
    "Montecchio", "Ponte San Lorenzo", "Taverne di Serravalle di Chienti", "Castel Rigone", "Baschi"
]

class ProlocoSpider(scrapy.Spider):
    """Spider implementation for extracting festival data with Wikipedia enrichment."""
    name = "proloco"
    allowed_domains = [source["domain"] for source in SOURCES]
    
    def start_requests(self):
        for source in SOURCES:
            for url in source["start_urls"]:
                yield scrapy.Request(url, callback=self.parse_hub)

    def parse_hub(self, response):
        links = response.css("a::attr(href)").getall()
        event_links = [
            response.urljoin(l) for l in set(links) 
            if l and re.search(r'(sagr|event|fest)', l.lower()) 
            and not l.startswith('#') 
            and not l.startswith('mailto:') 
            and not l.startswith('javascript:')
            and not l.startswith('tel:')
        ]
        
        self.logger.info(f"Found {len(event_links)} potential event links on {response.url}")
        
        for link in event_links[:15]:
            yield scrapy.Request(link, callback=self.parse_event)

    def extract_city(self, name: str, url: str, text_lower: str) -> str:
        name_clean = re.sub(r'^Festa di\s+', '', name, flags=re.IGNORECASE)
        m = re.match(r'^(.+?)(?:\s+in Festa|\s+VinCanta)?\s+(?:2024|2025|2026|2027)', name_clean, re.IGNORECASE)
        if m:
            c = m.group(1).strip()
            if c.lower() not in ['giugno', 'sagra', 'stasera', 'eventi, sagre e manifestazioni massa martana']:
                return c.title()

        if url:
            m2 = re.search(r'sagreumbre\.it/sagre/(?:pg|tr)/([^/]+)/', url)
            if m2:
                return m2.group(1).replace('-', ' ').title()
                
            m3 = re.search(r'-([a-z-]+)-\d+$', url)
            if m3:
                extracted = m3.group(1).replace('-', ' ').title()
                if extracted == 'Ponte San Lorenzo Di Narni': return 'Narni'
                if extracted == 'Taverne Di Serravalle Di Chienti': return 'Serravalle Di Chienti'
                if extracted == 'Montecchio Di Cortona': return 'Montecchio'
                return extracted

        if "Ammeto" in name: return "Ammeto"
        if "Stramaialata" in name: return "Castiglione Del Lago"
        if "I Primi d'Italia" in name: return "Foligno"
        if "Sagra della Tagliatella Fatta a Mano" in name: return "Gualdo Tadino"
        if "Festa della Rievocazione" in name: return "Gualdo Cattaneo"
        if "Battitura" in name and "Pietralunga" in name: return "Pietralunga"
        if "Ciriola" in name: return "Stroncone"
        if "Pizza Sotto Lu Focu" in name: return "Montefranco"
        if "Massa Martana" in name: return "Massa Martana"
        if "Castel Rigone" in name: return "Castel Rigone"

        for town in KNOWN_TOWNS:
            if re.search(r'\b' + re.escape(town) + r'\b', text_lower, re.IGNORECASE):
                return town

        return "Umbria"

    def parse_event(self, response):
        item = FestivalItem()
        
        title = response.css('h1::text').get()
        if not title:
            title = response.css('title::text').get()
            if title:
                title = title.split('|')[0].split('-')[0].strip()
        item["name"] = title or "Sagra Sconosciuta"

        if "sagra" not in item["name"].lower() and "festa" not in item["name"].lower():
            return
            
        item["source_url"] = response.url

        text_content = " ".join(response.css('body *::text').getall())
        text_lower = text_content.lower()
        
        item["city"] = self.extract_city(item["name"], response.url, text_lower)
        
        # Use precise province matching based on city!
        item["province"] = get_real_province(item["city"])
        
        # Only process festivals inside Umbria (PG or TR)
        if item["province"] not in ["PG", "TR"]:
            self.logger.info(f"Skipping out-of-region festival: {item['name']} in {item['city']} ({item['province']})")
            return

        date_matches = re.findall(r'(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})', text_content)
        if len(date_matches) >= 2:
            item["start_date"] = self.format_date(date_matches[0])
            item["end_date"] = self.format_date(date_matches[1])
        elif len(date_matches) == 1:
            item["start_date"] = self.format_date(date_matches[0])
            item["end_date"] = item["start_date"]
        else:
            now = datetime.now()
            item["start_date"] = now.date().isoformat()
            item["end_date"] = now.date().isoformat()

        if not item.get("start_date"):
            return

        paragraphs = [p.strip() for p in response.css('article p::text, .entry-content p::text, .content p::text, body p::text').getall() if len(p.strip()) > 25]
        item["description"] = "\n\n".join(paragraphs[:3]) if paragraphs else "Un fantastico evento enogastronomico per riscoprire le tradizioni e i sapori dell'Umbria."

        # Extract structured menu items from page lists or paragraphs
        menu_items = []
        # Search <li> elements for menu items
        for li in response.css('article li::text, .entry-content li::text, .menu li::text, ul li::text').getall():
            txt = li.strip()
            if 5 < len(txt) < 120 and not any(j in txt.lower() for j in ['cookie', 'privacy', 'facebook', 'home', 'contatti', 'condividi']):
                menu_items.append(f"- {txt}")
                
        if not menu_items:
            for p in paragraphs:
                if any(k in p.lower() for k in ["menu", "gastronomia", "piatti", "degustazione", "stand", "specialità", "ristorante", "cucina"]):
                    menu_items.append(p)
                    
        # Set menu_info to None if no authentic menu items found (triggers UI notice alert)
        item["menu_info"] = "\n\n".join(menu_items[:12]) if menu_items else None

        city_name = item.get("city", "Umbria")
        
        item["latitude"] = 43.1107
        item["longitude"] = 12.3908
        
        dict_key = city_name.title()
        if dict_key in TOWN_COORDINATES:
            item["latitude"] = TOWN_COORDINATES[dict_key][0]
            item["longitude"] = TOWN_COORDINATES[dict_key][1]
        elif city_name in TOWN_COORDINATES:
            item["latitude"] = TOWN_COORDINATES[city_name][0]
            item["longitude"] = TOWN_COORDINATES[city_name][1]
            
        item["image_url"] = None
        
        if dict_key in TOWN_DESCRIPTIONS:
            item["cultural_info"] = TOWN_DESCRIPTIONS[dict_key]
        elif city_name in TOWN_DESCRIPTIONS:
            item["cultural_info"] = TOWN_DESCRIPTIONS[city_name]
        else:
            item["cultural_info"] = f"{city_name} è un affascinante borgo dell'Umbria immerso nelle colline, dove la storia, l'arte e l'autentica tradizione enogastronomica locale si fondono in un'atmosfera d'altri tempi."
        
        # Multi-priority cover extraction
        cover_candidate = None

        # Priority 1: Locandine, flyers, posters, and article content images
        article_imgs = response.css('article img::attr(src), .entry-content img::attr(src), .post-thumbnail img::attr(src), img[class*="wp-post-image"]::attr(src), img[src*="uploads"]::attr(src), img[src*="sagra"]::attr(src), img[src*="locandina"]::attr(src)').getall()
        for img_url in article_imgs:
            abs_url = response.urljoin(img_url)
            if not is_invalid_image(abs_url) and any(ext in abs_url.lower() for ext in ['.jpg', '.jpeg', '.png', '.webp']):
                cover_candidate = abs_url
                break

        # Priority 2: OpenGraph or Twitter meta images
        if not cover_candidate:
            meta_img = response.css('meta[property="og:image"]::attr(content), meta[name="twitter:image"]::attr(content)').get()
            if meta_img:
                abs_url = response.urljoin(meta_img)
                if not is_invalid_image(abs_url):
                    cover_candidate = abs_url

        # Priority 3: Fallback to Wikipedia info/image for the festival/town if no valid cover candidate on page
        if not cover_candidate:
            wiki = fetch_wikipedia_info(f"Sagra {item['name']} {city_name}")
            if not wiki.get("image_url"):
                wiki = fetch_wikipedia_info(city_name)
            if wiki.get("image_url"):
                cover_candidate = wiki["image_url"]

        item["image_url"] = cover_candidate


        # Smart dish_info matching with strict word boundaries
        text_for_dish = f"{item['name']} {item['description'] or ''} {item['menu_info'] or ''}".lower()
        matched_dish = None
        
        # 1. Multi-word phrases
        for key, description in DISH_DESCRIPTIONS.items():
            if " " in key and key in text_for_dish:
                matched_dish = description
                break
                
        # 2. Single words with strict word boundaries (\bkey\b)
        if not matched_dish:
            for key, description in DISH_DESCRIPTIONS.items():
                if " " not in key:
                    pattern = r'\b' + re.escape(key) + r'\b'
                    if re.search(pattern, text_for_dish):
                        matched_dish = description
                        break
                
        if matched_dish:
            item["dish_info"] = matched_dish
        else:
            dish_match = re.search(r'(?:sagra|festa)\s+de[lla|llo|l|i|gli]*\s+([A-Za-z\s"]+)', item["name"], re.IGNORECASE)
            if dish_match:
                dish = dish_match.group(1).split(' a ')[0].replace('"', '').strip().title()
                item["dish_info"] = f"Specialità indiscussa della festa è {dish}, preparato con cura artigianale secondo le antiche ricette tradizionali di {city_name}, esaltando gli ingredienti genuini del territorio umbro."
            else:
                item["dish_info"] = f"I cuochi ed i volontari di {city_name} preparano per l'occasione le migliori specialità gastronomiche tradizionali del territorio umbro, lavorando ingredienti genuini a chilometro zero."

        yield item

    def format_date(self, date_string: str) -> Optional[str]:
        raw_value = re.sub(r"[\.\-]", "/", date_string.strip())
        for fmt in ("%d/%m/%Y", "%d/%m/%y"):
            try:
                dt = datetime.strptime(raw_value, fmt).date()
                if dt.year < 2026:
                    dt = dt.replace(year=2026)
                return dt.isoformat()
            except ValueError:
                continue
        return None