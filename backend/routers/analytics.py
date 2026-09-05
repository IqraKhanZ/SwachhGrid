"""
analytics.py — Community Hero Green  (MongoDB version)
"""

from fastapi import APIRouter, Depends
from database import issues_col, scores_col, predictions_col, actions_col, notifications_col
from routers.auth_middleware import get_current_user
from datetime import datetime, timezone, timedelta

router = APIRouter()


def _s(d: dict) -> dict:
    d = dict(d)
    d.pop("_id", None)
    for k, v in d.items():
        if isinstance(v, datetime):
            d[k] = v.isoformat()
        elif isinstance(v, dict):
            d[k] = _s(v)
    return d


@router.get("/analytics")
async def get_analytics():
    all_issues = list(issues_col().find({}, {"_id": 0}))
    now        = datetime.now(timezone.utc)
    week_ago   = now - timedelta(days=7)

    total_open, resolved_this_week = 0, 0
    resolution_times = []
    env_cat_counts, status_counts, severity_counts, area_counts, daily_counts = {}, {}, {}, {}, {}
    status_counts = {"open": 0, "in_progress": 0, "resolved": 0, "duplicate": 0}
    severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}

    for issue in all_issues:
        st       = issue.get("status", "open")
        env_cat  = issue.get("environmental_category", issue.get("category", "Other"))
        sev      = issue.get("severity", "medium")
        created  = issue.get("createdAt")
        ward     = issue.get("location", {}).get("ward", "Unknown")

        if st != "resolved":
            total_open += 1
        if st == "resolved":
            resolved_at = issue.get("resolvedAt")
            if resolved_at and created:
                try:
                    resolution_times.append((resolved_at - created).total_seconds() / 3600)
                except Exception:
                    pass
            if resolved_at and isinstance(resolved_at, datetime) and resolved_at >= week_ago:
                resolved_this_week += 1

        status_counts[st]   = status_counts.get(st, 0) + 1
        severity_counts[sev] = severity_counts.get(sev, 0) + 1
        env_cat_counts[env_cat] = env_cat_counts.get(env_cat, 0) + 1
        area_counts[ward]   = area_counts.get(ward, 0) + 1

        if isinstance(created, datetime):
            dk = created.strftime("%Y-%m-%d")
            daily_counts[dk] = daily_counts.get(dk, 0) + 1

    avg_resolution  = sum(resolution_times) / len(resolution_times) if resolution_times else 0
    most_reported   = max(env_cat_counts, key=env_cat_counts.get) if env_cat_counts else "N/A"
    top_areas       = sorted(area_counts.items(), key=lambda x: x[1], reverse=True)[:5]

    daily_series = [
        {"date": (now - timedelta(days=i)).strftime("%Y-%m-%d"),
         "count": daily_counts.get((now - timedelta(days=i)).strftime("%Y-%m-%d"), 0)}
        for i in range(29, -1, -1)
    ]

    predictions = [_s(d) for d in predictions_col().find({}, {"_id": 0}).sort("riskScore", -1).limit(10)]
    sustainability_scores = [_s(d) for d in scores_col().find({}, {"_id": 0}).sort("score", -1).limit(10)]
    recent_actions = [_s(d) for d in actions_col().find({}, {"_id": 0}).sort("createdAt", -1).limit(5)]
    fraud_issues   = [_s(d) for d in issues_col().find({"fraudFlagged": True}, {"_id": 0})]

    return {
        "totalOpen":            total_open,
        "resolvedThisWeek":     resolved_this_week,
        "avgResolutionHours":   round(avg_resolution, 1),
        "mostReportedCategory": most_reported,
        "totalIssues":          len(all_issues),
        "categoryBreakdown":    [{"category": k, "count": v} for k, v in env_cat_counts.items()],
        "statusBreakdown":      [{"status": k, "count": v} for k, v in status_counts.items() if v > 0],
        "severityBreakdown":    [{"severity": k, "count": v} for k, v in severity_counts.items()],
        "dailySeries":          daily_series,
        "topAreas":             [{"area": k, "count": v} for k, v in top_areas],
        "predictions":          predictions,
        "sustainabilityScores": sustainability_scores,
        "recentActions":        recent_actions,
        "verificationAlerts":   fraud_issues,
    }


@router.get("/sustainability-scores")
async def get_scores():
    return [_s(d) for d in scores_col().find({}, {"_id": 0}).sort("score", -1)]


@router.get("/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    docs = list(notifications_col().find(
        {"userId": current_user["id"]}, {"_id": 0}
    ).sort("createdAt", -1).limit(30))
    return [_s(d) for d in docs]
