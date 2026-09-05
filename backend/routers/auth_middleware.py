"""
auth_middleware.py — Community Hero Green
Re-exports get_current_user and get_current_user_optional from auth.py
so all other routers import from one consistent place.
"""

from routers.auth import get_current_user, get_current_user_optional

__all__ = ["get_current_user", "get_current_user_optional"]
