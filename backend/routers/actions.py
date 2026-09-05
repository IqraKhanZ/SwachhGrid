"""
actions.py — Community Hero Green  (MongoDB version)
Community sustainability actions.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from database import actions_col, users_col
from routers.auth_middleware import get_current_user

router = APIRouter()

ACTION_TYPES = [
    "Clean-up Drive", "Tree Plantation", "Recycling Campaign",
    "Waste Segregation Drive", "Water Conservation Initiative",
    "Anti-Plastic Campaign", "Community Garden",
    "Energy Conservation Drive", "Other",
]


def _s(d: dict) -> dict:
    d = dict(d)
    d.pop("_id", None)
    for k, v in d.items():
        if isinstance(v, datetime):
            d[k] = v.isoformat()
        elif isinstance(v, dict):
            d[k] = _s(v)
    return d


class ActionCreateRequest(BaseModel):
    title: str
    description: str
    action_type: str
    location: dict
    scheduled_date: Optional[str] = None
    max_participants: Optional[int] = 50


@router.post("/actions", status_code=201)
async def create_action(body: ActionCreateRequest, current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    now = datetime.now(timezone.utc)
    doc = {
        "id":               str(uuid.uuid4()),
        "title":            body.title,
        "description":      body.description,
        "action_type":      body.action_type,
        "location":         body.location,
        "scheduled_date":   body.scheduled_date,
        "max_participants": body.max_participants,
        "organiser":        uid,
        "participants":     [uid],
        "status":           "upcoming",
        "createdAt":        now,
        "updatedAt":        now,
    }
    actions_col().insert_one(doc)
    users_col().update_one({"id": uid}, {"$inc": {"ecoPoints": 20}})
    return _s(doc)


@router.get("/actions")
async def list_actions(status: Optional[str] = None, limit: int = 20):
    filt = {}
    if status:
        filt["status"] = status
    return [_s(d) for d in actions_col().find(filt, {"_id": 0}).sort("createdAt", -1).limit(limit)]


@router.get("/actions/{action_id}")
async def get_action(action_id: str):
    doc = actions_col().find_one({"id": action_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Action not found")
    return _s(doc)


@router.post("/actions/{action_id}/join")
async def join_action(action_id: str, current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    doc = actions_col().find_one({"id": action_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Action not found")
    participants = doc.get("participants", [])
    if uid in participants:
        actions_col().update_one({"id": action_id}, {"$pull": {"participants": uid}})
        return {"joined": False, "totalParticipants": len(participants) - 1}
    if len(participants) >= (doc.get("max_participants") or 50):
        raise HTTPException(status_code=400, detail="Action is full")
    actions_col().update_one({"id": action_id}, {"$addToSet": {"participants": uid}})
    users_col().update_one({"id": uid}, {"$inc": {"ecoPoints": 10}})
    return {"joined": True, "totalParticipants": len(participants) + 1}


@router.get("/action-types")
async def get_action_types():
    return ACTION_TYPES
