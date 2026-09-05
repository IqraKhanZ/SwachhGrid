"""
database.py — Community Hero Green
MongoDB Atlas connection. All collections live here.
Zero dependency on Firebase.
"""

import os
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.collection import Collection
from dotenv import load_dotenv

load_dotenv()

_client: MongoClient | None = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
        _client = MongoClient(uri)
    return _client


def get_db():
    """Return the community_hero_green database."""
    return get_client()[os.getenv("MONGODB_DB_NAME", "community_hero_green")]


# ── Typed collection accessors ────────────────────────────────────────────────

def issues_col() -> Collection:
    return get_db()["environmental_issues"]

def users_col() -> Collection:
    return get_db()["users"]

def notifications_col() -> Collection:
    return get_db()["notifications"]

def actions_col() -> Collection:
    return get_db()["community_actions"]

def scores_col() -> Collection:
    return get_db()["sustainability_scores"]

def predictions_col() -> Collection:
    return get_db()["env_predictions"]

def letters_col() -> Collection:
    return get_db()["complaint_letters"]

def comments_col() -> Collection:
    return get_db()["comments"]

def authorities_col() -> Collection:
    return get_db()["authorities"]


# ── Indexes (called once at startup) ─────────────────────────────────────────

def ensure_indexes():
    issues_col().create_index([("createdAt", DESCENDING)])
    issues_col().create_index([("category", ASCENDING)])
    issues_col().create_index([("status", ASCENDING)])
    issues_col().create_index([("reportedBy", ASCENDING)])
    users_col().create_index([("email", ASCENDING)], unique=True)
    notifications_col().create_index([("userId", ASCENDING), ("createdAt", DESCENDING)])
    actions_col().create_index([("createdAt", DESCENDING)])
    predictions_col().create_index([("riskScore", DESCENDING)])
    comments_col().create_index([("issueId", ASCENDING), ("createdAt", ASCENDING)])
    authorities_col().create_index([("ward_name", ASCENDING)], unique=True)
