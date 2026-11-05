"""Rules for selling a load to a buyer, and the margin it made."""
from ..errors import RuleError
from .buying import line_amount


def split_by_weight(amount_c, weights):
    """Split one sale amount across materials by their share of the weight.

    Each share is rounded; the last material gets whatever is left so the
    parts always add up exactly to the sale amount.
    """
    total = sum(weights)
    shares = []
    for i, w in enumerate(weights):
        if i == len(weights) - 1:
            shares.append(amount_c - sum(shares))
        else:
            shares.append((2 * amount_c * w + total) // (2 * total))
    return shares


def calculate_sale(totals, mode, entries=None, buyer_total_g=None, mixed_rate_c=None, paid_c=None):
    """Work out a sale.

    mode "per_material": entries = {material_id: {"buyer_weight_g": .., "rate_c": ..}}
                         with one entry for every material in the load
    mode "mixed":        one weight and one price for the whole load
    paid_c: how much the buyer actually paid; None means paid in full
    """
    if not totals["materials"]:
        raise RuleError("This load is empty")
    lines = []
    if mode == "per_material":
        entries = entries or {}
        for group in totals["materials"]:
            entry = entries.get(group["material_id"])
            if not entry or entry["buyer_weight_g"] <= 0 or entry["rate_c"] < 0:
                raise RuleError(f"Enter the buyer's weight and price for every material ({group['material_id']})")
            lines.append({"material_id": group["material_id"], "shop_net_g": group["net_g"],
                          "buyer_weight_g": entry["buyer_weight_g"], "rate_c": entry["rate_c"],
                          "amount_c": line_amount(entry["buyer_weight_g"], entry["rate_c"])})
        amount_c = sum(line["amount_c"] for line in lines)
        buyer_total_g = sum(line["buyer_weight_g"] for line in lines)
    elif mode == "mixed":
        if not buyer_total_g or buyer_total_g <= 0 or mixed_rate_c is None or mixed_rate_c < 0:
            raise RuleError("Enter the buyer's total weight and the price per kilo")
        amount_c = line_amount(buyer_total_g, mixed_rate_c)
        shares = split_by_weight(amount_c, [g["net_g"] for g in totals["materials"]])
        for group, share in zip(totals["materials"], shares, strict=True):
            lines.append({"material_id": group["material_id"], "shop_net_g": group["net_g"],
                          "amount_c": share})
    else:
        raise RuleError("Sale mode must be per_material or mixed")

    if paid_c is None:
        paid_c = amount_c
    if paid_c < 0:
        raise RuleError("Amount paid cannot be negative")
    return {
        "mode": mode,
        "lines": lines,
        "buyer_total_g": buyer_total_g,
        "mixed_rate_c": mixed_rate_c,
        "amount_c": amount_c,
        "paid_c": paid_c,
        "still_owed_c": max(0, amount_c - paid_c),
        "weight_difference_g": buyer_total_g - totals["total_g"],   # buyer's scale minus your scale
    }


def load_margin(totals, sale):
    """Profit for one load: what the buyer paid for it minus what you paid sellers."""
    revenue = {line["material_id"]: line["amount_c"] for line in sale["lines"]}
    return {
        "load_cost_c": totals["cost_c"],
        "sale_amount_c": sale["amount_c"],
        "margin_c": sale["amount_c"] - totals["cost_c"],
        "materials": [{"material_id": g["material_id"], "cost_c": g["cost_c"],
                       "revenue_c": revenue.get(g["material_id"], 0),
                       "margin_c": revenue.get(g["material_id"], 0) - g["cost_c"]} for g in totals["materials"]],
    }
