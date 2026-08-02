import os
import uuid
import logging
import psycopg2

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

FESTIVALS_DATA = [
    {
        "name": "Sagra della Patata Rossa",
        "city": "Colfiorito",
        "province": "PG",
        "latitude": 43.0167,
        "longitude": 12.9167,
        "start_date": "2026-08-14",
        "end_date": "2026-08-23",
        "source_url": "https://www.sagreumbre.it/sagre//colfiorito/sagra-della-patata-rossa.html",
        "cultural_info": "Colfiorito si trova su un bellissimo altopiano carsico a circa 760 metri di altitudine al confine tra Umbria e Marche. Il Parco Naturale di Colfiorito comprende la celebre palude, un'area protetta di grande importanza per l'avifauna, e i resti dell'antica città romana di Plestia.",
        "dish_info": "La patata rossa di Colfiorito ha ottenuto il riconoscimento IGP nel 2015. Caratterizzata da buccia rossa, polpa gialla ed elevata tenuta in cottura, è l'ingrediente ideale per la preparazione di gnocchi soffici e gustosi.",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Colfiorito.JPG/1000px-Colfiorito.JPG",
        "description": "La celebre Sagra della Patata Rossa di Colfiorito è una delle manifestazioni enogastronomiche più rinomate dell'Umbria. Celebra la patata rossa IGP dell'altopiano, coltivata ad oltre 700 metri di altitudine.\n\nOgni sera gli stand gastronomici coperti offrono piatti tradizionali preparati al momento, accompagnati da musica dal vivo, spettacoli e mercatini dell'artigianato locale.",
        "menu_info": "Primi Piatti:\n- Gnocchi di patata rossa al ragù tradizionale umbro\n- Gnocchi al Sagrantino e pecorino\n- Gnocchi ai funghi porcini dell'appennino\n\nSecondi Piatti & Grigliate:\n- Spezzatino di vitello con patate rosse stufate\n- Salsicce di maiale e patate al forno\n- Porchetta artigianale di Foligno\n\nContorni & Dolci:\n- Patate rosse fritte a sfoglia sottile\n- Ciambelline dolci alla patata rossa e Vin Santo"
    },
    {
        "name": "Sagra della Pizza al Forno",
        "city": "Narni",
        "province": "TR",
        "latitude": 42.5181,
        "longitude": 12.5153,
        "start_date": "2026-07-24",
        "end_date": "2026-08-02",
        "source_url": "https://www.sagreumbre.it/sagre/tr/narni/sagra-della-pizza-al-forno.html",
        "cultural_info": "Narni è uno straordinario borgo medievale arroccato su un colle roccioso che domina la gola del fiume Nera. Famosa per la Narni Sotterranea, la Rocca Albornoziana e il monumentale Ponte di Augusto di epoca romana, ha ispirato le Cronache di Narnia di C.S. Lewis.",
        "dish_info": "La pizza al forno di Narni è un lievitato tradizionale della bassa Umbria, steso a mano e cotto nei forni a legna. Si distingue per la crosta croccante ed un cuore morbido ed alveolato condito con ingredienti genuini.",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Ponte_di_Augusto_a_Narni.jpg/1000px-Ponte_di_Augusto_a_Narni.jpg",
        "description": "Un viaggio nei sapori genuini della tradizione narnese. Durante la manifestazione, i maestri pizzaioli locali cuociono nei forni a legna la tipica pizza al forno narnese, fragrante e condita con prodotti a km zero.\n\nL'evento anima il centro storico tra spettacoli musicali serali, mostre pittoriche e degustazioni guidate di vini locali.",
        "menu_info": "Pizze Tradizionali al Forno a Legna:\n- Pizza al forno con salsiccia di maiale e cicoria ripassata\n- Pizza Margherita con fior di latte umbro e pomodoro san marzano\n- Pizza ai funghi porcini e tartufo estivo delle gole del Nera\n\nSpecialità Gastronomiche:\n- Manfricoli al sugo di fagioli e cotiche\n- Arrosticini alla brace\n- Arvoltelle fritte dolci e salate\n\nCantina:\n- Vino rosso DOC dei Colli Amerini e birra artigianale a caduta"
    },
    {
        "name": "Sagra degli Gnocchi",
        "city": "Guardea",
        "province": "TR",
        "latitude": 42.6231,
        "longitude": 12.2961,
        "start_date": "2026-07-31",
        "end_date": "2026-08-10",
        "source_url": "https://sagritaly.com/territorio/eventi-e-sagre/sagra-degli-gnocchi-guardea/",
        "cultural_info": "Guardea è un affascinante borgo della Teverina ternana situato a dominare la valle del Tevere. Di origini medievali, conserva l'antico Castello di Guardea Vecchia e l'Oasi Naturalistica del Lago di Alviano nelle immediate vicinanze.",
        "dish_info": "Gli gnocchi di Guardea vengono impastati a mano uno ad uno dalle cuoche del paese seguendo la ricetta tradizionale con patate locali schiacciate al momento, garantendo una consistenza unica e vellutata.",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Montecastrilli2007.JPG/1000px-Montecastrilli2007.JPG",
        "description": "Festa enogastronomica dedicata all'arte degli gnocchi fatti a mano dalle cuoche del borgo di Guardea.\n\nDieci serate all'insegna del buon cibo tradizionale, concerti dal vivo, ballo liscio ed eventi culturali nelle suggestive piazze del centro storico.",
        "menu_info": "Primi Piatti:\n- Gnocchi fatti a mano al ragù di castrato\n- Gnocchi ai 4 formaggi umbri con granella di noci\n- Gnocchi al sugo di lepre\n\nSecondi Piatti:\n- Grigliata mista di maiale alla brace\n- Spezzatino di cinghiale alla cacciatora con crostino di pane agliato\n\nDolci & Vini:\n- Tozzetti tradizionali mandorlati accompagnati da Vin Santo umbro"
    },
    {
        "name": "Sagra della Frittella",
        "city": "Pozzo",
        "province": "PG",
        "latitude": 42.8711,
        "longitude": 12.5317,
        "start_date": "2026-07-17",
        "end_date": "2026-07-26",
        "source_url": "https://www.staserasagra.it/sagre/sagra-frittella-2026w2/",
        "cultural_info": "Pozzo è un pittoresco castello medievale situato nel comune di Gualdo Cattaneo, nel cuore della Strada del Sagrantino. La sua struttura circolare e la torre di avvistamento offrono uno splendido panorama sulle colline coltivate a vigneti ed uliveti.",
        "dish_info": "La frittella di Pozzo è una ricetta di derivazione contadina a base di acqua, farina, lievito e sale, fritta nell'olio d'oliva bollente. Calda e soffice, accompagna da secoli i salumi e i formaggi della Valle Umbra.",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/BevagnaDec122023_03.jpg/1000px-BevagnaDec122023_03.jpg",
        "description": "Nella graziosa frazione di Pozzo si rinnova l'appuntamento con la deliziosa Frittella di Pozzo, preparazione dorata e croccante servita sia in versione salata che dolcificata.\n\nLa festa offre grandi tavolate al fresco, musica dal vivo, serate danzanti e stand gastronomici al coperto.",
        "menu_info": "Specialità Frittelle:\n- Frittella di Pozzo salata con prosciutto di Norcia ed erba cotta\n- Frittella fritte al momento spolverata di miele di acacia o zucchero a velo\n\nPrimi & Secondi:\n- Pappardelle al ragù di cinghiale\n- Umbricelli all'aglione\n- Salsicce e braciole di maiale marinate alle erbe spontanee alla brace"
    },
    {
        "name": "Piccantissima",
        "city": "Pila",
        "province": "PG",
        "latitude": 43.0681,
        "longitude": 12.3344,
        "start_date": "2026-07-24",
        "end_date": "2026-08-02",
        "source_url": "https://www.staserasagra.it/sagre/piccantissima-2026/",
        "cultural_info": "Pila è una vivace frazione alle porte di Perugia, adagiata sulle colline della campagna perugina. Famosa per la storica Villa Umbra e la chiesa di San Giovanni Battista, rappresenta un punto d'incontro per riscoprire il patrimonio rurale umbro.",
        "dish_info": "Il peperoncino in Umbria ha una lunga tradizione nella conservazione delle carni e nei condimenti invernali. A Piccantissima viene abbinato all'olio extravergine di oliva DOP Umbria per esaltare i sapori senza coprirli.",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Collegio_del_cambio%2C_Perugia_2023.jpg/1000px-Collegio_del_cambio%2C_Perugia_2023.jpg",
        "description": "Evento unico dedicato agli amanti dei sapori decisi ed al peperoncino in tutte le sue varietà ed intensità.\n\nOltre agli stand gastronomici con menù tradizionali e ricette piccanti, la manifestazione ospita mostre botaniche con centinaia di varietà di peperoncino da tutto il mondo e gare di resistenza al piccante.",
        "menu_info": "Menù Piccante & Tradizionale:\n- Penne all'arrabbiata estrema con estratto di Habanero e pecorino stagionato\n- Gnocchetti al ragù piccante di maiale\n- Crostini misti con spalmabile di peperoncino e nduja artigianale\n- Salsicce piccanti alla brace con patate al forno\n\nDolci:\n- Crostata al cioccolato fondente e peperoncino piccante"
    },
    {
        "name": "Antifestival",
        "city": "Cannaiola",
        "province": "PG",
        "latitude": 42.8681,
        "longitude": 12.6289,
        "start_date": "2026-07-10",
        "end_date": "2026-07-19",
        "source_url": "https://www.staserasagra.it/sagre/antifestival-cannaiola-2026/",
        "cultural_info": "Cannaiola è una frazione di Trevi adagiata nella piana spoletina lungo le sponde del fiume Clitunno. Ricca di storia legata all'agricoltura ed alla bonifica, dista pochi chilometri dal celebre Tempietto del Clitunno (Patrimonio Mondiale UNESCO).",
        "dish_info": "Gli strangozzi sono la pasta fresca simbolo dell'Umbria centrale: una sfoglia spessa di farina di grano tenero ed acqua tagliata a strisce irregolari, perfetta per raccogliere i sughi ed il tartufo estivo.",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Colfiorito.JPG/1000px-Colfiorito.JPG",
        "description": "Un festival di musica indipendente, cultura ed enogastronomia nel borgo di Cannaiola di Trevi.\n\nConcerti ad ingresso gratuito con artisti di fama nazionale ed internazionale, installazioni artistiche, mostre e stand gastronomici con birre artigianali e cibo genuino.",
        "menu_info": "Cucina Tradizionale & Street Food:\n- Strangozzi alla spoletina con sugo di pomodoro, aglio e peperoncino\n- Strangozzi al tartufo nero estivo delle colline di Trevi\n- Hamburger di carne Chianina umbra con pecorino fondente\n- Arvoltelle salate fritte al momento e patatine tagliate a mano\n- Selezione di birre artigianali umbre a caduta"
    },
    {
        "name": "Sagra dell'Anatra",
        "city": "Montecastrilli",
        "province": "TR",
        "latitude": 42.6498,
        "longitude": 12.4878,
        "start_date": "2026-08-14",
        "end_date": "2026-08-23",
        "source_url": "https://www.sagreumbre.it/sagre/tr/montecastrilli/sagra-dell-anatra.html",
        "cultural_info": "Montecastrilli è un elegante borgo collinare situato nella provincia di Terni tra le valli del Tevere e del Nera. Famoso per la mostra-mercato della civiltà contadina e le sue chiese rinascimentali, offre uno splendido panorama sulle colline coltivate a uliveti.",
        "dish_info": "L'anatra arrosto è una delle pietanze dominanti dei pranzi festivi della tradizione contadina umbra. Viene marinata con finocchio selvatico, aglio e rosmarino prima della lenta cottura nei forni a legna.",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Montecastrilli2007.JPG/1000px-Montecastrilli2007.JPG",
        "description": "Manifestazione storica celebrata a Montecastrilli per valorizzare le ricette tradizionali a base d'anatra al forno e ragù di cortile.\n\nDieci giorni di musica, spettacoli serali, mostre dell'artigianato contadino e degustazioni guidate dei grandi vini delle cantine ternane.",
        "menu_info": "Primi Piatti:\n- Tagliatelle fatte in casa al ragù d'anatra di cortile\n- Gnocchi freschi alla colatura di maiale\n\nSecondi Piatti:\n- Anatra muta arrosto al forno al profumo di finocchietto selvatico\n- Coniglio alla cacciatora con olive nere\n\nDolci & Vini:\n- Ciambellone al vino rosso umbro e cantucci tradizionali"
    },
    {
        "name": "Sagra delle Carni Tipiche Spoletine e della Frittella",
        "city": "Baiano",
        "province": "PG",
        "latitude": 42.6989,
        "longitude": 12.6981,
        "start_date": "2026-07-24",
        "end_date": "2026-07-26",
        "source_url": "https://www.umbriaeventi.com/eventi/sagra-delle-carni-spoletine-e-della-frittella-baiano-8182",
        "cultural_info": "Baiano è una frazione di Spoleto situata nella fertile valle spoletina ai piedi dei Monti Martani. Spoleto, famosa nel mondo per il Festival dei Due Mondi, vanta monumenti epici come la Rocca Albornoziana e il Ponte delle Torri.",
        "dish_info": "Le carni suine e bovine dello spoletino provengono da allevamenti locali e vengono cucinate su grandi braci di legna di quercia, garantendo una carne tenera, sapida e profumata.",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/BevagnaDec122023_03.jpg/1000px-BevagnaDec122023_03.jpg",
        "description": "Celebrazione delle eccellenze carnee dello spoletino e della fragrante frittella salata.\n\nNel borgo di Baiano si allestiscono grandi tavolate al fresco per gustare le migliori grigliate di maiale, costine marinate, arrosti e la classica frittella ripiena.",
        "menu_info": "Grigliata Spoletina & Carni alla Brace:\n- Costine di maiale marinate alle erbe aromatiche\n- Salsicce di maiale alla brace con crostone di pane agliato\n- Braciole di vitello nostrano\n\nPrimi & Frittelle:\n- Strangozzi al ragù umbro tradizionale\n- Frittella salata calda ripiena di prosciutto di Norcia\n- Frittella dolce alla Nutella"
    },
    {
        "name": "Mercato delle Gaite",
        "city": "Bevagna",
        "province": "PG",
        "latitude": 42.9347,
        "longitude": 12.6083,
        "start_date": "2026-06-17",
        "end_date": "2026-06-28",
        "source_url": "https://www.sagreumbre.it/sagre/pg/bevagna/mercato-delle-gaite.html",
        "cultural_info": "Bevagna è una perla medievale della Valle Umbra, inserita tra i Borghi più Belli d'Italia. Famosa per le sue piazze romaniche, le mura ben conservate e le antiche botteghe dei mestieri (carta, seta, cereria, dipintura).",
        "dish_info": "La cucina medievale di Bevagna si ispira alle antiche ricette del XIV secolo con l'uso di cereali antichi come il farro, spezie aromatiche, miele e carni stufate lentamente in recipienti di terracotta.",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/BevagnaDec122023_03.jpg/1000px-BevagnaDec122023_03.jpg",
        "description": "Una delle rievocazioni storiche medievali più celebri d'Italia. Il borgo di Bevagna ricostruisce fedelmente la vita quotidiana, le botteghe dei mestieri ed i banchi di ristoro medievali del XIV secolo.\n\nLe quattro Gaite (quartieri) si sfidano in gare gastronomiche, dei mestieri e di tiro con l'arco in un'atmosfera senza tempo.",
        "menu_info": "Taverne Medievali delle Gaite:\n- Gnocchi di farro alle erbe spontanee delle colline di Bevagna\n- Zuppa di legumi e cereali antichi servita nella scodella di pane\n- Arrosto di maiale speziato al ginepro, miele e rosmarino\n- Focacce calde all'olio nuovo e pecorino stagionato di fossa\n\nBevande Storiche:\n- Ippocrasso (vino rosso speziato al miele e cannella) e Cervogia"
    },
    {
        "name": "Mostra Mercato del Tartufo Nero",
        "city": "Norcia",
        "province": "PG",
        "latitude": 42.7925,
        "longitude": 13.0931,
        "start_date": "2026-07-15",
        "end_date": "2026-07-26",
        "source_url": "https://www.sagreumbre.it/sagre/pg/norcia/sagra-del-tartufo.html",
        "cultural_info": "Norcia è la capitale della norcineria e del tartufo, incastonata nel Parco Nazionale dei Monti Sibillini. Patria di San Benedetto, vanta una tradizione gastronomica ed artistica millenaria tra montagne mozzafiato ed altipiani ricchi di biodiversità.",
        "dish_info": "Il tartufo nero pregiato di Norcia (Tuber melanosporum) è il re della gastronomia umbra. Dal profumo intenso ed avvolgente, esalta primi piatti di pasta fresca, crostini e carni bianche e rosse.",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Colfiorito.JPG/1000px-Colfiorito.JPG",
        "description": "Manifestazione d'eccellenza per celebrare il Tartufo Nero Pregiato di Norcia e i prodotti tipici della Valnerina.\n\nStand gastronomici, laboratori del gusto con chef esperti, show cooking e degustazioni guidate dei rinomati salumi, prosciutti IGP e formaggi nursini.",
        "menu_info": "Menù d'Eccellenza al Tartufo Nero:\n- Strangozzi fatti a mano al tartufo nero pregiato di Norcia\n- Tagliolini al burro di malga, fior di sale e scaglie di tartufo fresco\n- Porchetta alla nursina infusa al tartufo estivo\n- Tagliere d'eccellenza con Prosciutto di Norcia IGP, salame corallina e caciotta tartufata\n\nVini:\n- Montefalco Rosso e grechetto dei colli martani"
    },
    {
        "name": "I Primi d'Italia",
        "city": "Foligno",
        "province": "PG",
        "latitude": 42.9561,
        "longitude": 12.7034,
        "start_date": "2026-09-24",
        "end_date": "2026-09-27",
        "source_url": "https://www.sagreumbre.it/sagre/pg/foligno/i-primi-d-italia.html",
        "cultural_info": "Foligno è una ricca città d'arte della piana umbra, famosa per la giostra della Quintana e per aver stampato nel 1472 la primissima copia della Divina Commedia di Dante Alighieri. Il suo centro storico vanta palazzi nobiliari e piazze rinascimentali splendide.",
        "dish_info": "I primi piatti rappresentano il simbolo della tavola italiana. A Foligno vengono celebrati in tutte le loro varianti: dalla pasta fresca trafilata al bronzo, ai risotti mantecati fino agli gnocchi tradizionali e alle zuppe della tradizione contadina.",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Collegio_del_cambio%2C_Perugia_2023.jpg/1000px-Collegio_del_cambio%2C_Perugia_2023.jpg",
        "description": "Il primo ed unico Festival Nazionale dei Primi Piatti. Per quattro giorni il centro storico di Foligno si trasforma in un villaggio del gusto a cielo aperto.\n\nTaverne dei Primi Villaggi, cooking show con chef di fama mondiale, mostre mercato di pasta all'uovo e percorsi sensoriali ed enogastronomici dedicati a tutti i palati.",
        "menu_info": "Le Taverne dei Primi Piatti:\n- Taverna della Pasta Fresca: Pappardelle al ragù di lepre e gnocchi al Sagrantino\n- Taverna del Riso: Risotto al tartufo nero e fonduta di pecorino umbro DOP\n- Taverna delle Zuppe: Zuppa di lenticchie di Castelluccio IGP e cicerchie di Serra de' Conti\n\nDolci Tipici Folignati:\n- Rocciata di Foligno tradizionale con noci, mele ed alchermes\n- Tozzetti mandorlati al Vin Santo"
    },
    {
        "name": "Enologica & Sagra del Sagrantino",
        "city": "Montefalco",
        "province": "PG",
        "latitude": 42.8933,
        "longitude": 12.6517,
        "start_date": "2026-09-11",
        "end_date": "2026-09-20",
        "source_url": "https://sagritaly.com/territorio/eventi-e-sagre/enologica-montefalco/",
        "cultural_info": "Montefalco è conosciuta in tutto il mondo come la 'Ringhiera dell'Umbria' per la sua posizione panoramica straordinaria che spazia da Perugia fino a Spoleto. Borgo fortificato custodisce il Complesso Museale di San Francesco con gli affreschi di Benozzo Gozzoli.",
        "dish_info": "Il Montefalco Sagrantino DOCG è un vitigno autoctono unico, famoso per la sua struttura tannica potente ed il colore rubino intenso. Accompagna idealmente brasati, carni rosse strutturate ed i grandi pecorini stagionati.",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/BevagnaDec122023_03.jpg/1000px-BevagnaDec122023_03.jpg",
        "description": "Festa enogastronomica per celebrare la vendemmia ed il pregiato Montefalco Sagrantino DOCG.\n\nDegustazioni guidate nei chiostri rinascimentali, stand gastronomici con abbinamenti tradizionali, passeggiate tra i vigneti collinari e spettacoli folcloristici degli sbandieratori di Montefalco.",
        "menu_info": "Gastronomia & Abbinamenti col Sagrantino:\n- Risotto al Sagrantino DOCG con mantecatura di pecorino dolce\n- Brasato di manzo al Sagrantino con purè di patate di Colfiorito\n- Tagliere di pecorini di fossa e salumi umbri con gelatina di vino Sagrantino\n\nGrandi Vini in Degustazione:\n- Montefalco Sagrantino DOCG, Montefalco Rosso DOC, Sagrantino Passito DOCG"
    }
]

