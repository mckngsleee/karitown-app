"""Rules for buying scrap by weight (the Pasok Kalakal screen).

Weights are in grams (12 kg = 12000) and money in centavos (P75.00 = 7500).
"""
from decimal import ROUND_HALF_UP, Decimal

from ..errors import RuleError
from .prices import listed_rate


def line_amount(payable_g, rate_c):
    """Amount to pay for one item: payable kilos x rate, rounded to the nearest centavo."""
    return (payable_g * rate_c + 500) // 1000


def calculate_line(material, gross_g, tare_g=0, defect_mode="kg", defect_value=0, rate_c=None):
    """Work out one weighed item, exactly like the Weigh item screen.

    gross_g       what the scale shows, in grams
    tare_g        weight of the sack or container
    defect_mode   "kg"  -> defect_value is grams to subtract
                  "pct" -> defect_value is a percent of the net weight (0-100)
    rate_c        price per kilo; None means use the listed price
    """
    if material.get("removed"):
        raise RuleError(f"{material['name']} is not on your price list")
    if gross_g <= 0:
        raise RuleError("Enter a gross weight above 0")
    if tare_g < 0 or tare_g >= gross_g:
        raise RuleError("Tare must be less than gross")

    net_g = gross_g - tare_g

    if defect_mode == "kg":
        defect_g = int(defect_value)
    elif defect_mode == "pct":
        percent = Decimal(str(defect_value))
        if percent < 0 or percent > 100:
            raise RuleError("Percent must be 0 to 100")
        defect_g = int((net_g * percent / 100).quantize(Decimal(1), rounding=ROUND_HALF_UP))
    else:
        raise RuleError("Defect mode must be kg or pct")

    if defect_g < 0 or defect_g > net_g:
        raise RuleError("Defect cannot be more than net weight")
    payable_g = net_g - defect_g
    if payable_g <= 0:
        raise RuleError("Payable weight must be above 0")

    listed = listed_rate(material)
    applied = listed if rate_c is None else rate_c
    if applied < 0:
        raise RuleError("Rate cannot be negative")

    out_of_range = material["price_mode"] == "range" and not (material["min_c"] <= applied <= material["max_c"])
    return {
        "material_id": material["id"],
        "gross_g": gross_g,
        "tare_g": tare_g,
        "net_g": net_g,
        "defect_mode": defect_mode,
        "defect_g": defect_g,
        "payable_g": payable_g,
        "listed_rate_c": listed,
        "rate_c": applied,
        "price_changed": applied != listed,
        "out_of_range": out_of_range,
        "amount_c": line_amount(payable_g, applied),
    }


def purchase_total(purchase):
    return sum(line["amount_c"] for line in purchase["lines"])
