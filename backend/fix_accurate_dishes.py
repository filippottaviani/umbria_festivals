import re
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.festival import FestivalModel

# Precise dish descriptions dictionary keyed by exact words/phrases
EXACT_DISH_DESCRIPTIONS = {
    "pizza sotto lu focu": "La 'Pizza Sotto Lu Focu' è la regina della tradizione gastronomica di Montefranco e della Valnerina: un'antica schiacciata d'acqua e farina cotta direttamente sul piano in pietra del camino, coperta dalla brace viva e dalle ceneri calde ('lu focu'). Croccante all'esterno e fragrante all'interno, viene servita calda e farcita con prosciutto nostrano, salsiccia rosolata o erbe di campo ripassate.",
    "pizza al forno": "La Pizza al Forno della tradizione umbra è preparata con impasti a lunga lievitazione cotta ad altissima temperatura nel forno a legna. Fragrante, alta e ben condita con pomodoro nostrano, mozzarella filante, salsiccia e verdure di stagione.",
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
    "gaite": "Piatti storici del Medioevo umbro ricreati fedelmente sulle fonti archivistiche: zuppe di farro ed orzo con erbe aromatiche, ipocrasso (vino speziato), arrosti d'oca al miele e dolcetti allo zenzero e mandorle.",
    "arrosticini": "Squisiti spiedini di carne ovina rosolati e salati a puntino sui bracieri longitudinali ('canaline'), accompagnati da bruschette al pane di casa unte d'olio d'oliva ed abbondante vino rosso.",
    "cipolla": "La Cipolla di Cannara (dolce e digeribile) è declinata in ogni portata: dalla zuppa di cipolle dorata in crosta di pane alle penne alla cannarina, fino alla frittata di cipolle ed i bomboloni dolci alla confettura di cipolla.",
    "cinghiale": "Carne di cinghiale selvatico frollata ed intenerita in marinatura di vino rosso e spezie, stufata in umido 'alla cacciatora' con bacche di ginepro e servita con polenta di granoturco fumante.",
    "tagliatella": "Tagliatelle trafilate al mattarello con uova fresche di fattoria, condite con sughi ricchi ed aromatici di ragù tradizionale, funghi porcini degli Appennini o rigaglie di pollo.",
    "primi": "Il festival nazionale dei primi piatti raccoglie le eccellenze di tutta Italia: dai cappelletti in brodo umbri ai pici toscani, lasagne, gnocchi, risotti e paste ripiene preparati dai più grandi chef.",
    "sagrantino": "Abbinamento tra il maestoso vino Sagrantino di Montefalco DOCG e la cucina d'eccellenza: strangozzi al tartufo, spezzatini di chianina brasati al Sagrantino e tozzetti alle mandorle da intingere nel Passito.",
    "lumaca": "Le lumache al sugo rappresentano un piatto tradizionale della campagna umbra: sfumate con vino bianco ed erbe aromatiche, vengono cotte a fuoco lento in un ricco sugo di pomodoro, aglio e mentuccia selvattica.",
    "porchetta": "La porchetta artigianale umbra, cotta al forno a legna con rosmarino, aglio e pepe nero. Croccante all'esterno e morbida all'interno, viene servita calda in fragranti panini di pane casereccio.",
    "torta al testo": "La Torta al Testo è il pane schiacciato azzimo cotto sulla pietra circolare rovente ('testo'): fragrante e calda, viene farcita con prosciutto crudo nostrano, salsiccia alla brace ed erbe di campo ripassate in padella.",
    "polenta": "Polenta di granoturco macinata a pietra servita fumante condita con ricchi sughi di salsicce, spuntature di maiale, cinghiale o funghi porcini trifolati.",
    "lenticchia": "La Lenticchia umbra (celebre quella di Castelluccio o Annifo) è cucinata in umido con un soffritto di carota, sedano, aglio e pomodoro, servita calda con crostini di pane agliato ed un filo d'olio d'oliva a crudo."
}

def extract_accurate_dish(name, description, menu_info, city_name):
    full_text = f"{name} {description or ''} {menu_info or ''}".lower()
    
    # 1. Match multi-word exact phrases first (e.g. "pizza sotto lu focu")
    for key, desc in EXACT_DISH_DESCRIPTIONS.items():
        if " " in key and key in full_text:
            return desc
            
    # 2. Match single words with strict REGEX WORD BOUNDARIES (\bkey\b)
    for key, desc in EXACT_DISH_DESCRIPTIONS.items():
        if " " not in key:
            pattern = r'\b' + re.escape(key) + r'\b'
            if re.search(pattern, full_text):
                return desc
                
    # 3. Dynamic custom dish fallback based on the actual festival name
    dish_match = re.search(r'(?:sagra|festa)\s+de[lla|llo|l|i|gli]*\s+([A-Za-z\s"]+)', name, re.IGNORECASE)
    if dish_match:
        dish_raw = dish_match.group(1).split(' a ')[0].replace('"', '').strip().title()
        return f"Specialità indiscussa della festa è {dish_raw}, preparato con cura artigianale secondo le antiche ricette tradizionali di {city_name}, esaltando gli ingredienti genuini del territorio umbro."
        
    return f"I cuochi ed i volontari di {city_name} preparano per l'occasione le migliori specialità gastronomiche tradizionali del territorio umbro, lavorando ingredienti genuini a chilometro zero."

def main():
    db = SessionLocal()
    try:
        festivals = db.query(FestivalModel).all()
        updated = 0
        
        for f in festivals:
            accurate_dish = extract_accurate_dish(f.name, f.description, f.menu_info, f.city)
            if f.dish_info != accurate_dish:
                print(f"Correcting dish_info for '{f.name}' ({f.city}):\n OLD: {f.dish_info[:60]}...\n NEW: {accurate_dish[:60]}...\n")
                f.dish_info = accurate_dish
                updated += 1
                
        db.commit()
        print(f"Successfully fixed dish_info for {updated} festivals.")
    finally:
        db.close()

if __name__ == '__main__':
    main()
