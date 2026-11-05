"""Fill the database with the same sample shop as the prototype.

Run once after deploying (or locally):  python -m app.demo_data
"""
from datetime import datetime, timedelta, timezone

from . import database as db

now = datetime.now(timezone.utc)


def days_ago(days):
    return (now - timedelta(days=days)).isoformat()


MATERIALS = [
    # id, name, Tagalog, category, mode, price, min, max, price last changed (days ago)
    ("pet", "PET bottles", "Bote ng plastik", "Plastic", "fixed", 1800, None, None, 6),
    ("carton", "Carton", "Karton", "Paper", "fixed", 750, None, None, 12),
    ("paper", "Mixed paper", "Halo-halong papel", "Paper", "fixed", 600, None, None, 12),
    ("iron", "Scrap iron", "Bakal", "Metal", "fixed", 1200, None, None, 41),
    ("tin", "Tin cans", "Lata", "Metal", "range", 1100, 900, 1300, 20),
    ("alu", "Aluminum cans", "Lata ng softdrinks", "Metal", "fixed", 6000, None, None, 35),
    ("copper", "Copper wire", "Tanso", "Metal", "negotiable", 38000, None, None, 3),
    ("glass", "Glass bottles", "Bubog", "Glass", "fixed", 100, None, None, 60),
]

SUPPLIERS = [
    ("s1", "Mang Ben Dela Cruz", "Collector (staff)", "0917 555 0142"),
    ("s2", "Aling Nena's Store", "Business", ""),
]

# Shared directory of buyers (the shop can hide these but not edit them).
DIRECTORY_BUYERS = [
    ("b1", "Bayanihan Recycling Corp.", "Recycling plant", "Valenzuela", ["pet", "carton", "paper", "iron"],
     "Office (02) 8294 1180", "Sep 2026"),
    ("b2", "Tondo Metal Traders", "Middleman", "Manila (Tondo)", ["iron", "alu", "copper", "tin"],
     "Office 0928 410 2231", "Aug 2026"),
    ("b3", "Malabon Paper Mill", "Recycling plant", "Malabon", ["carton", "paper"],
     "Office (02) 8281 0094", "Sep 2026"),
    ("b4", "R&J Junk Buyer", "Junk buyer", "Caloocan", ["pet", "alu", "tin", "glass"], "Ask at shop", "Jul 2026"),
]


def load_demo_data():
    for id, name, name_tl, category, mode, price, low, high, age in MATERIALS:
        db.save("material", {"id": id, "name": name, "name_tl": name_tl, "category": category, "price_mode": mode,
                             "price_c": price, "min_c": low, "max_c": high, "removed": False,
                             "price_updated_at": days_ago(age), "history": []})
    for id, name, type, contact in SUPPLIERS:
        db.save("supplier", {"id": id, "name": name, "type": type, "contact": contact,
                             "added_at": days_ago(30), "removed": False})
    for id, name, type, location, materials, contact, verified in DIRECTORY_BUYERS:
        db.save("buyer", {"id": id, "name": name, "type": type, "location": location, "contact": contact,
                          "materials": materials, "source": "directory", "verified": verified, "hidden": False})


if __name__ == "__main__":
    load_demo_data()
    print("Demo data loaded")
