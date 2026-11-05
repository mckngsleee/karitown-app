"""What the app sends to the API. FastAPI checks these shapes before our code runs."""
from typing import Literal

from pydantic import BaseModel

# The phone saves everything on itself first and uploads later, so it makes the id
# (any unique text), the receipt number (PUR-0042) and the time it was recorded.
# Leave them out and the server makes them.


class MaterialIn(BaseModel):
    id: str | None = None
    name: str
    name_tl: str = ""
    category: str = "Other"
    price_mode: Literal["fixed", "range", "negotiable"] = "fixed"
    price_c: int | None = None      # fixed or negotiable price, in centavos per kilo
    min_c: int | None = None        # range only
    max_c: int | None = None        # range only


class SupplierIn(BaseModel):
    id: str | None = None
    name: str
    type: Literal["Collector (staff)", "Walk-in", "Business", "Other"] = "Walk-in"
    contact: str = ""


class BuyerIn(BaseModel):
    id: str | None = None
    name: str
    type: Literal["Junk buyer", "Recycling plant", "Middleman", "Other"] = "Junk buyer"
    location: str
    contact: str = ""
    materials: list[str] = []       # material ids, or free text like "Car batteries"


class LineIn(BaseModel):
    material_id: str
    gross_g: int
    tare_g: int = 0
    defect_mode: Literal["kg", "pct"] = "kg"
    defect_value: float = 0          # grams when "kg", percent when "pct"
    defect_reason: Literal["", "moisture", "dirt", "mixed", "other"] = ""
    rate_c: int | None = None        # None = use the listed price


class PurchaseIn(BaseModel):
    id: str | None = None
    number: str | None = None        # e.g. "PUR-0042"
    created_at: str | None = None    # when it was saved on the phone
    load_id: str | None = None       # None = the open load (or start one)
    corrects: str | None = None      # number of the purchase this one replaces
    supplier_id: str | None = None   # None = walk-in
    payment: Literal["Cash", "Cashless"] = "Cash"
    lines: list[LineIn]


class CorrectionIn(BaseModel):
    lines: list[LineIn]              # the full, corrected list; empty = remove the purchase


class ReasonIn(BaseModel):
    reason: str


class LoadIn(BaseModel):
    id: str | None = None
    number: str | None = None        # e.g. "L-0008"
    created_at: str | None = None
    capacity_g: int | None = None    # None = same as the last load


class CapacityIn(BaseModel):
    capacity_g: int


class CloseLoadIn(BaseModel):
    buyer_id: str
    pickup_date: str                 # "2026-10-28"


class PickupIn(BaseModel):
    at: str | None = None            # when the buyer took the load; None = now


class ReopenIn(BaseModel):
    reason: str = ""                 # needed when reopening a Closed load


class SaleEntry(BaseModel):
    buyer_weight_g: int
    rate_c: int


class SaleIn(BaseModel):
    id: str | None = None
    number: str | None = None        # e.g. "SAL-0020"
    created_at: str | None = None
    load_id: str
    mode: Literal["per_material", "mixed"]
    entries: dict[str, SaleEntry] = {}   # per_material: material_id -> buyer's weight and price
    buyer_total_g: int | None = None     # mixed
    mixed_rate_c: int | None = None      # mixed
    paid_c: int | None = None            # None = paid in full
    payment: Literal["Cash", "Cashless"] = "Cash"
