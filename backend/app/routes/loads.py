"""Load screen: the truck being filled, and its steps OPEN -> CLOSED -> PICKED_UP -> SOLD."""
from fastapi import APIRouter

from .. import database as db
from ..common import find, new_id, now
from ..errors import RuleError
from ..models import CapacityIn, CloseLoadIn, LoadIn, PickupIn, ReopenIn
from ..rules import loads as load_rules

router = APIRouter(tags=["Truck loads"])

DEFAULT_CAPACITY_G = 2_000_000   # a 2,000 kg truck


# ----- helpers that the purchase and report routes also use -----

def open_load():
    """The one load that is open right now, or None."""
    found = [load for load in db.list_all("load") if load["state"] == "OPEN"]
    return found[0] if found else None


def start_new_load(load_id=None, capacity_g=None, number=None, created_at=None):
    """There can only ever be one open load."""
    if open_load():
        raise RuleError("Close the open load before starting a new one")
    if capacity_g is None:
        previous = sorted(db.list_all("load"), key=lambda load: load["number"])
        capacity_g = previous[-1]["capacity_g"] if previous else DEFAULT_CAPACITY_G
    if capacity_g <= 0:
        raise RuleError("Truck capacity must be above 0")
    load = {"id": load_id or new_id(), "number": number or db.next_number("L"), "state": "OPEN",
            "capacity_g": capacity_g, "buyer_id": None, "pickup_date": None, "picked_up_at": None, "history": [],
            "created_at": created_at or now().isoformat()}
    db.save("load", load)
    return load


def purchases_in(load):
    return [p for p in db.list_all("purchase") if p["load_id"] == load["id"]]


def totals_of(load):
    return load_rules.load_totals(load, purchases_in(load))


def move_to(load, state, **changes):
    """Change a load's step and remember when it happened."""
    load.update(state=state, **changes)
    load["history"].append({"to": state, "at": now().isoformat()})
    db.save("load", load)
    return load


# ----- endpoints -----

@router.get("/loads")
def list_loads(state: str = ""):
    loads = sorted(db.list_all("load"), key=lambda load: load["number"], reverse=True)
    return [load for load in loads if not state or load["state"] == state]


@router.get("/loads/{load_id}")
def load_details(load_id: str):
    load = find("load", load_id)
    return {**load, "totals": totals_of(load)}


@router.post("/loads", status_code=201)
def start_load(body: LoadIn):
    if body.id and (existing := db.get("load", body.id)):
        return existing
    return start_new_load(body.id, body.capacity_g, body.number, body.created_at)


@router.put("/loads/{load_id}/capacity")
def set_capacity(load_id: str, body: CapacityIn):
    load = find("load", load_id)
    load_rules.require_state(load, "OPEN", "change the capacity")
    if body.capacity_g <= 0 or body.capacity_g < totals_of(load)["total_g"]:
        raise RuleError("Capacity cannot be below what is already loaded")
    load["capacity_g"] = body.capacity_g
    db.save("load", load)
    return load


@router.post("/loads/{load_id}/close")
def close_load(load_id: str, body: CloseLoadIn):
    """Open -> Closed: choose who will pick it up and when."""
    load = find("load", load_id)
    load_rules.require_state(load, "OPEN", "close")
    if not totals_of(load)["materials"]:
        raise RuleError("This load is empty")
    find("buyer", body.buyer_id)
    return move_to(load, "CLOSED", buyer_id=body.buyer_id, pickup_date=body.pickup_date)


@router.post("/loads/{load_id}/pickup")
def mark_picked_up(load_id: str, body: PickupIn | None = None):
    """Closed -> Picked up: the buyer took the truck."""
    load = find("load", load_id)
    load_rules.require_state(load, "CLOSED", "mark as picked up")
    return move_to(load, "PICKED_UP", picked_up_at=(body and body.at) or now().isoformat())


@router.post("/loads/{load_id}/reopen")
def reopen_load(load_id: str, body: ReopenIn):
    """Back to Open. From Closed you must give a reason; from Picked up no reason is needed."""
    load = find("load", load_id)
    if open_load():
        raise RuleError("Another load is already open")
    if load["state"] == "CLOSED":
        if not body.reason.strip():
            raise RuleError("Enter a reason for reopening")
        reason = body.reason.strip()
    elif load["state"] == "PICKED_UP":
        reason = "Reopened from picked up"
        load.update(buyer_id=None, pickup_date=None, picked_up_at=None)
    else:
        raise RuleError(f"Cannot reopen a load that is {load['state']}")
    move_to(load, "OPEN")
    load["history"][-1]["reason"] = reason
    db.save("load", load)
    return load
