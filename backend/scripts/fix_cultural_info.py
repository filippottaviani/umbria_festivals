import re
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.festival import FestivalModel

TOWN_DESCRIPTIONS = {
    "Paciano": "Paciano è un suggestivo borgo medievale inserito tra i 'Borghi più belli d'Italia', arroccato sulle colline che dominano il Lago Trasimeno. Conserva intatta la sua cinta muraria del XIV secolo con tre torri rompitratta e stradine in pietra ricche di fascino e vista sulla campagna umbra.",
    "Casa del Diavolo": "Situato lungo la valle del Tevere a nord di Perugia, Casa del Diavolo è un caratteristico centro agricolo ed enogastronomico il cui nome curioso affonda le radici in antiche leggende popolari e stazioni di posta d'epoca romana.",
    "Pila": "Pila è una frazione collinare di Perugia immersa tra olivi e vigneti. Nota per la forte vocazione agricola e le tradizioni culinarie legate ai prodotti della terra, offre uno scorcio autentico sulla vita rurale del perugino.",
    "Pozzo": "Frazione del comune di Gualdo Cattaneo, Pozzo sorge su un rilievo panoramico costellato di uliveti. Il borgo conserva una torre medievale e vicoli in pietra dove ogni anno si celebrano le eccellenze dell'olio e della gastronomia locale.",
    "Spoleto": "Città d'arte di fama internazionale celebrata per il Festival dei Due Mondi, Spoleto vanta un patrimonio millenario che spazia dal Teatro Romano alla maestosa Rocca Albornoziana e al celebre Ponte delle Torri.",
    "Gubbio": "Una delle più antiche città dell'Umbria, Gubbio domina la valle con i suoi imponenti palazzi in pietra grigia, tra cui il Palazzo dei Consoli. Famosa per la Corsa dei Ceri e la tradizione della ceramica, conserva un fascino medievale unico al mondo.",
    "Narni": "Arroccata su uno sperone roccioso sopra la gola del fiume Nera, Narni custodisce un centro storico straordinario con la Narni Sotterranea, il Ponte di Augusto e una storia millenaria che ha ispirato persino le Cronache di Narnia.",
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
    "Guarda": "Caratteristico borgo della Valnerina immerso nei boschi di leccio, punto di partenza ideale per escursioni lungo le gole del fiume Nera.",
    "Guardea": "Borgo panoramico tra Orvieto e Amelia domina la valle del Tevere dall'alto dei suoi colli, celebre per il Castello di Alviano e le tradizioni enogastronomiche."
}

def clean_city_name(raw_city):
    if not raw_city:
        return "Umbria"
        
    c = raw_city.strip()
    
    # Clean up prefixes
    prefixes = [
        r"^In Festa Con I Primi Piatti Parco\s+",
        r"^Dei Barbari\s+",
        r"^Delle Carni Spoletine E Della Frittella\s+",
        r"^Del Cinghiale Osteria Del Gatto\s+",
        r"^Pierantonio E S\. Orfeto$",
        r"^S Anna Paradiso\s+",
        r"^Del Fungo\s+",
        r"^Della Focaccia Cerreto Di\s+",
        r"^Della Pizza\s+",
        r"^Della Ranocchia\s+",
        r"^Del Cinghiale\s+"
    ]
    
    for p in prefixes:
        c = re.sub(p, "", c, flags=re.IGNORECASE)
        
    if "Pierantonio" in c: return "Pierantonio"
    if "Assisi" in c: return "Assisi"
    if "Baschi" in c: return "Baschi"
    if "Marsciano" in c and len(c) > 20: return "Marsciano"
    if "Fossato" in c: return "Fossato di Vico"
    if "Castel Rigone" in c: return "Castel Rigone"
    if "Marciano" in c: return "Marciano della Chiana"

    return c.title()

def main():
    db = SessionLocal()
    try:
        festivals = db.query(FestivalModel).all()
        updated = 0
        
        for f in festivals:
            clean_c = clean_city_name(f.city)
            f.city = clean_c
            
            # Find best match description
            desc = None
            for key, val in TOWN_DESCRIPTIONS.items():
                if key.lower() == clean_c.lower():
                    desc = val
                    break
                    
            if not desc:
                desc = f"{clean_c} è un affascinante borgo dell'Umbria immerso nelle colline, dove la storia, l'arte e l'autentica tradizione enogastronomica locale si fondono in un'atmosfera d'altri tempi."
                
            if f.cultural_info != desc:
                print(f"Updating cultural_info for {f.city}: {desc[:60]}...")
                f.cultural_info = desc
                updated += 1
                
        db.commit()
        print(f"Successfully updated cultural_info for {updated} festivals.")
    finally:
        db.close()

if __name__ == '__main__':
    main()
