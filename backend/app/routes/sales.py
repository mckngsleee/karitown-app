"""Record sale screen: what the buyer weighed and paid for a load, and the margin it made."""
from fastapi import APIRouter

from .. import database as db
from ..common import find, new_id, now
from ..errors import RuleError
from ..models import ReasonIn, SaleIn
from ..rules import selling
from ..rules.loads import require_state
from .loads import move_to, totals_of

router = APIRouter(tags=["Selling"])


@router.get("/sales")
def list_sales():
    return sorted(db.list_all("sale"), key=lambda s: s["created_at"], reverse=True)


@router.post("/sales", status_code=201)
def record_sale(body: SaleIn):
    """Picked up -> Sold: enter what the buyer weighed and paid."""
    if body.id and (existing := db.get("sale", body.id)):
        return existing
    load = find("load", body.load_id)
    require_state(load, "PICKED_UP", "record a sale")
    totals = totals_of(load)
    entries = {k: v.model_dump() for k, v in body.entries.items()}
    result = selling.calculate_sale(totals, body.mode, entries, body.buyer_total_g, body.mixed_rate_c, body.paid_c)
    sale = {"id": body.id or new_id(), "number": body.number or db.next_number("SAL"), "load_id": load["id"],
            "buyer_id": load["buyer_id"], "payment": body.payment, **result, "void": None,
            "created_at": body.created_at or now().isoformat(), "received_at": now().isoformat()}
    db.save("sale", sale)
    move_to(load, "SOLD")
    return {**sale, "margin_c": sale["amount_c"] - totals["cost_c"]}


@router.post("/sales/{sale_id}/void")
def void_sale(sale_id: str, body: ReasonIn):
    """Undo a sale: the load goes back to Picked up."""
    sale = find("sale", sale_id)
    if sale["void"]:
        raise RuleError(f"{sale['number']} is already void")
    if not body.reason.strip():
        raise RuleError("Enter a reason")
    sale["void"] = {"reason": body.reason.strip(), "at": now().isoformat()}
    db.save("sale", sale)
    move_to(find("load", sale["load_id"]), "PICKED_UP")
    return sale


@router.get("/loads/{load_id}/margin")
def margin(load_id: str):
    load = find("load", load_id)
    sales = [s for s in db.list_all("sale") if s["load_id"] == load_id and not s["void"]]
    if not sales:
        raise RuleError(f"{load['number']} has not been sold yet")
    return selling.load_margin(totals_of(load), sales[0])
