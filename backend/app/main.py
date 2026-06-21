from fastapi import FastAPI
from app.api.endpoints import router
from app.core.database import Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Umbria Festivals API")
app.include_router(router)