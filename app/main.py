# main.py

from fastapi import FastAPI
from app.routes.router import router as chat_router

app = FastAPI(
    title="Guarded Chat Engine",
    description="Minimal chatbot backend using OpenRouter API",
    version="1.0.0"
)

# Include your chat router
app.include_router(chat_router, prefix="/chat", tags=["Chat"])
