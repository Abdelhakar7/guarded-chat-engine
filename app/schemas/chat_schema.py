from pydantic import BaseModel
from typing import List, Literal

# Message schema


class Message(BaseModel):
    role: Literal["user", "assistant", "system"]  # restricts to these values
    content: str

# Chat request schema


class ChatRequest(BaseModel):
    messages: List[Message]  # note: singular 'Message', not 'Messages'

# Chat response schema


class ChatResponse(BaseModel):
    reply: str
    template_used: str
    refusal: bool
