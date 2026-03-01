# app/services/llmservices.py

from typing import List
import os
from openai import OpenAI
from app.schemas.chat_schema import Message, ChatResponse
from dotenv import load_dotenv, find_dotenv

# Load .env file
# Load app/.env (or nearest .env)
load_dotenv("/home/aranea/Desktop/guarded-chat-engine/app/.env")


# Configure OpenRouter
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"



def generate_chat_response(
    messages: List[Message],
    system_prompt: str,
    model: str = "arcee-ai/trinity-large-preview:free",
) -> str:
    """
    Generate response from OpenRouter LLM.

    messages: List of Message objects (conversation)
    system_prompt: Template text (task_spec/tool_call/refusal)
    model: OpenRouter model name (default is free model)
    """
    # Compose payload: system + conversation messages
    payload = [{"role": "system", "content": system_prompt}]
    payload += [{"role": msg.role, "content": msg.content} for msg in messages]
    
    api_key = os.getenv("OPENROUTER_API_KEY") or os.getenv(
        "OPEN_ROUTE_API_KEY")
    if not api_key:
        return "OpenRouter API error: OPENROUTER_API_KEY is not set"


    try:
        client = OpenAI(
            base_url=OPENROUTER_BASE_URL,
            api_key=api_key,
        )

        response = client.chat.completions.create(
            model=model,
            messages=payload,
            temperature=0.7,
        )

        return response.choices[0].message.content or ""
    except Exception as e:
        return f"OpenRouter API error: {e}"
