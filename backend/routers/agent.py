"""
agent.py — Community Hero Green  (MongoDB version)
EcoBot sustainability assistant — JWT auth, MongoDB lookups.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
from database import issues_col, scores_col
from routers.auth_middleware import get_current_user
from services.ai_service import ecobot_chat

router = APIRouter()


class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    user_location: Optional[dict] = None
    current_page:  Optional[str]  = None


@router.post("/agent/chat")
async def chat(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    uid          = current_user["id"]
    last_message = request.messages[-1].content.lower() if request.messages else ""
    user_context = {"uid": uid, "page": request.current_page, "location": request.user_location}

    if any(kw in last_message for kw in ["check my issues", "my reports", "meri report"]):
        docs = list(issues_col().find({"reportedBy": uid}).sort("createdAt", -1).limit(5))
        summary = "\n".join([f"- {d.get('title','N/A')}: {d.get('status','N/A')} ({d.get('environmental_category','N/A')})" for d in docs])
        user_context["user_issues_summary"] = summary or "No environmental reports found."

    if any(kw in last_message for kw in ["near me", "nearby", "paas"]) and request.user_location:
        user_context["nearby_hint"] = (
            f"User is at lat={request.user_location.get('lat')}, lng={request.user_location.get('lng')}. "
            "They can view nearby issues on the environmental map at /map."
        )

    if any(kw in last_message for kw in ["sustainability score", "community score"]):
        try:
            top = list(scores_col().find({}, {"_id": 0}).sort("score", -1).limit(3))
            user_context["sustainability_score"] = ", ".join([f"{s.get('ward','?')}: {s.get('score',0)}" for s in top])
        except Exception:
            pass

    messages = [{"role": m.role, "content": m.content} for m in request.messages]
    response  = ecobot_chat(messages, user_context)
    return {"response": response, "timestamp": datetime.now(timezone.utc).isoformat()}
