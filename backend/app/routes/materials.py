"""Materials & prices screen: the list of what the shop buys and for how much."""
from fastapi import APIRouter

from .. import database as db
from ..common import find, new_id, now
from ..models import MaterialIn
from ..rules import prices

router = APIRouter(tags=["Materials & prices"])


@router.get("/categories")
def list_categories():
    used = {m["category"] for m in db.list_all("material")}
    return prices.DEFAULT_CATEGORIES + sorted(used - set(prices.DEFAULT_CATEGORIES))


@router.get("/materials")
def list_materials(include_removed: bool = False):
    """Only materials on the list can be bought. Removed ones count as refused.

    include_removed=true also returns removed ones, so a phone restoring its data keeps their names.
    """
    materials = [m for m in db.list_all("material") if include_removed or not m["removed"]]
    for m in materials:
        m["old_price"] = prices.is_old_price(m, now())
    return sorted(materials, key=lambda m: (m["category"], m["name"]))


@router.post("/materials", status_code=201)
def add_material(body: MaterialIn):
    if body.id and (existing := db.get("material", body.id)):   # sent twice from the phone
        return existing
    material = {**body.model_dump(), "id": body.id or new_id(), "removed": False}
    save_material(material, old=None)
    return material


@router.put("/materials/{material_id}")
def edit_material(material_id: str, body: MaterialIn):
    old = find("material", material_id)
    material = {**old, **body.model_dump(exclude={"id"})}
    save_material(material, old=old)
    return material


def save_material(material, old):
    material["name"] = material["name"].strip()
    if material["price_mode"] == "range":
        material["price_c"] = None
    else:
        material["min_c"] = material["max_c"] = None
    prices.check_material(material)
    if material["price_mode"] == "range":
        material["price_c"] = prices.listed_rate(material)

    # Keep a price history: every new price is added, nothing is overwritten.
    new_price = prices.describe_price(material)
    old_price = prices.describe_price(old) if old else "New"
    history = (old or {}).get("history", [])
    if new_price != old_price:
        history = history + [{"from": old_price, "to": new_price, "at": now().isoformat()}]
    material["price_updated_at"] = now().isoformat()   # saving = the owner checked the price today
    material["history"] = history
    db.save("material", material)


@router.delete("/materials/{material_id}")
def remove_material(material_id: str):
    """Soft delete: past purchases still show the name."""
    material = find("material", material_id)
    material["removed"] = True
    db.save("material", material)
    return {"removed": material["name"]}
