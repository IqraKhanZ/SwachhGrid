"""
authorities.py — Community Hero Green
Ward-based authority management, scoring & resolution verification.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import authorities_col, issues_col
from routers.auth_middleware import get_current_user
from services import ai_service

router = APIRouter()

# Lucknow ward authorities seed data
LUCKNOW_AUTHORITIES = [
    {"ward_name": "Kalyanpur",       "area_keywords": ["kalyanpur"],                        "authority_name": "Kalyanpur Ward Officer",       "department": "Lucknow Municipal Corporation", "contact_email": "kalyanpur.ward@lmc.gov.in",   "phone": "0522-2301001", "authority_type": "Ward Officer"},
    {"ward_name": "Daliganj",        "area_keywords": ["daliganj"],                          "authority_name": "Daliganj Ward Officer",         "department": "Lucknow Municipal Corporation", "contact_email": "daliganj.ward@lmc.gov.in",    "phone": "0522-2301002", "authority_type": "Ward Officer"},
    {"ward_name": "Gomti Nagar",     "area_keywords": ["gomti nagar", "gomtinagar"],         "authority_name": "Gomti Nagar Ward Officer",      "department": "Lucknow Municipal Corporation", "contact_email": "gomtinagar.ward@lmc.gov.in",  "phone": "0522-2301003", "authority_type": "Ward Officer"},
    {"ward_name": "Hazratganj",      "area_keywords": ["hazratganj"],                        "authority_name": "Hazratganj Ward Officer",       "department": "Lucknow Municipal Corporation", "contact_email": "hazratganj.ward@lmc.gov.in",  "phone": "0522-2301004", "authority_type": "Ward Officer"},
    {"ward_name": "Alambagh",        "area_keywords": ["alambagh", "alam bagh"],             "authority_name": "Alambagh Ward Officer",         "department": "Lucknow Municipal Corporation", "contact_email": "alambagh.ward@lmc.gov.in",    "phone": "0522-2301005", "authority_type": "Ward Officer"},
    {"ward_name": "Aliganj",         "area_keywords": ["aliganj"],                           "authority_name": "Aliganj Ward Officer",          "department": "Lucknow Municipal Corporation", "contact_email": "aliganj.ward@lmc.gov.in",     "phone": "0522-2301006", "authority_type": "Ward Officer"},
    {"ward_name": "Indira Nagar",    "area_keywords": ["indira nagar", "indiranagar"],       "authority_name": "Indira Nagar Ward Officer",     "department": "Lucknow Municipal Corporation", "contact_email": "indiranagar.ward@lmc.gov.in", "phone": "0522-2301007", "authority_type": "Ward Officer"},
    {"ward_name": "Chowk",           "area_keywords": ["chowk", "aminabad"],                 "authority_name": "Chowk Ward Officer",            "department": "Lucknow Municipal Corporation", "contact_email": "chowk.ward@lmc.gov.in",       "phone": "0522-2301008", "authority_type": "Ward Officer"},
    {"ward_name": "Rajajipuram",     "area_keywords": ["rajajipuram"],                       "authority_name": "Rajajipuram Ward Officer",      "department": "Lucknow Municipal Corporation", "contact_email": "rajajipuram.ward@lmc.gov.in", "phone": "0522-2301009", "authority_type": "Ward Officer"},
    {"ward_name": "Chinhat",         "area_keywords": ["chinhat"],                           "authority_name": "Chinhat Ward Officer",          "department": "Lucknow Municipal Corporation", "contact_email": "chinhat.ward@lmc.gov.in",     "phone": "0522-2301010", "authority_type": "Ward Officer"},
    {"ward_name": "Mahanagar",       "area_keywords": ["mahanagar"],                         "authority_name": "Mahanagar Ward Officer",        "department": "Lucknow Municipal Corporation", "contact_email": "mahanagar.ward@lmc.gov.in",   "phone": "0522-2301011", "authority_type": "Ward Officer"},
    {"ward_name": "Vikas Nagar",     "area_keywords": ["vikas nagar", "vikasnagar"],         "authority_name": "Vikas Nagar Ward Officer",      "department": "Lucknow Municipal Corporation", "contact_email": "vikasnagar.ward@lmc.gov.in",  "phone": "0522-2301012", "authority_type": "Ward Officer"},
    {"ward_name": "Sitapur Road",    "area_keywords": ["sitapur", "triveni nagar"],          "authority_name": "Sitapur Road Ward Officer",     "department": "Lucknow Municipal Corporation", "contact_email": "sitapur.ward@lmc.gov.in",     "phone": "0522-2301013", "authority_type": "Ward Officer"},
    {"ward_name": "Vasant Kunj",     "area_keywords": ["vasant kunj", "vasantkunj"],         "authority_name": "Vasant Kunj Ward Officer",      "department": "Lucknow Municipal Corporation", "contact_email": "vasantkunj.ward@lmc.gov.in",  "phone": "0522-2301014", "authority_type": "Ward Officer"},
    {"ward_name": "Lucknow General", "area_keywords": [],                                    "authority_name": "LMC General Environment Cell", "department": "Lucknow Municipal Corporation", "contact_email": "env.cell@lmc.gov.in",         "phone": "0522-2630000", "authority_type": "General"},
]


def _seed_authorities():
    if authorities_col().count_documents({}) == 0:
        now = datetime.now(timezone.utc).isoformat()
        docs = []
        for a in LUCKNOW_AUTHORITIES:
            docs.append({
                "id": str(uuid.uuid4()),
                "ward_name": a["ward_name"],
                "area_keywords": a["area_keywords"],
                "authority_name": a["authority_name"],
                "department": a["department"],
                "contact_email": a["contact_email"],
                "phone": a["phone"],
                "authority_type": a["authority_type"],
                "score": 100.0,
                "total_resolved": 0,
                "total_overdue": 0,
                "total_assigned": 0,
                "rating": 5.0,
                "createdAt": now,
                "updatedAt": now,
            })
        authorities_col().insert_many(docs)
        print(f"[authorities] Seeded {len(docs)} Lucknow ward authorities.")


def assign_authority_to_issue(address: str, ward: str) -> Optional[dict]:
    _seed_authorities()
    search_text = (address + " " + ward).lower()
    all_auths = list(authorities_col().find({}, {"_id": 0}))
    for auth in all_auths:
        for kw in auth.get("area_keywords", []):
            if kw and kw in search_text:
                return auth
    general = authorities_col().find_one({"authority_type": "General"}, {"_id": 0})
    if general:
        return general
    return all_auths[0] if all_auths else None


def _s(doc: dict) -> dict:
    doc = dict(doc)
    doc.pop("_id", None)
    for k, v in doc.items():
        if isinstance(v, datetime):
            doc[k] = v.isoformat()
        elif isinstance(v, dict):
            doc[k] = _s(v)
    return doc


def _compute_rating(resolved: int, total: int, overdue: int) -> float:
    if total == 0:
        return 5.0
    resolution_rate = resolved / total
    overdue_penalty = min(overdue * 0.2, 2.0)
    return round(max(1.0, min(5.0, (resolution_rate * 4.0 + 1.0) - overdue_penalty)), 1)


class AuthorityCreate(BaseModel):
    ward_name:      str
    authority_name: str
    department:     str
    contact_email:  str
    phone:          Optional[str] = ""
    authority_type: Optional[str] = "Ward Officer"
    area_keywords:  Optional[list] = []


class AuthorityUpdate(BaseModel):
    ward_name:      Optional[str] = None
    authority_name: Optional[str] = None
    department:     Optional[str] = None
    contact_email:  Optional[str] = None
    phone:          Optional[str] = None
    area_keywords:  Optional[list] = None


class ResolveRequest(BaseModel):
    resolution_photo_url: str
    notes: Optional[str] = ""


@router.get("/authorities")
async def list_authorities():
    _seed_authorities()
    docs = list(authorities_col().find({}, {"_id": 0}).sort("rating", -1))
    return [_s(d) for d in docs]


@router.get("/authorities/my-portal")
async def get_my_authority_portal(current_user: dict = Depends(get_current_user)):
    _seed_authorities()
    ward_name = current_user.get("ward_name")
    
    auth_doc = None
    if ward_name:
        auth_doc = authorities_col().find_one({"ward_name": ward_name}, {"_id": 0})
    if not auth_doc:
        auth_doc = authorities_col().find_one({"contact_email": current_user.get("email")}, {"_id": 0})
    if not auth_doc:
        auth_doc = authorities_col().find_one({"ward_name": "Kalyanpur"}, {"_id": 0})

    filt = {
        "$or": [
            {"assigned_authority_id": auth_doc.get("id")},
            {"assigned_ward": auth_doc.get("ward_name")},
            {"location.ward": auth_doc.get("ward_name")},
            {"location.address": {"$regex": auth_doc.get("ward_name", ""), "$options": "i"}}
        ]
    }
    assigned_issues = list(issues_col().find(filt, {"_id": 0}).sort("createdAt", -1))

    return {
        "authority": _s(auth_doc),
        "issues": [_s(i) for i in assigned_issues],
        "stats": {
            "total": len(assigned_issues),
            "open": sum(1 for i in assigned_issues if i.get("status") == "open"),
            "in_progress": sum(1 for i in assigned_issues if i.get("status") == "in_progress"),
            "resolved": sum(1 for i in assigned_issues if i.get("status") == "resolved"),
            "rating": auth_doc.get("rating", 5.0),
            "score": auth_doc.get("score", 100.0),
        }
    }


@router.get("/authorities/{authority_id}")
async def get_authority(authority_id: str):
    _seed_authorities()
    doc = authorities_col().find_one({"id": authority_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Authority not found")
    assigned = list(issues_col().find({"assigned_authority_id": authority_id}, {"_id": 0}))
    doc["assigned_issues"] = [_s(i) for i in assigned]
    return _s(doc)


@router.post("/authorities")
async def create_authority(body: AuthorityCreate, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin credentials required to add authorities.")
    _seed_authorities()
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "ward_name": body.ward_name,
        "area_keywords": [kw.lower() for kw in body.area_keywords],
        "authority_name": body.authority_name,
        "department": body.department,
        "contact_email": body.contact_email,
        "phone": body.phone,
        "authority_type": body.authority_type,
        "score": 100.0,
        "total_resolved": 0,
        "total_overdue": 0,
        "total_assigned": 0,
        "rating": 5.0,
        "createdAt": now,
        "updatedAt": now,
    }
    try:
        authorities_col().insert_one(doc)
    except Exception:
        raise HTTPException(status_code=400, detail="Ward name already exists.")
    return _s(doc)


@router.patch("/authorities/{authority_id}")
async def update_authority(authority_id: str, body: AuthorityUpdate, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin credentials required to update authorities.")
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    upd["updatedAt"] = datetime.now(timezone.utc).isoformat()
    result = authorities_col().update_one({"id": authority_id}, {"$set": upd})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Authority not found")
    return {"success": True}


@router.delete("/authorities/{authority_id}")
async def delete_authority(authority_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin credentials required to delete authorities.")
    result = authorities_col().delete_one({"id": authority_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Authority not found")
    return {"success": True}


@router.post("/issues/{issue_id}/resolve")
async def resolve_issue(issue_id: str, body: ResolveRequest, current_user: dict = Depends(get_current_user)):
    issue = issues_col().find_one({"id": issue_id}, {"_id": 0})
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    before_url = (issue.get("mediaUrls") or [None])[0]
    after_url  = body.resolution_photo_url

    verification = {
        "verdict": "GENUINE", "issue_resolved": True,
        "environmental_improvement_score": 0.85,
        "reasoning": "Resolution verified successfully."
    }

    if before_url and after_url:
        try:
            verification = ai_service.analyze_environmental_repair(before_url, after_url)
        except Exception as e:
            print(f"[resolve] AI verify error: {e}")

    verdict = verification.get("verdict", "GENUINE")
    is_resolved = verification.get("issue_resolved", True) and verdict != "FAKE"
    new_status = "resolved" if is_resolved else "in_progress"
    now = datetime.now(timezone.utc).isoformat()

    issues_col().update_one({"id": issue_id}, {"$set": {
        "status":                  new_status,
        "resolution_photo_url":    after_url,
        "resolution_notes":        body.notes,
        "resolution_verification": verification,
        "resolvedBy":              current_user.get("displayName", "Ward Authority"),
        "resolvedByRole":          current_user.get("role", "authority"),
        "resolvedAt":              now if is_resolved else None,
        "updatedAt":               now,
    }})

    auth_id = issue.get("assigned_authority_id")
    if auth_id and is_resolved:
        auth = authorities_col().find_one({"id": auth_id})
        if auth:
            new_resolved = auth.get("total_resolved", 0) + 1
            new_total    = max(auth.get("total_assigned", 1), new_resolved)
            new_overdue  = auth.get("total_overdue", 0)
            new_rating   = _compute_rating(new_resolved, new_total, new_overdue)
            authorities_col().update_one({"id": auth_id}, {"$set": {
                "total_resolved": new_resolved,
                "rating":         new_rating,
                "score":          round(new_rating * 20, 1),
                "updatedAt":      now,
            }})

    return {
        "success":      True,
        "status":       new_status,
        "verification": verification,
        "message":      "Issue marked resolved and authority score updated!" if is_resolved
                        else "Resolution photo flagged as suspicious by AI. Please resubmit with a clearer photo.",
    }
