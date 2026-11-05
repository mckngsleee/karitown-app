"""Buy screen (Pasok Kalakal): weigh items, save the purchase, void or correct it later."""
from fastapi import APIRouter

from .. import database as db
from ..common import find, new_id, now
from ..errors import RuleError
from ..models import CorrectionIn, PurchaseIn, ReasonIn
from ..rules import buying
from ..rules.loads import require_state
from .loads import open_load, start_new_load, totals_of

router = APIRouter(tags=["Buying"])


def build_lines(line_inputs):
    lines = []
    for line in line_inputs:
        material = find("material", line.material_id)
        calculated = buying.calculate_line(material, line.gross_g, line.tare_g, line.defect_mode,
                                           line.defect_value, line.rate_c)
        calculated["defect_value"] = f"{line.defect_value:g}"   # as typed (grams or a percent); text, as DynamoDB has no floats
        calculated["defect_reason"] = line.defect_reason if calculated["defect_g"] else ""
        calculated["material_name"] = material["name"]   # so old receipts keep the name
        lines.append(calculated)
    if not lines:
        raise RuleError("Add at least one item")
    return lines


def void(purchase, reason):
    load = find("load", purchase["load_id"])
    require_state(load, "OPEN", "change a purchase")   # lines lock once the load is closed
    if purchase["void"]:
        raise RuleError(f"{purchase['number']} is already void")
    if not reason.strip():
        raise RuleError("Enter a reason")
    purchase["void"] = {"reason": reason.strip(), "at": now().isoformat()}
    db.save("purchase", purchase)


@router.get("/purchases")
def list_purchases():
    return sorted(db.list_all("purchase"), key=lambda p: p["created_at"], reverse=True)


@router.post("/purchases", status_code=201)
def add_purchase(body: PurchaseIn):
    # Sent twice from the phone? Return the one we already have.
    if body.id and (existing := db.get("purchase", body.id)):
        return existing
    if body.supplier_id:
        find("supplier", body.supplier_id)
    lines = build_lines(body.lines)

    if body.load_id:                             # the phone says which load it went into
        load = find("load", body.load_id)
        require_state(load, "OPEN", "add a purchase")
    else:
        load = open_load() or start_new_load()   # no open load? saving starts one
    purchase = {"id": body.id or new_id(), "number": body.number or db.next_number("PUR"),
                "supplier_id": body.supplier_id, "payment": body.payment, "lines": lines,
                "total_c": sum(line["amount_c"] for line in lines), "load_id": load["id"], "void": None,
                "corrects": body.corrects, "created_at": body.created_at or now().isoformat(),
                "received_at": now().isoformat()}
    if not db.save_new("purchase", purchase):
        return db.get("purchase", purchase["id"])

    totals = totals_of(load)
    return {**purchase, "load_number": load["number"], "load_percent_full": totals["percent_full"],
            "load_full": totals["full"]}   # the app offers "Close and choose buyer" when full


@router.post("/purchases/{purchase_id}/void")
def void_purchase(purchase_id: str, body: ReasonIn):
    """Nothing is ever deleted: a mistake is marked void with a reason."""
    purchase = find("purchase", purchase_id)
    void(purchase, body.reason)
    return purchase


@router.post("/purchases/{purchase_id}/correct")
def correct_purchase(purchase_id: str, body: CorrectionIn):
    """Editing a saved purchase = void the original + save a corrected copy."""
    original = find("purchase", purchase_id)
    if not body.lines:
        void(original, "Line removed")
        return {"voided": original["number"], "replacement": None}
    lines = build_lines(body.lines)
    number = db.next_number("PUR")
    void(original, f"Corrected -> {number}")
    copy = {**original, "id": new_id(), "number": number, "lines": lines,
            "total_c": sum(line["amount_c"] for line in lines), "void": None, "corrects": original["number"],
            "created_at": now().isoformat(), "received_at": now().isoformat()}
    db.save("purchase", copy)
    return {"voided": original["number"], "replacement": copy}
