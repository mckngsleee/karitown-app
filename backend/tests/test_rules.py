"""Checks for the app/rules/ modules using the worked examples from the business rules (E1, E2, E17...)."""
from datetime import date

import pytest

from app.errors import RuleError
from app.rules import buying, loads, money, prices, selling

CARTON = {"id": "carton", "name": "Carton", "price_mode": "fixed", "price_c": 750, "min_c": None, "max_c": None}
PET = {"id": "pet", "name": "PET bottles", "price_mode": "fixed", "price_c": 1800, "min_c": None, "max_c": None}
TIN = {"id": "tin", "name": "Tin cans", "price_mode": "range", "price_c": None, "min_c": 900, "max_c": 1300}


def test_one_item_with_defect():
    # E1: 12 kg carton, 2 kg wet -> 10 kg x P7.50 = P75.00
    line = buying.calculate_line(CARTON, gross_g=12000, defect_value=2000)
    assert (line["net_g"], line["payable_g"], line["amount_c"]) == (12000, 10000, 7500)


def test_two_items_and_a_changed_price():
    # E2: PET 5 kg - 0.5 kg = P81.00; carton 10 kg - 2 kg at P10.50 = P84.00; total P165.00
    pet = buying.calculate_line(PET, gross_g=5000, defect_value=500)
    carton = buying.calculate_line(CARTON, gross_g=10000, defect_value=2000, rate_c=1050)
    assert (pet["amount_c"], carton["amount_c"]) == (8100, 8400)
    assert carton["price_changed"] is True


def test_defect_as_percent():
    line = buying.calculate_line(CARTON, gross_g=10000, defect_mode="pct", defect_value=20)
    assert line["defect_g"] == 2000            # 20% of 10 kg = 2 kg


def test_range_price_uses_the_middle_and_flags_outside_prices():
    assert prices.listed_rate(TIN) == 1100
    assert buying.calculate_line(TIN, gross_g=1000, rate_c=1500)["out_of_range"] is True


@pytest.mark.parametrize("gross, tare, defect, message", [
    (0, 0, 0, "gross weight"),
    (1000, 1000, 0, "Tare"),
    (1000, 0, 2000, "Defect"),
])
def test_bad_weights_are_refused(gross, tare, defect, message):
    with pytest.raises(RuleError, match=message):
        buying.calculate_line(CARTON, gross_g=gross, tare_g=tare, defect_value=defect)


def test_removed_material_cannot_be_bought():
    with pytest.raises(RuleError, match="not on your price list"):
        buying.calculate_line({**CARTON, "removed": True}, gross_g=1000)


def test_load_totals_skip_void_purchases():
    load = {"id": "L1", "capacity_g": 200000}
    line = buying.calculate_line(CARTON, gross_g=100000)
    purchases = [{"load_id": "L1", "void": None, "lines": [line]},
                 {"load_id": "L1", "void": {"reason": "mistake"}, "lines": [line]}]
    totals = loads.load_totals(load, purchases)
    assert (totals["total_g"], totals["percent_full"], totals["full"]) == (100000, 50.0, False)


def test_mixed_sale_parts_add_up_to_the_sale_amount():
    # E17: one price for the whole load is split by weight; the last part takes the leftover centavos
    shares = selling.split_by_weight(70001, [70000, 30001])
    assert sum(shares) == 70001


def test_week_starts_on_monday():
    assert money.period_dates("week", date(2026, 10, 29)) == (date(2026, 10, 26), date(2026, 10, 29))
