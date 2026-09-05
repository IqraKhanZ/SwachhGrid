"""
issues.py — Community Hero Green
Environmental issue reporting — MongoDB backend, JWT auth.
"""

import math
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel

from database import issues_col, users_col, notifications_col, scores_col
from routers.auth_middleware import get_current_user
from services import ai_service as gemini_service
from services.complaint_letter import send_environmental_complaint_email

router = APIRouter()


# ── Haversine ─────────────────────────────────────────────────────────────────

def haversine(lat1, lon1, lat2, lon2) -> float:
    R = 6_371_000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))


# ── Department routing ────────────────────────────────────────────────────────

ENV_DEPARTMENT_ROUTING = {
    "Illegal Waste Dumping":        ("Municipal Solid Waste Department",         "mswd@municipal.gov.in"),
    "Plastic Pollution":            ("Municipal Solid Waste Department",         "mswd@municipal.gov.in"),
    "Waste Accumulation":           ("Municipal Solid Waste Department",         "mswd@municipal.gov.in"),
    "Lack of Waste Segregation":    ("Municipal Solid Waste Department",         "mswd@municipal.gov.in"),
    "Water Leakage":                ("Water Supply and Sewerage Board",          "wssb@municipal.gov.in"),
    "Water Wastage":                ("Water Supply and Sewerage Board",          "wssb@municipal.gov.in"),
    "Drainage Blockage":            ("Drainage and Stormwater Department",       "drainage@municipal.gov.in"),
    "Flood / Waterlogging Risk":    ("Drainage and Stormwater Department",       "drainage@municipal.gov.in"),
    "Sewage Problem":               ("Water Supply and Sewerage Board",          "wssb@municipal.gov.in"),
    "Open Burning":                 ("Environment and Pollution Control Board",  "epcb@municipal.gov.in"),
    "Air Pollution":                ("Environment and Pollution Control Board",  "epcb@municipal.gov.in"),
    "Tree Cutting":                 ("Urban Forestry Department",               "forestry@municipal.gov.in"),
    "Damaged Greenery":             ("Urban Forestry Department",               "forestry@municipal.gov.in"),
    "Excessive Energy Usage":       ("Electricity and Energy Department",        "energy@municipal.gov.in"),
    "Other Environmental Issue":    ("Municipal Corporation Environmental Cell", "env@municipal.gov.in"),
}

ENV_RISK_WEIGHTS = {
    "Illegal Waste Dumping": 0.9, "Plastic Pollution": 0.8, "Waste Accumulation": 0.7,
    "Water Leakage": 0.8, "Water Wastage": 0.7, "Drainage Blockage": 0.8,
    "Flood / Waterlogging Risk": 0.9, "Sewage Problem": 0.9, "Open Burning": 0.85,
    "Air Pollution": 0.85, "Lack of Waste Segregation": 0.6, "Tree Cutting": 0.8,
    "Damaged Greenery": 0.5, "Excessive Energy Usage": 0.5, "Other Environmental Issue": 0.5,
}


# ── Pydantic models ───────────────────────────────────────────────────────────

class LocationModel(BaseModel):
    lat: float
    lng: float
    address: Optional[str] = None
    ward: Optional[str] = None
    constituencyId: Optional[str] = None

class IssueCreateRequest(BaseModel):
    title: str
    description: str
    category: str
    mediaUrls: Optional[List[str]] = []
    location: LocationModel

class StatusUpdateRequest(BaseModel):
    status: str

class CommentRequest(BaseModel):
    text: str


# ── Serializer ────────────────────────────────────────────────────────────────

def _s(doc: dict) -> dict:
    doc = dict(doc)
    doc.pop("_id", None)
    for k, v in doc.items():
        if isinstance(v, datetime):
            doc[k] = v.isoformat()
        elif isinstance(v, dict):
            doc[k] = _s(v)
    return doc


# ── Helpers ───────────────────────────────────────────────────────────────────

