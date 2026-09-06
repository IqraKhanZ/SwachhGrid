"""
complaint_letter.py — Community Hero Green  (MongoDB version)
"""

import os
import uuid

try:
    import sendgrid
    from sendgrid.helpers.mail import Mail, Email, To, Content
    SENDGRID_AVAILABLE = True
except ImportError:
    SENDGRID_AVAILABLE = False
from database import letters_col, issues_col, notifications_col
from services.ai_service import generate_environmental_complaint_letter
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()


def send_environmental_complaint_email(issue: dict) -> dict:
    letter_text = generate_environmental_complaint_letter(issue)
    dept_email  = issue.get("departmentEmail", os.getenv("SENDGRID_FROM_EMAIL", ""))
    issue_id    = issue.get("id", "N/A")
    env_cat     = issue.get("environmental_category", issue.get("category", "Environmental Issue"))
    address     = issue.get("location", {}).get("address", "Unknown Location")
    subject     = f"[ENV COMPLAINT — REF: {issue_id}] {env_cat} at {address}"

    delivery_status = "skipped_no_api_key"
    api_key = os.getenv("SENDGRID_API_KEY", "")
    if SENDGRID_AVAILABLE and api_key and api_key not in ("YOUR_SENDGRID_API_KEY", "skip"):
        try:
            sg   = sendgrid.SendGridAPIClient(api_key=api_key)
            mail = Mail(
                Email(os.getenv("SENDGRID_FROM_EMAIL"), os.getenv("SENDGRID_FROM_NAME", "Community Hero Green")),
                To(dept_email), subject, Content("text/plain", letter_text),
            )
            resp = sg.client.mail.send.post(request_body=mail.get())
            delivery_status = "sent" if resp.status_code in (200, 201, 202) else "failed"
        except Exception as e:
            delivery_status = f"failed: {e}"

    letters_col().insert_one({
        "id":             str(uuid.uuid4()),
        "issueId":        issue_id,
        "department":     issue.get("department", "Unknown"),
        "recipientEmail": dept_email,
        "letterText":     letter_text,
        "sentAt":         datetime.now(timezone.utc),
        "deliveryStatus": delivery_status,
    })

    issues_col().update_one({"id": issue_id}, {"$set": {
        "complaintLetterSent":   True,
        "complaintLetterSentAt": datetime.now(timezone.utc),
        "complaintLetterText":   letter_text,
        "updatedAt":             datetime.now(timezone.utc),
    }})

    notifications_col().insert_one({
        "id":        str(uuid.uuid4()),
        "userId":    issue.get("reportedBy", ""),
        "type":      "complaint_letter_sent",
        "issueId":   issue_id,
        "message":   f"An official environmental complaint letter has been sent to {issue.get('department','the department')} on your behalf.",
        "read":      False,
        "createdAt": datetime.now(timezone.utc),
    })

    return {"success": delivery_status in ("sent", "skipped_no_api_key"),
            "letter_text": letter_text, "delivery_status": delivery_status}
