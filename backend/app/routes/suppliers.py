"""Suppliers screen: people and businesses who sell scrap to the shop."""
from fastapi import APIRouter

from .. import database as db
from ..common import find, new_id, now
from ..errors import RuleError
from ..models import SupplierIn

router = APIRouter(tags=["Suppliers"])


@router.get("/suppliers")
def list_suppliers(include_removed: bool = False):
    return [s for s in db.list_all("supplier") if include_removed or not s["removed"]]


@router.post("/suppliers", status_code=201)
def add_supplier(body: SupplierIn):
    if not body.name.strip():
        raise RuleError("Enter the supplier's name")
    if body.id and (existing := db.get("supplier", body.id)):   # sent twice from the phone
        return existing
    supplier = {**body.model_dump(), "id": body.id or new_id(), "added_at": now().isoformat(), "removed": False}
    db.save("supplier", supplier)
    return supplier


@router.put("/suppliers/{supplier_id}")
def edit_supplier(supplier_id: str, body: SupplierIn):
    supplier = {**find("supplier", supplier_id), **body.model_dump(exclude={"id"})}
    db.save("supplier", supplier)
    return supplier


@router.delete("/suppliers/{supplier_id}")
def remove_supplier(supplier_id: str):
    """Soft delete: past purchases still show the name."""
    supplier = find("supplier", supplier_id)
    supplier["removed"] = True
    db.save("supplier", supplier)
    return {"removed": supplier["name"]}
