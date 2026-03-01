from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from app.routes.router import router as chat_router

app = FastAPI(
    title="Guarded Chat Engine",
    description="Minimal chatbot backend using OpenRouter API",
    version="1.0.0"
)

# Include your chat router
app.include_router(chat_router, prefix="/chat", tags=["Chat"])
app.mount("/static", StaticFiles(directory="app/static"), name="static")


@app.get("/", include_in_schema=False)
def root():
    return FileResponse("app/static/index.html")