def run_seed():
    db_url = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/umbriafestivals")
    logging.info("Connecting to database: %s", db_url)
    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        # Ensure schema table has all required columns
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS festivals (
                id UUID PRIMARY KEY,
                name VARCHAR NOT NULL,
                city VARCHAR NOT NULL,
                province VARCHAR NOT NULL,
                latitude FLOAT NOT NULL,
                longitude FLOAT NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                source_url VARCHAR UNIQUE NOT NULL,
                cultural_info TEXT,
                dish_info TEXT,
                image_url VARCHAR,
                description TEXT,
                menu_info TEXT
            );
            
            ALTER TABLE festivals ADD COLUMN IF NOT EXISTS cultural_info TEXT;
            ALTER TABLE festivals ADD COLUMN IF NOT EXISTS dish_info TEXT;
            ALTER TABLE festivals ADD COLUMN IF NOT EXISTS image_url VARCHAR;
            ALTER TABLE festivals ADD COLUMN IF NOT EXISTS description TEXT;
            ALTER TABLE festivals ADD COLUMN IF NOT EXISTS menu_info TEXT;
        """)
        conn.commit()

        # Wipe old/unrefined entries (e.g. entries with city='Umbria' or missing description)
        cursor.execute("DELETE FROM festivals WHERE city = 'Umbria' OR description IS NULL OR menu_info IS NULL;")
        conn.commit()
        logging.info("Cleaned up old unrefined festival records.")

        # Insert / Update rich festival items
        query = """
            INSERT INTO festivals (id, name, city, province, latitude, longitude, start_date, end_date, source_url, cultural_info, dish_info, image_url, description, menu_info)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (source_url) DO UPDATE
            SET cultural_info = COALESCE(festivals.cultural_info, EXCLUDED.cultural_info),
                dish_info = COALESCE(festivals.dish_info, EXCLUDED.dish_info),
                image_url = CASE WHEN festivals.image_url IS NULL OR festivals.image_url = '' THEN EXCLUDED.image_url ELSE festivals.image_url END,
                description = COALESCE(festivals.description, EXCLUDED.description),
                menu_info = COALESCE(festivals.menu_info, EXCLUDED.menu_info);

        """

        inserted_count = 0
        for data in FESTIVALS_DATA:
            cursor.execute(
                query,
                (
                    str(uuid.uuid4()),
                    data["name"],
                    data["city"],
                    data["province"],
                    data["latitude"],
                    data["longitude"],
                    data["start_date"],
                    data["end_date"],
                    data["source_url"],
                    data["cultural_info"],
                    data["dish_info"],
                    data["image_url"],
                    data["description"],
                    data["menu_info"]
                )
            )
            inserted_count += 1

        conn.commit()
        cursor.close()
        conn.close()
        logging.info("SUCCESS: Successfully purged old entries and seeded %d high-quality festival items into PostgreSQL!", inserted_count)
    except Exception as e:
        logging.error("ERROR while seeding database: %s", e)

if __name__ == "__main__":
    run_seed()
