"""
auth.py — Community Hero Green
JWT-based auth: register, login, Google OAuth (consent screen).
Zero Firebase dependency.
"""

import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import JWTError, jwt
import httpx
from dotenv import load_dotenv

from database import users_col

load_dotenv()

router = APIRouter()

# ── Config ────────────────────────────────────────────────────────────────────
SECRET_KEY      = os.getenv("JWT_SECRET_KEY", "change-me-in-production-use-a-long-random-string")
ALGORITHM       = "HS256"
ACCESS_EXPIRE   = int(os.getenv("JWT_EXPIRE_MINUTES", "10080"))   # 7 days default
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

import bcrypt

security = HTTPBearer(auto_error=False)

def _hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def _verify(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode('utf-8')[:72], hashed.encode('utf-8'))
    except Exception:
        return False

def _make_token(user_id: str, email: str, role: str = "citizen") -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_EXPIRE)
    return jwt.encode(
        {"sub": user_id, "email": email, "role": role, "exp": expire},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

def _decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {e}",
        )

def _serialize_user(u: dict) -> dict:
    u = dict(u)
    u.pop("passwordHash", None)
    u.pop("_id", None)
    return u


# ── Demo account seeder ───────────────────────────────────────────────────────

def seed_demo_accounts():
    now = datetime.now(timezone.utc).isoformat()
    demo_users = [
        {
            "id": "admin-demo-id",
            "displayName": "Super Admin (City Oversight)",
            "email": "admin@communityhero.green",
            "passwordHash": _hash("admin123"),
            "role": "admin",
            "provider": "email",
            "ecoPoints": 500,
            "reputationPoints": 500,
            "reportsCount": 0,
            "verificationsCount": 0,
            "actionsJoined": 0,
            "createdAt": now,
        },
        {
            "id": "authority-kalyanpur-id",
            "displayName": "Kalyanpur Ward Officer",
            "email": "kalyanpur.ward@lmc.gov.in",
            "passwordHash": _hash("authority123"),
            "role": "authority",
            "ward_name": "Kalyanpur",
            "department": "Lucknow Municipal Corporation",
            "provider": "email",
            "ecoPoints": 250,
            "reputationPoints": 250,
            "reportsCount": 0,
            "verificationsCount": 0,
            "actionsJoined": 0,
            "createdAt": now,
        },
        {
            "id": "authority-daliganj-id",
            "displayName": "Daliganj Ward Officer",
            "email": "daliganj.ward@lmc.gov.in",
            "passwordHash": _hash("authority123"),
            "role": "authority",
            "ward_name": "Daliganj",
            "department": "Lucknow Municipal Corporation",
            "provider": "email",
            "ecoPoints": 250,
            "reputationPoints": 250,
            "reportsCount": 0,
            "verificationsCount": 0,
            "actionsJoined": 0,
            "createdAt": now,
        },
        {
            "id": "authority-gomtinagar-id",
            "displayName": "Gomti Nagar Ward Officer",
            "email": "gomtinagar.ward@lmc.gov.in",
            "passwordHash": _hash("authority123"),
            "role": "authority",
            "ward_name": "Gomti Nagar",
            "department": "Lucknow Municipal Corporation",
            "provider": "email",
            "ecoPoints": 250,
            "reputationPoints": 250,
            "reportsCount": 0,
            "verificationsCount": 0,
            "actionsJoined": 0,
            "createdAt": now,
        },
        {
            "id": "citizen-demo-id",
            "displayName": "Priya Sharma (Citizen)",
            "email": "citizen@gmail.com",
            "passwordHash": _hash("citizen123"),
            "role": "citizen",
            "provider": "email",
            "ecoPoints": 80,
            "reputationPoints": 50,
            "reportsCount": 3,
            "verificationsCount": 2,
            "actionsJoined": 1,
            "createdAt": now,
        }
    ]

    for u in demo_users:
        if not users_col().find_one({"email": u["email"]}):
            users_col().insert_one(u)
            print(f"[auth] Seeded demo user: {u['email']} ({u['role']})")


# ── Auth dependency used by all protected routes ──────────────────────────────

