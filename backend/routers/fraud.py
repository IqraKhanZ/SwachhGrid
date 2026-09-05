"""
fraud.py — Community Hero Green  (MongoDB version)
Before/after environmental remediation verification.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone
from database import issues_col, notifications_col, users_col
from routers.auth_middleware import get_current_user
from services.ai_service import analyze_environmental_repair

router = APIRouter()


class AfterPhotoRequest(BaseModel):
    after_repair_url: str


@router.post("/issues/{issue_id}/after-photo")
async def submit_after_photo(issue_id: str, body: AfterPhotoRequest, current_user: dict = Depends(get_current_user)):
    if not issues_col().find_one({"id": issue_id}):
        raise HTTPException(status_code=404, detail="Issue not found")
    issues_col().update_one({"id": issue_id}, {"$set": {
        "afterRepairUrl": body.after_repair_url,
        "updatedAt": datetime.now(timezone.utc),
    }})
    return {"success": True, "message": "After photo saved. Use /verify-repair to run AI verification."}


@router.post("/issues/{issue_id}/verify-repair")
async def verify_repair(issue_id: str, current_user: dict = Depends(get_current_user)):
    issue = issues_col().find_one({"id": issue_id})
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    before_url = issue.get("beforeRepairUrl") or (issue.get("mediaUrls") or [None])[0]
    after_url  = issue.get("afterRepairUrl")
    if not before_url:
        raise HTTPException(status_code=400, detail="No before photo available")
    if not after_url:
        raise HTTPException(status_code=400, detail="No after photo uploaded yet")

    result  = analyze_environmental_repair(before_url, after_url)
    verdict = result.get("verdict", "SUSPICIOUS")
    uid     = current_user["id"]

    if verdict in ["SUSPICIOUS", "FAKE"]:
        issues_col().update_one({"id": issue_id}, {"$set": {
            "fraudFlagged":          True,
            "verificationVerdict":   verdict,
            "verificationAnalysis":  result,
            "status":                "open",
            "updatedAt":             datetime.now(timezone.utc),
        }})
        notifications_col().insert_one({
            "id": str(__import__("uuid").uuid4()),
            "userId":    issue.get("reportedBy"),
            "type":      "verification_failed",
            "issueId":   issue_id,
            "message":   "AI detected that the environmental issue may not have been genuinely resolved. It has been reopened.",
            "read":      False,
            "createdAt": datetime.now(timezone.utc),
        })
    else:
        issues_col().update_one({"id": issue_id}, {"$set": {
            "fraudFlagged":                    False,
            "verificationVerdict":             "GENUINE",
            "verificationAnalysis":            result,
            "environmentalImprovementScore":   result.get("environmental_improvement_score", 1.0),
            "updatedAt":                       datetime.now(timezone.utc),
        }})
        users_col().update_one({"id": uid}, {"$inc": {"ecoPoints": 25}})

    return {"verdict": verdict, "analysis": result}
