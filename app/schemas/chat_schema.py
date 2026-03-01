from typing import List, Optional
from pydantic import BaseModel
from typing import List, Literal

# Message schema


class Message(BaseModel):
    role: Literal["user", "assistant", "system"]  # restricts to these values
    content: str

# Chat request schema


class ChatRequest(BaseModel):
    messages: List[Message]
    template: Optional[str] = "task_spec"   # default template
    temperature: Optional[float] = 0.7      # default temperature

# Chat response schema


class ChatResponse(BaseModel):
    reply: str
    template_used: str
    refusal: bool
