"""
main.py — Community Hero Green API
MongoDB + JWT — zero Firebase dependency.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import issues, agent, analytics, actions, jobs, fraud, authorities
from routers.auth import router as auth_router
from database import ensure_indexes
import uvicorn

app = FastAPI(
    title="SwachhGrid API",
    description="AI-powered ward sanitation, environmental grievance reporting & eco governance platform",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*",
        "https://swachh-grid.vercel.app",
        "https://swachhgrid.vercel.app",
        "http://localhost:5174",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure MongoDB indexes on startup
@app.on_event("startup")
def startup():
    ensure_indexes()

app.include_router(auth_router,    prefix="/api")
app.include_router(issues.router,  prefix="/api")
app.include_router(authorities.router, prefix="/api")
app.include_router(agent.router,   prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(actions.router, prefix="/api")
app.include_router(jobs.router,    prefix="/api")
app.include_router(fraud.router,   prefix="/api")


@app.get("/")
def root():
    return {
        "status": "SwachhGrid API is running",
        "version": "2.0.0",
        "database": "MongoDB Atlas",
        "auth": "JWT + Google OAuth",
        "tagline": "AI-Powered Ward Sanitation & Eco Governance Platform",
    }

@app.get("/health")
def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
