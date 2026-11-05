"""Rules for materials and their prices.

Money is in centavos and prices are centavos per kilo (P7.50/kg = 750), always whole numbers.
"""
from datetime import datetime, timedelta

from ..errors import RuleError

STALE_DAYS = 30        # a price older than this is shown as "old price"
DEFAULT_CATEGORIES = ["Plastic", "Paper", "Metal", "Glass", "Electronics", "Other"]


def listed_rate(material):
    """The price per kilo to use by default.

    fixed / negotiable -> the material's price
    range              -> the middle of min and max (rounded up at .5)
    """
    if material["price_mode"] == "range":
        return (material["min_c"] + material["max_c"] + 1) // 2
    return material["price_c"]


def check_material(material):
    if not material["name"].strip():
        raise RuleError("Enter the material name")
    if material["price_mode"] not in ("fixed", "range", "negotiable"):
        raise RuleError("Price mode must be fixed, range or negotiable")
    if material["price_mode"] == "range":
        if material.get("min_c") is None or material.get("max_c") is None:
            raise RuleError("Enter both the minimum and maximum price")
        if material["min_c"] < 0 or material["max_c"] < 0:
            raise RuleError("Prices cannot be negative")
        if material["min_c"] > material["max_c"]:
            raise RuleError("Minimum price must be less than or equal to maximum")
    elif material.get("price_c") is None or material["price_c"] < 0:
        raise RuleError("Enter a price of P0.00 or more")


def describe_price(material):
    """Text used in the price history, e.g. 'P7.50/kg' or 'P9.00-13.00/kg'."""
    if material["price_mode"] == "range":
        return f"{peso(material['min_c'])}-{peso(material['max_c'])[1:]}/kg"
    if material["price_mode"] == "negotiable":
        return f"Ref {peso(material['price_c'])}/kg"
    return f"{peso(material['price_c'])}/kg"


def is_old_price(material, now):
    last = datetime.fromisoformat(material["price_updated_at"])
    return now - last > timedelta(days=STALE_DAYS)


def peso(centavos):
    return f"P{centavos // 100:,}.{centavos % 100:02d}"
