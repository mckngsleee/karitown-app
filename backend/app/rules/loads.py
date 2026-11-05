"""Rules for truck loads (the Karga screen).

A load moves through four steps: OPEN -> CLOSED -> PICKED_UP -> SOLD.
"""
from ..errors import RuleError

LOAD_STEPS = ["OPEN", "CLOSED", "PICKED_UP", "SOLD"]


def load_totals(load, purchases):
    """Add up the non-void purchases in a load, per material."""
    by_material = {}
    for p in purchases:
        if p["load_id"] != load["id"] or p.get("void"):
            continue
        for line in p["lines"]:
            group = by_material.setdefault(line["material_id"], {"material_id": line["material_id"],
                                                                  "net_g": 0, "cost_c": 0, "lines": 0})
            group["net_g"] += line["net_g"]
            group["cost_c"] += line["amount_c"]
            group["lines"] += 1
    total_g = sum(g["net_g"] for g in by_material.values())
    cost_c = sum(g["cost_c"] for g in by_material.values())
    percent = round(total_g * 100 / load["capacity_g"], 1)
    return {
        "total_g": total_g,
        "cost_c": cost_c,
        "percent_full": percent,
        "remaining_g": max(0, load["capacity_g"] - total_g),
        "almost_full": percent >= 90,
        "full": percent >= 100,
        "materials": list(by_material.values()),
    }


def require_state(load, state, action):
    if load["state"] != state:
        raise RuleError(f"Cannot {action}: load {load['number']} is {load['state']}")