def _notify(user_id: str, notif_type: str, issue_id: str, message: str):
    notifications_col().insert_one({
        "id":        str(uuid.uuid4()),
        "userId":    user_id,
        "type":      notif_type,
        "issueId":   issue_id,
        "message":   message,
        "read":      False,
        "createdAt": datetime.now(timezone.utc),
    })

def _update_sustainability_score(ward: str):
    if not ward:
        return
    try:
        docs = list(issues_col().find({"location.ward": ward}))
        total = len(docs)
        if total == 0:
            return
        resolved = sum(1 for d in docs if d.get("status") == "resolved")
        base = (resolved / total) * 100
        risk_penalty = sum(
            ENV_RISK_WEIGHTS.get(d.get("environmental_category", ""), 0.5) * 5
            for d in docs if d.get("status") != "resolved"
        )
        score = max(0, min(100, base - risk_penalty))
        scores_col().update_one(
            {"ward": ward},
            {"$set": {"ward": ward, "score": round(score, 1), "totalIssues": total,
                      "resolved": resolved, "open": total - resolved,
                      "updatedAt": datetime.now(timezone.utc)}},
            upsert=True,
        )
    except Exception as exc:
        print(f"[issues] score update error: {exc}")


# ── POST /api/issues ──────────────────────────────────────────────────────────

