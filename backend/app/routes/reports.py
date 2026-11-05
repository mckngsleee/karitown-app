"""Home and Ledger screens: money in and out for a period."""
from fastapi import APIRouter

from .. import database as db
from ..common import now
from ..rules import money, prices
from .loads import open_load, totals_of

router = APIRouter(tags=["Home & ledger"])


def records_in_period(period, start, end):
    today = now().astimezone(money.MANILA).date()
    first, last = money.period_dates(period, today, start, end)
    return db.list_all("purchase"), db.list_all("sale"), first, last


@router.get("/summary")
def home_summary(period: str = "today", start: str = "", end: str = ""):
    """Home screen: cash out and cash in for the period, plus the open load."""
    purchases, sales, first, last = records_in_period(period, start, end)
    load = open_load()
    materials = [m for m in db.list_all("material") if not m["removed"]]
    return {
        "period": {"from": first.isoformat(), "to": last.isoformat()},
        **money.cash_totals(purchases, sales, first, last),
        "open_load": {**load, "totals": totals_of(load)} if load else None,
        "old_prices": sum(1 for m in materials if prices.is_old_price(m, now())),
    }


@router.get("/ledger")
def ledger(period: str = "week", start: str = "", end: str = ""):
    """Every purchase (money out) and sale (money in), newest first. The ledger also shows net."""
    purchases, sales, first, last = records_in_period(period, start, end)
    totals = money.cash_totals(purchases, sales, first, last)
    records = [{"type": "out", "number": p["number"], "amount_c": p["total_c"], "void": p["void"],
                "created_at": p["created_at"], "id": p["id"]} for p in purchases] + \
              [{"type": "in", "number": s["number"], "amount_c": s["paid_c"], "void": s["void"],
                "created_at": s["created_at"], "id": s["id"]} for s in sales]
    records = [r for r in records if first <= money.manila_date(r["created_at"]) <= last]
    return {**totals, "net_c": totals["cash_in_c"] - totals["cash_out_c"],
            "records": sorted(records, key=lambda r: r["created_at"], reverse=True)}