async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if creds is None:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    payload = _decode_token(creds.credentials)
    user_id = payload.get("sub")
    user = users_col().find_one({"id": user_id}, {"passwordHash": 0, "_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if "role" not in user:
        user["role"] = "citizen"
    return user

async def get_current_user_optional(creds: HTTPAuthorizationCredentials = Depends(security)) -> Optional[dict]:
    if creds is None:
        return None
    try:
        payload = _decode_token(creds.credentials)
        user_id = payload.get("sub")
        user = users_col().find_one({"id": user_id}, {"passwordHash": 0, "_id": 0})
        if user and "role" not in user:
            user["role"] = "citizen"
        return user
    except Exception:
        return None


# ── Pydantic models ───────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    displayName: str
    email: EmailStr
    password: str
    role: Optional[str] = "citizen"
    ward_name: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class GoogleTokenRequest(BaseModel):
    id_token: str


# ── POST /api/auth/register ───────────────────────────────────────────────────

@router.post("/auth/register", status_code=201)
async def register(body: RegisterRequest):
    seed_demo_accounts()
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if users_col().find_one({"email": body.email.lower()}):
        raise HTTPException(status_code=409, detail="Email already registered")

    user_id = str(uuid.uuid4())
    now     = datetime.now(timezone.utc).isoformat()
    role    = body.role if body.role in ["citizen", "authority", "admin"] else "citizen"

    user_doc = {
        "id":                 user_id,
        "displayName":        body.displayName.strip(),
        "email":              body.email.lower(),
        "passwordHash":       _hash(body.password),
        "role":               role,
        "ward_name":          body.ward_name,
        "provider":           "email",
        "ecoPoints":          0,
        "reputationPoints":   0,
        "reportsCount":       0,
        "verificationsCount": 0,
        "actionsJoined":      0,
        "createdAt":          now,
    }
    users_col().insert_one(user_doc)
    token = _make_token(user_id, body.email.lower(), role=role)
    return {"token": token, "user": _serialize_user(user_doc)}


# ── POST /api/auth/login ──────────────────────────────────────────────────────

@router.post("/auth/login")
async def login(body: LoginRequest):
    seed_demo_accounts()
    user = users_col().find_one({"email": body.email.lower()})
    if not user or not _verify(body.password, user.get("passwordHash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    role = user.get("role", "citizen")
    token = _make_token(user["id"], user["email"], role=role)
    return {"token": token, "user": _serialize_user(user)}


# ── POST /api/auth/google ─────────────────────────────────────────────────────

@router.post("/auth/google")
async def google_login(body: GoogleTokenRequest):
    seed_demo_accounts()

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": body.id_token},
            timeout=10,
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    info = resp.json()

    # Optional audience check if GOOGLE_CLIENT_ID is configured on backend
    if GOOGLE_CLIENT_ID and info.get("aud") != GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=401, detail="Token audience mismatch")

    google_email = info.get("email", "").lower()
    google_name  = info.get("name", "Google User")
    google_sub   = info.get("sub", "")

    user = users_col().find_one({"email": google_email})
    now  = datetime.now(timezone.utc).isoformat()

    if not user:
        user_id = str(uuid.uuid4())
        user_doc = {
            "id":                 user_id,
            "displayName":        google_name,
            "email":              google_email,
            "googleSub":          google_sub,
            "role":               "citizen",
            "provider":           "google",
            "ecoPoints":          0,
            "reputationPoints":   0,
            "reportsCount":       0,
            "verificationsCount": 0,
            "actionsJoined":      0,
            "createdAt":          now,
        }
        users_col().insert_one(user_doc)
        user = user_doc
    else:
        users_col().update_one({"email": google_email}, {"$set": {"googleSub": google_sub}})

    role = user.get("role", "citizen")
    token = _make_token(user["id"], google_email, role=role)
    return {"token": token, "user": _serialize_user(user)}


# ── GET /api/auth/me ──────────────────────────────────────────────────────────

@router.get("/auth/me")
async def me(current_user: dict = Depends(get_current_user)):
    return current_user