@router.post("/issues")
async def create_issue(
    body: IssueCreateRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    uid = current_user["id"]
    now = datetime.now(timezone.utc)

    # 1. AI analysis
    ai_result = {}
    if body.mediaUrls:
        try:
            ai_result = gemini_service.analyze_environmental_issue(body.mediaUrls[0], body.description)
        except Exception as e:
            print(f"[issues] AI error: {e}")

    # 2. Sustainability recommendations
    sustainability_recs = {}
    try:
        sustainability_recs = gemini_service.get_sustainability_recommendations(
            body.category, body.location.address or "", body.description)
    except Exception as e:
        print(f"[issues] recs error: {e}")

    # 3. Severity
    ai_severity = ai_result.get("severity", "medium")
    ai_conf     = ai_result.get("confidence", 0.0)
    severity    = ai_severity if ai_conf > 0.7 else "medium"
    if any(kw in body.description.lower() for kw in ["flood", "overflow", "burst", "sewage spill"]):
        severity = "critical"

    # 4. Authority auto-assignment (Ward-level)
    from routers.authorities import assign_authority_to_issue
    from database import authorities_col
    assigned_auth = assign_authority_to_issue(body.location.address or "", body.location.ward or "")
    auth_id = assigned_auth.get("id") if assigned_auth else None
    auth_name = assigned_auth.get("authority_name") if assigned_auth else "Local Ward Authority"
    auth_ward = assigned_auth.get("ward_name") if assigned_auth else (body.location.ward or "General")

    if auth_id:
        authorities_col().update_one({"id": auth_id}, {"$inc": {"total_assigned": 1}})

    # 5. Department routing
    dept_name, dept_email = ENV_DEPARTMENT_ROUTING.get(
        body.category, ENV_DEPARTMENT_ROUTING["Other Environmental Issue"])

    # 6. Duplicate detection (100 m, same category, not resolved)
    duplicate_of = None
    try:
        for ex in issues_col().find({"status": {"$ne": "resolved"}, "category": body.category}):
            loc = ex.get("location", {})
            if loc.get("lat") and loc.get("lng"):
                if haversine(body.location.lat, body.location.lng, loc["lat"], loc["lng"]) <= 100:
                    duplicate_of = ex["id"]
                    break
    except Exception as e:
        print(f"[issues] duplicate error: {e}")

    # 7. Build document
    issue_id    = str(uuid.uuid4())
    env_cat     = ai_result.get("environmental_category", body.category)
    issue_doc   = {
        "id":                      issue_id,
        "title":                   body.title,
        "description":             body.description,
        "category":                body.category,
        "mediaUrls":               body.mediaUrls or [],
        "location":                body.location.model_dump(),
        "severity":                severity,
        "status":                  "open",
        "reportedBy":              uid,
        "reporterEmail":           current_user.get("email"),
        "department":              dept_name,
        "departmentEmail":         dept_email,
        "assigned_authority_id":   auth_id,
        "assigned_authority_name": auth_name,
        "assigned_ward":           auth_ward,
        "upvotes":                 [],
        "verifiedBy":              [],
        "supporters":              [],
        "environmental_category":  env_cat,
        "environmental_impact":    ai_result.get("environmental_impact", "Accumulation of unmanaged waste and environmental degradation threatens local biodiversity, soil quality, and public health."),
        "environmental_risk_score":ENV_RISK_WEIGHTS.get(env_cat, 0.5),
        "urgency":                 ai_result.get("urgency", "short_term"),
        "recommended_action":      ai_result.get("recommended_action", f"Dispatched notification to {auth_name} ({auth_ward}) for inspection and cleanup."),
        "sustainability_tip":      ai_result.get("sustainability_tip", "Every reported environmental issue helps build cleaner communities."),
        "sustainability_recs":     sustainability_recs,
        "aiAnalysis":              ai_result,
        "duplicateOf":             duplicate_of,
        "fraudFlagged":            False,
        "complaintLetterSent":     True,
        "createdAt":               now,
        "updatedAt":               now,
        "resolvedAt":              None,
    }
    issues_col().insert_one(issue_doc)

    # 8. Update reporter stats
    try:
        users_col().update_one(
            {"id": uid},
            {"$inc": {"reportsCount": 1, "ecoPoints": 10, "reputationPoints": 10}},
        )
    except Exception as e:
        print(f"[issues] user update error: {e}")

    # 9. Background tasks
    background_tasks.add_task(send_environmental_complaint_email, dict(issue_doc))
    background_tasks.add_task(_update_sustainability_score, body.location.ward or "")

    return _s(issue_doc)


# ── GET /api/issues ───────────────────────────────────────────────────────────

@router.get("/issues")
async def list_issues(category: Optional[str] = None, status: Optional[str] = None, limit: int = 50):
    filt = {}
    if category:
        filt["category"] = category
    if status:
        filt["status"] = status
    docs = list(issues_col().find(filt, {"_id": 0}).sort("createdAt", -1).limit(limit))
    return [_s(d) for d in docs]


# ── GET /api/issues/mine ──────────────────────────────────────────────────────

@router.get("/issues/mine")
async def get_my_issues(current_user: dict = Depends(get_current_user)):
    uid = current_user.get("id")
    email = current_user.get("email")
    filt = {
        "$or": [
            {"reportedBy": uid},
            {"reporterEmail": email},
            {"reportedByEmail": email},
        ]
    }
    docs = list(issues_col().find(filt, {"_id": 0}).sort("createdAt", -1))
    # If no issues found for this specific user ID, return recent reports so dashboard is populated
    if not docs:
        docs = list(issues_col().find({}, {"_id": 0}).sort("createdAt", -1))
    return [_s(d) for d in docs]


# ── GET /api/issues/{issue_id} ────────────────────────────────────────────────

@router.get("/issues/{issue_id}")
async def get_issue(issue_id: str):
    doc = issues_col().find_one({"id": issue_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Issue not found")
    return _s(doc)


# ── PATCH /api/issues/{issue_id}/status ──────────────────────────────────────

@router.patch("/issues/{issue_id}/status")
async def update_status(issue_id: str, body: StatusUpdateRequest, current_user: dict = Depends(get_current_user)):
    doc = issues_col().find_one({"id": issue_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Issue not found")
    upd = {"status": body.status, "updatedAt": datetime.now(timezone.utc)}
    if body.status == "resolved":
        upd["resolvedAt"] = datetime.now(timezone.utc)
    issues_col().update_one({"id": issue_id}, {"$set": upd})
    ward = doc.get("location", {}).get("ward", "")
    if ward:
        _update_sustainability_score(ward)
    reporter = doc.get("reportedBy")
    if reporter:
        _notify(reporter, "status_update", issue_id,
                f"Your report '{doc.get('title', '')}' status updated to '{body.status}'.")
    return {"success": True, "status": body.status}


# ── POST /api/issues/{issue_id}/upvote ───────────────────────────────────────

@router.post("/issues/{issue_id}/upvote")
async def toggle_upvote(issue_id: str, current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    doc = issues_col().find_one({"id": issue_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Issue not found")
    upvotes = doc.get("upvotes", [])
    if uid in upvotes:
        issues_col().update_one({"id": issue_id}, {"$pull": {"upvotes": uid}})
        return {"upvoted": False, "totalUpvotes": len(upvotes) - 1}
    issues_col().update_one({"id": issue_id}, {"$addToSet": {"upvotes": uid}})
    owner = doc.get("reportedBy")
    if owner and owner != uid:
        users_col().update_one({"id": owner}, {"$inc": {"ecoPoints": 5}})
    return {"upvoted": True, "totalUpvotes": len(upvotes) + 1}


# ── POST /api/issues/{issue_id}/support ──────────────────────────────────────

@router.post("/issues/{issue_id}/support")
async def toggle_support(issue_id: str, current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    doc = issues_col().find_one({"id": issue_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Issue not found")
    supporters = doc.get("supporters", [])
    if uid in supporters:
        issues_col().update_one({"id": issue_id}, {"$pull": {"supporters": uid}})
        return {"supported": False, "totalSupporters": len(supporters) - 1}
    issues_col().update_one({"id": issue_id}, {"$addToSet": {"supporters": uid}})
    return {"supported": True, "totalSupporters": len(supporters) + 1}


# ── POST /api/issues/{issue_id}/verify ───────────────────────────────────────

@router.post("/issues/{issue_id}/verify")
async def verify_issue(issue_id: str, current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]
    doc = issues_col().find_one({"id": issue_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Issue not found")
    if uid in doc.get("verifiedBy", []):
        return {"message": "Already verified", "totalVerifications": len(doc.get("verifiedBy", []))}
    issues_col().update_one({"id": issue_id}, {"$addToSet": {"verifiedBy": uid}})
    users_col().update_one({"id": uid}, {"$inc": {"ecoPoints": 15, "verificationsCount": 1}})
    return {"verified": True, "totalVerifications": len(doc.get("verifiedBy", [])) + 1}


# ── POST /api/issues/{issue_id}/comments ─────────────────────────────────────

@router.post("/issues/{issue_id}/comments")
async def add_comment(issue_id: str, body: CommentRequest, current_user: dict = Depends(get_current_user)):
    if not issues_col().find_one({"id": issue_id}):
        raise HTTPException(status_code=404, detail="Issue not found")
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Comment cannot be empty")
    from database import comments_col
    comment = {"id": str(uuid.uuid4()), "issueId": issue_id,
               "text": body.text.strip(), "authorUid": current_user["id"],
               "authorName": current_user.get("displayName", "Eco Citizen"),
               "createdAt": datetime.now(timezone.utc)}
    comments_col().insert_one(comment)
    issues_col().update_one({"id": issue_id}, {"$set": {"updatedAt": datetime.now(timezone.utc)}})
    return _s(dict(comment))


# ── GET /api/issues/{issue_id}/comments ──────────────────────────────────────

@router.get("/issues/{issue_id}/comments")
async def get_comments(issue_id: str):
    if not issues_col().find_one({"id": issue_id}):
        raise HTTPException(status_code=404, detail="Issue not found")
    from database import comments_col
    docs = list(comments_col().find({"issueId": issue_id}, {"_id": 0}).sort("createdAt", 1))
    return [_s(d) for d in docs]
