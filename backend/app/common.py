"""Small helpers used by every part of the app."""
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException

from . import database as db


def now():
    return datetime.now(timezone.utc)


def new_id():
    return str(uuid.uuid4())


def find(kind, id):
    """Get one record or answer 404 Not Found."""
    item = db.get(kind, id)
    if item is None:
        raise HTTPException(404, f"No {kind} with id {id}")
    return item
