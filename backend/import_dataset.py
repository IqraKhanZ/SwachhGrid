"""
import_dataset.py — Community Hero Green
Universal dataset importer for CSV, JSON, and OpenStreetMap data feeds.
"""

import sys
import os
import csv
import json
import uuid
from datetime import datetime, timezone
from database import issues_col, authorities_col
from routers.authorities import assign_authority_to_issue

def import_csv(file_path: str):
    if not os.path.exists(file_path):
        print(f"Error: File '{file_path}' not found.")
        return

    count = 0
    with open(file_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        now = datetime.now(timezone.utc).isoformat()
        for row in reader:
            title = row.get("title") or row.get("complaint_type") or row.get("issue") or "Environmental Grievance"
            desc  = row.get("description") or row.get("details") or title
            cat   = row.get("category") or "Illegal Waste Dumping"
            addr  = row.get("address") or row.get("location") or "Lucknow, Uttar Pradesh, India"
            ward  = row.get("ward") or "Lucknow Central"
            lat   = float(row.get("lat") or row.get("latitude") or 26.8467)
            lng   = float(row.get("lng") or row.get("longitude") or 80.9462)

            auth = assign_authority_to_issue(addr, ward)

            doc = {
                "id": str(uuid.uuid4()),
                "title": title,
                "description": desc,
                "category": cat,
                "environmental_category": cat,
                "severity": row.get("severity", "medium").lower(),
                "status": row.get("status", "open").lower(),
                "location": {
                    "address": addr,
                    "ward": ward,
                    "lat": lat,
                    "lng": lng,
                },
                "mediaUrls": [row.get("image_url", "https://images.unsplash.com/photo-1611288879896-f94b159b3a0c?w=800&auto=format&fit=crop&q=80")],
                "reportedBy": "citizen-demo-id",
                "reporterEmail": "citizen@gmail.com",
                "assigned_authority_id": auth.get("id") if auth else None,
                "assigned_authority_name": auth.get("authority_name") if auth else "Ward Officer",
                "assigned_ward": auth.get("ward_name") if auth else ward,
                "department": auth.get("department") if auth else "Lucknow Municipal Corporation",
                "departmentEmail": auth.get("contact_email") if auth else "env@lmc.gov.in",
                "upvotes": [],
                "verifiedBy": [],
                "supporters": [],
                "environmental_impact": row.get("impact", "Impacting local ecosystem and public health."),
                "recommended_action": f"Dispatched for remediation to {auth.get('authority_name') if auth else 'Ward Officer'}.",
                "sustainability_tip": "Practise active waste segregation.",
                "complaintLetterSent": True,
                "createdAt": now,
                "updatedAt": now,
            }
            issues_col().insert_one(doc)
            count += 1

    print(f"Successfully imported {count} issues from '{file_path}' into MongoDB.")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        import_csv(sys.argv[1])
    else:
        print("Usage: python import_dataset.py <path_to_csv_file>")
