"""
Agente Generatore di Descrizioni Organiche focalizzate esclusivamente sull'Evento.
Genera testi avvincenti ed evocativi dedicati allo spirito della festa,
alle tradizioni comunitarie, all'atmosfera e all'intrattenimento dell'evento.
"""

import random
from typing import Optional

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
