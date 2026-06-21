"""
Events sources configuration for Umbria festivals scraper.
Each entry defines a spider class and its target URL(s).
"""

SOURCES = [
    {
        "name": "umbriaeventi",
        "domain": "umbriaeventi.com",
        "start_urls": ["https://www.umbriaeventi.com/"],
        "description": "UmbriaEventi - portal for events in Umbria"
    },
    {
        "name": "staserasagra",
        "domain": "staserasagra.it",
        "start_urls": ["https://www.staserasagra.it/"],
        "description": "StaseRaSagra - portal for food festivals in Umbria"
    },
    {
        "name": "sagreumbre",
        "domain": "sagreumbre.it",
        "start_urls": ["https://www.sagreumbre.it/"],
        "description": "SagreUmbre - food festivals in Umbria"
    },
    {
        "name": "sagritaly",
        "domain": "sagritaly.com",
        "start_urls": ["https://sagritaly.com/regioni-sagre/umbria/"],
        "description": "SagriTaly - festivals and food events in Italy by region"
    },
]
