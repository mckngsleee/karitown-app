"""The whole flow through the API: buy, fill a load, close it, sell it, check the money."""


def buy(client, material_id, gross_g, defect_value=0, **extra):
    body = {"lines": [{"material_id": material_id, "gross_g": gross_g, "defect_value": defect_value}], **extra}
    response = client.post("/purchases", json=body)
    assert response.status_code == 201, response.text
    return response.json()


def test_health(client):
    assert client.get("/health").json() == {"ok": True}


def test_price_list_and_old_price_flag(client):
    materials = {m["id"]: m for m in client.get("/materials").json()}
    assert materials["iron"]["old_price"] is True      # last changed 41 days ago
    assert materials["pet"]["old_price"] is False


def test_first_purchase_starts_a_load(client):
    purchase = buy(client, "carton", 12000, 2000)
    assert purchase["total_c"] == 7500
    assert purchase["number"] == "PUR-0001" and purchase["load_number"] == "L-0001"


def test_same_purchase_sent_twice_is_saved_once(client):
    body = {"id": "phone-made-id-1", "lines": [{"material_id": "pet", "gross_g": 1000}]}
    first = client.post("/purchases", json=body).json()
    second = client.post("/purchases", json=body).json()
    assert first["number"] == second["number"]
    assert len(client.get("/purchases").json()) == 1


def test_removed_material_is_refused(client):
    client.delete("/materials/glass")
    response = client.post("/purchases", json={"lines": [{"material_id": "glass", "gross_g": 1000}]})
    assert response.status_code == 400 and "not on your price list" in response.json()["error"]


def test_correcting_a_purchase_keeps_the_original_as_void(client):
    original = buy(client, "carton", 12000, 2000)
    result = client.post(f"/purchases/{original['id']}/correct",
                         json={"lines": [{"material_id": "carton", "gross_g": 11000, "defect_value": 1000}]}).json()
    assert result["replacement"]["corrects"] == original["number"]
    numbers = {p["number"]: p for p in client.get("/purchases").json()}
    assert numbers[original["number"]]["void"]["reason"].startswith("Corrected")


def test_full_load_life(client):
    buy(client, "carton", 100000)                         # 100 kg x P7.50 = P750.00
    buy(client, "pet", 50000)                              # 50 kg x P18.00 = P900.00
    load = client.get("/loads", params={"state": "OPEN"}).json()[0]

    # Only one open load at a time
    assert client.post("/loads", json={}).status_code == 400

    # Close needs a buyer and a date, then pick up, then sell
    client.post(f"/loads/{load['id']}/close", json={"buyer_id": "b1", "pickup_date": "2026-10-28"})
    locked = client.post("/purchases", json={"lines": [{"material_id": "pet", "gross_g": 1000}]}).json()
    assert locked["load_number"] == "L-0002"              # closed load is locked; a new load starts

    early = client.post("/sales", json={"load_id": load["id"], "mode": "mixed",
                                        "buyer_total_g": 149000, "mixed_rate_c": 1200})
    assert early.status_code == 400                       # must be picked up first

    client.post(f"/loads/{load['id']}/pickup")
    sale = client.post("/sales", json={"load_id": load["id"], "mode": "per_material", "paid_c": 200000,
                                       "entries": {"carton": {"buyer_weight_g": 99000, "rate_c": 900},
                                                   "pet": {"buyer_weight_g": 50000, "rate_c": 2000}}}).json()
    assert sale["amount_c"] == 99 * 900 + 50 * 2000       # P1,891.00
    assert sale["still_owed_c"] == 0 and sale["margin_c"] == 189100 - 165000

    assert [s["number"] for s in client.get("/sales").json()] == [sale["number"]]

    margin = client.get(f"/loads/{load['id']}/margin").json()
    assert margin["margin_c"] == 24100

    # Undo the sale: back to picked up, then reopen without a reason
    client.post(f"/sales/{sale['id']}/void", json={"reason": "wrong price"})
    assert client.get(f"/loads/{load['id']}").json()["state"] == "PICKED_UP"


def test_home_totals_are_separate_and_skip_voids(client):
    kept = buy(client, "iron", 100000)                    # P1,200.00
    voided = buy(client, "pet", 5000)
    client.post(f"/purchases/{voided['id']}/void", json={"reason": "duplicate"})
    summary = client.get("/summary", params={"period": "today"}).json()
    assert summary["cash_out_c"] == kept["total_c"] == 120000
    assert summary["purchase_count"] == 1 and summary["cash_in_c"] == 0
    assert "net_c" not in summary                         # Home shows no net figure


def test_directory_buyers_can_be_hidden_not_edited(client):
    edit = client.put("/buyers/b1", json={"name": "x", "location": "y"})
    assert edit.status_code == 400
    client.delete("/buyers/b1")
    assert "b1" not in [b["id"] for b in client.get("/buyers").json()]


def test_browser_app_is_allowed_to_call_the_api(client):
    # A browser asks first ("preflight") before sending a request with the x-api-key header.
    response = client.options("/purchases", headers={
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type,x-api-key",
    })
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] in ("*", "http://localhost:5173")


def test_phone_upload_keeps_the_phones_ids_numbers_and_times(client):
    # The phone saved these offline, in this order, and uploads them later.
    client.post("/loads", json={"id": "load-1", "number": "L-0008", "created_at": "2026-10-28T01:00:00+00:00"})
    purchase = client.post("/purchases", json={
        "id": "pur-1", "number": "PUR-0042", "created_at": "2026-10-28T01:05:00+00:00", "load_id": "load-1",
        "lines": [{"material_id": "carton", "gross_g": 12000, "defect_value": 2000}]}).json()
    assert purchase["number"] == "PUR-0042" and purchase["load_number"] == "L-0008"
    assert purchase["created_at"] == "2026-10-28T01:05:00+00:00" and purchase["received_at"]

    percent = client.post("/purchases", json={"load_id": "load-1", "lines": [
        {"material_id": "carton", "gross_g": 20000, "defect_mode": "pct", "defect_value": 12.5}]})
    assert percent.status_code == 201 and percent.json()["lines"][0]["defect_value"] == "12.5"

    supplier = client.post("/suppliers", json={"id": "sup-1", "name": "Kuya Jun"}).json()
    again = client.post("/suppliers", json={"id": "sup-1", "name": "Kuya Jun"}).json()
    assert supplier["added_at"] == again["added_at"]          # sent twice, saved once

    client.delete("/suppliers/sup-1")
    assert "sup-1" not in [s["id"] for s in client.get("/suppliers").json()]
    assert "sup-1" in [s["id"] for s in client.get("/suppliers", params={"include_removed": True}).json()]
