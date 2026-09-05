"""
seed_data.py — Community Hero Green
Seeds real-world environmental issues (fetched from OpenStreetMap / CPCB), community actions, ward scores, and demo accounts for Lucknow.
"""

import json
import os
import uuid
from datetime import datetime, timezone, timedelta
from database import issues_col, actions_col, authorities_col, scores_col, users_col
from routers.authorities import assign_authority_to_issue, _seed_authorities
from routers.auth import seed_demo_accounts

LUCKNOW_COMMUNITY_ACTIONS = [
    {
        "title": "Gomti Riverfront Mega Clean-up & Plastic Drive",
        "description": "Join 50+ eco-citizens to clean up single-use plastics along the Gomti riverbank and install bio-waste collection nets.",
        "action_type": "Clean-up Drive",
        "scheduled_date": "2026-09-12",
        "location": {
            "address": "Gomti Riverfront Park, 1090 Chauraha, Lucknow, UP",
            "lat": 26.8521,
            "lng": 80.9545,
            "ward": "Gomti Nagar"
        },
        "max_participants": 60,
        "participants": ["admin-demo-id", "citizen-demo-id", "authority-kalyanpur-id"],
        "status": "upcoming"
    },
    {
        "title": "Kukrail Reserve Urban Tree Plantation (500 Saplings)",
        "description": "Community afforestation drive planting native Peepal, Neem, Jamun, and Banyan saplings to expand city green canopy.",
        "action_type": "Tree Plantation",
        "scheduled_date": "2026-09-18",
        "location": {
            "address": "Kukrail Forest Reserve Gate 2, Lucknow, UP",
            "lat": 26.9123,
            "lng": 80.9832,
            "ward": "Indira Nagar"
        },
        "max_participants": 100,
        "participants": ["citizen-demo-id"],
        "status": "upcoming"
    },
    {
        "title": "Door-to-Door Zero-Waste Segregation Workshop",
        "description": "Educating 200 households in Kalyanpur on 3-way waste segregation (wet compost, dry plastic, hazardous electronic).",
        "action_type": "Waste Segregation Drive",
        "scheduled_date": "2026-09-15",
        "location": {
            "address": "Community Hall, Kalyanpur, Lucknow, UP",
            "lat": 26.9011,
            "lng": 80.9482,
            "ward": "Kalyanpur"
        },
        "max_participants": 40,
        "participants": ["authority-kalyanpur-id", "citizen-demo-id"],
        "status": "upcoming"
    }
]


def seed_all():
    print("[seed] Seeding demo accounts and authorities...")
    _seed_authorities()
    seed_demo_accounts()

    # Ensure any existing user without a role gets 'citizen' role by default
    users_col().update_many({"role": {"$in": [None, ""]}}, {"$set": {"role": "citizen"}})

    cache_path = os.path.join(os.path.dirname(__file__), "real_data_cache.json")
    if not os.path.exists(cache_path):
        print("[seed] real_data_cache.json not found! Running fetch_real_data.py first...")
        from fetch_real_data import fetch_all_real_data
        real_issues = fetch_all_real_data()
    else:
        with open(cache_path, "r", encoding="utf-8") as f:
            real_issues = json.load(f)

    # Clear previous seed issues and actions
    issues_col().delete_many({})
    actions_col().delete_many({})

    now = datetime.now(timezone.utc)

    # 1. Insert Real Issues fetched from OSM / CPCB
    seeded_count = 0
    for idx, item in enumerate(real_issues):
        issue_id = str(uuid.uuid4())
        hours_ago = item.get("hours_ago", idx * 3 + 1)
        created_time = (now - timedelta(hours=hours_ago)).isoformat()
        
        ward_name = item["location"].get("ward", "Lucknow General")
        address = item["location"].get("address", "Lucknow, Uttar Pradesh")
        auth = assign_authority_to_issue(address, ward_name)

        doc = {
            "id": issue_id,
            "title": item["title"],
            "description": item["description"],
            "category": item["category"],
            "environmental_category": item.get("environmental_category", item["category"]),
            "severity": item.get("severity", "medium"),
            "status": item.get("status", "open"),
            "location": item["location"],
            "mediaUrls": item.get("mediaUrls", []),
            "reportedBy": "000717c5-84d7-49b6-ac25-81800beeee2c",
            "reporterEmail": "iqrakhan30oct@gmail.com",
            "assigned_authority_id": auth.get("id") if auth else None,
            "assigned_authority_name": auth.get("authority_name") if auth else "Lucknow Ward Officer",
            "assigned_ward": auth.get("ward_name") if auth else ward_name,
            "department": auth.get("department") if auth else "Lucknow Municipal Corporation",
            "departmentEmail": auth.get("contact_email") if auth else "env.cell@lmc.gov.in",
            "upvotes": [f"user-up-{i}" for i in range(item.get("upvotes_count", 8))],
            "verifiedBy": [f"user-ver-{i}" for i in range(3)],
            "supporters": [f"user-sup-{i}" for i in range(item.get("supporters_count", 5))],
            "environmental_impact": item.get("environmental_impact", "Significant environmental risk requiring local authority attention."),
            "environmental_risk_score": 0.88 if item.get("severity") == "critical" else 0.65,
            "urgency": "immediate" if item.get("severity") == "critical" else "short_term",
            "recommended_action": item.get("recommended_action", "LMC Ward Officer inspection and site remediation."),
            "sustainability_tip": item.get("sustainability_tip", "Segregate dry and wet waste at source."),
            "resolution_photo_url": item.get("resolution_photo_url"),
            "resolution_notes": item.get("resolution_notes"),
            "resolution_verification": {
                "verdict": "GENUINE",
                "issue_resolved": True,
                "environmental_improvement_score": 0.94,
                "reasoning": "Post-remediation photo verified genuine by AI vision."
            } if item.get("resolution_photo_url") else None,
            "aiAnalysis": {
                "detected_issue": item["title"],
                "environmental_category": item.get("environmental_category", item["category"]),
                "severity": item.get("severity", "medium"),
                "confidence": 0.93,
                "reasoning": f"Identified environmental hazard tagged from {item.get('source', 'OpenStreetMap')}."
            },
            "complaintLetterSent": True,
            "createdAt": created_time,
            "updatedAt": created_time,
            "resolvedAt": created_time if item.get("status") == "resolved" else None,
            "source": item.get("source", "OpenStreetMap Nominatim")
        }
        issues_col().insert_one(doc)
        seeded_count += 1

        # Update authority assigned / resolved stats
        if auth and auth.get("id"):
            authorities_col().update_one(
                {"id": auth["id"]},
                {"$inc": {
                    "total_assigned": 1,
                    "total_resolved": 1 if item.get("status") == "resolved" else 0
                }}
            )

    # 2. Insert Community Actions
    for act in LUCKNOW_COMMUNITY_ACTIONS:
        act_doc = {
            "id": str(uuid.uuid4()),
            "title": act["title"],
            "description": act["description"],
            "action_type": act["action_type"],
            "scheduled_date": act["scheduled_date"],
            "location": act["location"],
            "max_participants": act["max_participants"],
            "participants": act["participants"],
            "status": act["status"],
            "createdBy": "000717c5-84d7-49b6-ac25-81800beeee2c",
            "createdAt": now.isoformat(),
        }
        actions_col().insert_one(act_doc)

    print(f"[seed] Successfully seeded {seeded_count} REAL OpenStreetMap environmental issues & {len(LUCKNOW_COMMUNITY_ACTIONS)} community actions for Lucknow.")

if __name__ == "__main__":
    seed_all()
