"""
jobs.py — Community Hero Green  (MongoDB version)
"""

from fastapi import APIRouter, Header, HTTPException
import os
from services.predictions import run_environmental_prediction_pipeline
from database import issues_col, scores_col
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()


def _verify(x_job_secret: str = Header(None)):
    expected = os.getenv("JOB_SECRET_TOKEN", "")
    if not expected or x_job_secret != expected:
        raise HTTPException(status_code=403, detail="Invalid job secret token")


@router.post("/jobs/run-env-predictions")
async def run_env_predictions(x_job_secret: str = Header(None)):
    _verify(x_job_secret)
    results = run_environmental_prediction_pipeline()
    return {"success": True, "predictions_created": len(results)}


@router.post("/jobs/recalculate-scores")
async def recalculate_scores(x_job_secret: str = Header(None)):
    _verify(x_job_secret)
    wards = set()
    for doc in issues_col().find({}, {"location.ward": 1}):
        w = doc.get("location", {}).get("ward", "")
        if w:
            wards.add(w)
    results = []
    for ward in wards:
        docs    = list(issues_col().find({"location.ward": ward}))
        total   = len(docs)
        resolved = sum(1 for d in docs if d.get("status") == "resolved")
        score   = (resolved / total * 100) if total else 100
        scores_col().update_one(
            {"ward": ward},
            {"$set": {"ward": ward, "score": round(score, 1), "totalIssues": total,
                      "resolved": resolved, "open": total - resolved,
                      "updatedAt": datetime.now(timezone.utc)}},
            upsert=True,
        )
        results.append({"ward": ward, "score": score})
    return {"success": True, "updated": len(results), "results": results}
