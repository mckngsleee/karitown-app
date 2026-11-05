"""Buyers screen: who buys the shop's truck loads."""
from fastapi import APIRouter

from .. import database as db
from ..common import find, new_id
from ..errors import RuleError
from ..models import BuyerIn

router = APIRouter(tags=["Buyers"])


@router.get("/buyers")
def list_buyers(location: str = "", type: str = "", material: str = "", include_hidden: bool = False):
    buyers = [b for b in db.list_all("buyer") if include_hidden or not b["hidden"]]
    if location:
        buyers = [b for b in buyers if location.lower() in b["location"].lower()]
    if type:
        buyers = [b for b in buyers if b["type"] == type]
    if material:
        buyers = [b for b in buyers if material in b["materials"]]
    return buyers


@router.post("/buyers", status_code=201)
def add_buyer(body: BuyerIn):
    """Private buyers are only visible to your shop."""
    if not body.name.strip() or not body.location.strip():
        raise RuleError("Enter the buyer's name and location")
    if body.id and (existing := db.get("buyer", body.id)):   # sent twice from the phone
        return existing
    buyer = {**body.model_dump(), "id": body.id or new_id(), "source": "private", "hidden": False}
    db.save("buyer", buyer)
    return buyer


@router.put("/buyers/{buyer_id}")
def edit_buyer(buyer_id: str, body: BuyerIn):
    buyer = find("buyer", buyer_id)
    if buyer["source"] == "directory":
        raise RuleError("Directory buyers are kept up to date for you and cannot be edited")
    buyer = {**buyer, **body.model_dump(exclude={"id"})}
    db.save("buyer", buyer)
    return buyer


@router.delete("/buyers/{buyer_id}")
def remove_buyer(buyer_id: str):
    """Take a buyer off your list. The record stays, so past sales still show the name."""
    buyer = find("buyer", buyer_id)
    buyer["hidden"] = True
    db.save("buyer", buyer)
    return {"hidden": buyer["name"]}
