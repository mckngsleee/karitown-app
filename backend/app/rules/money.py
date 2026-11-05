"""Rules for the Home totals and the Ledger: which records fall in a period, and how they add up."""
from datetime import date, datetime, timedelta, timezone

from ..errors import RuleError
from .buying import purchase_total

MANILA = timezone(timedelta(hours=8))   # the Philippines has no daylight saving time


def manila_date(iso_timestamp):
    return datetime.fromisoformat(iso_timestamp).astimezone(MANILA).date()


def period_dates(period, today, start=None, end=None):
    """First and last day (inclusive) for today / week / month / custom. Weeks start on Monday."""
    if period == "today":
        return today, today
    if period == "week":
        return today - timedelta(days=today.weekday()), today
    if period == "month":
        return today.replace(day=1), today
    if period == "custom":
        first = date.fromisoformat(start) if start else date.min
        last = date.fromisoformat(end) if end else date.max
        if first > last:
            raise RuleError("Start date must be before end date")
        return first, last
    raise RuleError("Period must be today, week, month or custom")


def cash_totals(purchases, sales, first, last):
    """Cash out (what you paid sellers) and cash in (what buyers paid you). Voids are skipped.

    The two totals are separate on purpose: Home shows them side by side, not as one net number.
    """
    bought = [p for p in purchases if not p.get("void") and first <= manila_date(p["created_at"]) <= last]
    sold = [s for s in sales if not s.get("void") and first <= manila_date(s["created_at"]) <= last]
    return {
        "cash_out_c": sum(purchase_total(p) for p in bought),
        "purchase_count": len(bought),
        "cash_in_c": sum(s["paid_c"] for s in sold),
        "sale_count": len(sold),
    }
