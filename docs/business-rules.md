# Phase 1 Business Rules Spec · Version 1.0

Karitown (Kariton Rolling Into Town), a junkshop owner app

Version 1.0 · October 26, 2026 · First release · Aligned to Karitown Prototype v1.0 · Based on interview draft v0.1 (October 25, 2026)

> Version 1.0 is the first release of the rules. It builds on the interview draft v0.1 and matches the owner-reviewed prototype. Rules marked **[CHANGED]** or **[NEW]** differ from the interview draft. Rules tagged A1 to A8 are still assumptions from two owner interviews and need validation. Each numbered rule should become at least one test in the core package.

> **How this repo uses this spec:** this is the product's full rules document. The backend in `backend/` implements the rules for one shop, with these simplifications:
> - Record ids are UUIDs made by the phone, not ULIDs.
> - Sync is one request per record. Sending the same id twice is ignored, instead of using a queue of "ops".
> - The "Picked up" step is stored as `PICKED_UP`.
> - Data is stored in DynamoDB instead of PostgreSQL.

## Changes from the interview draft (v0.1)

| Area | Change | Rule |
|---|---|---|
| Refused materials | The accepted flag and refusal reason are removed. A material is bought only if it is on the list; anything not listed is refused. | R1.2 |
| Categories | Every material belongs to one category. Six defaults; owners can add more. | R1.8–R1.11 |
| Material CRUD | Owners create, edit and remove materials. Removal is a soft delete. | R1.12–R1.14 |
| Payment method | Two values only: Cash and Cashless (GCash, Maya, bank transfer). | R2.7, R4.4 |
| Purchase editing | Draft lines are editable. Saved lines in an open load can be edited or removed through a correction (void plus new purchase). | R2.13–R2.16 |
| Load states | Closing a load requires a buyer and pickup date. DISPATCHED now means the buyer has physically picked up the load. Estimate by eye removed. Reopening from DISPATCHED needs no reason. | R3.7 |
| Capacity alert | Reaching 100% prompts the owner to raise capacity or close the load. Owners can start an open load manually. | R3.5, R3.9 |
| Home summary | Cash out and cash in shown as two independent totals with their own period filter. No net on Home. | R5.7 |
| Buyers | Private buyers have full CRUD and can list materials not on the shop's price list. Directory buyers can be hidden per shop. | R7.6–R7.9 |
| Suppliers | Consent records removed while the app is owner-only. Suppliers have full CRUD. Type list renamed. | R8 |

## Scope and principles

Defines every rule the core package implements for the phase 1 features, so each rule can become a test. Anything not listed here is not built. Out of scope: scavenger views, public price pages, households, pooling, e-waste, picker or staff accounts, buyer or EPR reports, LGU dashboards, receivables follow-up, cash advances. Data stays clean enough to support them later.

The app is offline-first and installed as a PWA on the owner's Android phone. Every write lands in local storage first and syncs when there is signal. The core logic is a pure function layer with no I/O; storage, clock and ID generation are injected.

## Glossary

| Term | Meaning | Stored as |
|---|---|---|
| **Weights** | | |
| Gross weight | Scale reading including container or sack | integer grams |
| Tare weight | Weight of container, sack or other non-material | integer grams |
| Net weight | Gross minus tare | integer grams |
| Defect (bawas) | Weight removed from net for moisture, dirt or contamination | integer grams |
| Payable weight | Net minus defect | integer grams |
| Your scale (shop net) | Sum of net weights of all non-void lines in a load | integer grams (derived) |
| Buyer's scale | Weight the buyer recorded at sale, entered by the owner | integer grams |
| Weight difference | Buyer's scale minus your scale (v0.1 "variance") | integer grams (derived) |
| **Money** | | |
| Listed rate | Price on the list at purchase time | integer centavos per kg |
| Applied rate | Rate actually paid on this line | integer centavos per kg |
| Line amount | round(payable_g × applied_rate / 1000), half up | integer centavos |
| Load cost | What the owner paid sellers for everything in a load | integer centavos (derived) |
| Margin | Sale amount minus load cost, before labor, transport and rent | integer centavos (derived) |
| **Records** | | |
| Material | An item the shop buys, with a category and price mode | record |
| Category | A group of materials (Plastic, Paper, Metal…) | record |
| Purchase | One supplier visit with one or more lines; cash out | record |
| Correction | A void of a purchase plus a new purchase that replaces it | void + record with corrects_id |
| Load | Material held for one buyer pickup, tracked against truck capacity | record |
| Sale | A picked-up load sold to a buyer; cash in | record |
| Supplier | Person or business selling to the shop; walk-in by default | record |
| Buyer | Business that picks up and pays for loads; directory or private | record |
| Void | Correction marker that cancels a record without deleting it | fields on the record + op |

### Units: screen vs backend

Screens show and accept kilos and pesos. The core logic, database and sync only hold grams and centavos. Conversion happens once, at the screen edge, by parsing the typed digits (no floating point multiply).

| Item | Screen | Backend |
|---|---|---|
| Weight | Kilos, up to 3 decimals (12.5 kg) | Integer grams (12,500) |
| Truck capacity | Kilos (2,000 kg) | capacity_g (2,000,000) |
| Defect | Kilos by default, or a percent | defect_g + defect_raw + defect_mode |
| Money | Pesos, 2 decimals (₱75.00) | Integer centavos (7,500) |
| Rate | Pesos per kilo (₱7.50/kg) | Integer centavos per kg (750) |

## Invariants

Rules that hold everywhere, enforced in the core so no screen or sync path can break them.

1. Weight is integer grams and money is integer centavos inside the app's logic and database. No floating point.
2. Each line amount rounds half up to the nearest centavo. Totals are sums of rounded lines.
3. Transaction records (purchases, sales, price events, load events) are never deleted. Corrections use a void plus a new record, and the void keeps a reason.
4. Reference records (materials, categories, suppliers, private buyers) are soft-deleted with removed_at so history can still resolve their names. **[NEW]**
5. Every record has a client-generated ULID. Human numbers (PUR-0043, SAL-0020, L-0009) are sequential per shop and are for display only.
6. Every record stores recorded_at (device time) and, after sync, received_at (server time). Dates are bucketed in Asia/Manila time.
7. A purchase line always stores listed rate, applied rate and an override flag, even when the rates are equal.
8. Exactly zero or one load is OPEN per shop at any time.
9. Lines in a load that is not OPEN cannot be added, edited, corrected or voided. The load must be reopened first.
10. Transactions reference suppliers and buyers only by ID. Supplier contact fields live in the supplier record, not in transactions.
11. The core has no I/O. Time, IDs and storage are passed in.
12. Weight and money inputs that fail validation never produce a record.

## R1 Materials, categories and prices

Defines the price list, its categories, the three price modes and the price history.

1. A material has an English name (required), a Tagalog name (optional), a category_id, a display unit (kg only in phase 1), a price mode with its values, last_updated and removed_at. **[CHANGED]**
2. Only materials on the list can be bought. A material not on the list is refused. There is no accepted flag or refusal reason. **[CHANGED]** (A1)
3. Price modes:
   a. Fixed: one price per kg. Applied rate defaults to it.
   b. Range: min and max per kg, with min ≤ max. Applied rate defaults to round((min + max) / 2). Owner can tap Min, Mid or Max.
   c. Negotiable: a reference price per kg (last agreed). Applied rate defaults to it and must be confirmed at each purchase.

4. Every create or price edit appends a PRICE_EVENT (material_id, old value, new value, mode, time) and updates last_updated. Creation records old value "New". History is never rewritten.
5. Override at purchase: applied_rate ≠ listed_rate sets override = true. For Range materials, a rate outside min and max is allowed but sets out_of_range = true.
6. A price is stale when last_updated is older than 30 days. Staleness is shown only inside the material list: a banner with the stale count, red text on each stale item, and an "N old" badge on its category header (A2).
7. Price must be ≥ 0. Zero is allowed (free pickup) but needs a confirm.
8. Default categories, seeded per shop: Plastic (Plastik), Paper (Papel), Metal (Metal at bakal), Glass (Bubog), Electronics (Elektroniko), Other (Iba pa). **[NEW]**
9. An owner can add a category with an English name (required) and Tagalog name (optional). Names are unique per shop, case-insensitive; adding an existing name selects that category instead. **[NEW]**
10. Categories are listed in creation order. A category with no materials still appears in the price list with an empty state. Categories cannot be renamed or deleted in phase 1. **[NEW]**
11. The price list and the intake material picker group materials by category. Collapsing a category is a device-only view preference and is not synced. **[NEW]**
12. Create: from "+ Add" on a category header (category preselected) or from the editor. Required: English name, category, price values valid for the mode. **[NEW]**
13. Update: name, Tagalog name, category and price mode can change. A price or mode change appends a PRICE_EVENT. Name and category changes do not. **[NEW]**
14. Remove: sets removed_at. The material disappears from the price list, intake and buyer material filters, so it becomes refused. Past purchase and sale lines still resolve its name and keep their stored rates. **[NEW]**

## R2 Intake purchase (Pasok Kalakal)

Defines how a purchase line is computed, how a purchase is built and saved, and how saved purchases are corrected.

1. net_g = gross_g − tare_g. Tare defaults to 0.
2. Defect is typed in kilos by default. In percentage mode, defect_g = round(net_g × pct / 100). The raw input and its mode are stored; defect_g is the value used.
3. payable_g = net_g − defect_g.
4. line_amount = round(payable_g × applied_rate / 1000), half up.
5. Validation: gross_g > 0; tare_g ≥ 0; tare_g < gross_g; 0 ≤ defect_g ≤ net_g; payable_g > 0; applied_rate ≥ 0; percent between 0 and 100.
6. Defect reason is optional (moisture, dirt, mixed material, other). The reason choice is shown only when defect_g > 0.
7. Supplier defaults to Walk-in (no supplier record). Payment method is CASH or CASHLESS, default CASH. CASHLESS covers GCash, Maya and bank transfer; it is recorded only, never processed. **[CHANGED]**
8. A purchase total is the sum of its lines. Saving assigns the purchase to the single OPEN load (R3). If none is open, one is created with the previous load's capacity.
9. Voiding a purchase requires a reason (quick picks: wrong weight, wrong material, wrong supplier, duplicate; or free text), removes its lines from load and ledger totals, and keeps the record visible as void. Allowed only while its load is OPEN.
10. A1 to validate: kilos is the default because it matches how owners say it (bawas kilo).
11. Unit conversion follows the units table. Validation and every calculation use grams.
12. Defect control: a Kilos/Percentage toggle under the defect field, quick chips 5%, 10%, 20% in percent mode, and a live preview such as "20% = −2.0 kg".
13. Multi-select: the owner can select several materials at once, then weigh them one after another. Each confirmed line is added to the draft before the next opens. **[NEW]**
14. A draft purchase (not yet saved) is local state. Its lines can be edited or removed freely; nothing is synced until Save. **[NEW]**
15. Editing a saved line is a correction: the original purchase is voided with reason "Corrected → PUR-xxxx", and a new purchase is created with the same supplier, payment method and load, containing all original lines with the edited line replaced. The new purchase stores corrects_id = original ID. **[NEW]**
16. Removing a saved line is the same correction with that line omitted. If no lines remain, only the void is written, with reason "Line removed". Corrections are allowed only while the load is OPEN. **[NEW]**

## R3 Load tracker (Karga)

Defines how a load fills and the states it passes through before it becomes a sale.

1. One OPEN load per shop at a time (A3).
2. Capacity is typed in kg (slider or typed entry) and stored as capacity_g. It cannot be set below the current total_g. Editable only while OPEN.
3. Fill uses net weight, because wet or dirty material still occupies the truck (A4).
4. total_g = sum of net_g of non-void lines. percent_filled = total_g / capacity_g, shown to one decimal. remaining_g = max(0, capacity_g − total_g).
5. A purchase that exceeds capacity is allowed. At ≥ 90% the load shows "almost full". At ≥ 100% the app shows a prompt right after saving with two actions: Close and choose buyer, or Raise capacity. Home and the Load tab show a full-truck banner until one is done. **[CHANGED]**
6. The load groups lines by material (net weight, cost, line count). Tapping a material lists every non-void purchase line that makes up its weight, with supplier, time, gross, tare, defect and rate. In an OPEN load each line can be edited or removed per R2.15–R2.16. **[CHANGED]**
7. States and transitions: **[CHANGED]**

| From | To | Condition and effect | Screen label |
|---|---|---|---|
| — | OPEN | No other OPEN load. Created by "Start new load" or by the first purchase saved with no open load. | Open · Bukas |
| OPEN | CLOSED | At least one non-void line, buyer_id chosen, planned pickup date set. Owner confirms in a dialog naming the buyer, weight and date. No estimate by eye. | Closed · Sarado |
| CLOSED | DISPATCHED | Owner confirms the buyer took the load. Sets picked_up_at to now. | Picked up · Nakuha na |
| DISPATCHED | SOLD | Sale recorded (R4). | Sold · Nabenta |
| CLOSED | OPEN | No other OPEN load. Reason required and logged. | Reopen |
| DISPATCHED | OPEN | No other OPEN load. No reason required. Clears buyer_id, pickup date and picked_up_at. Logged as "Reopened from picked up". | Reopen |
| SOLD | DISPATCHED | Only by voiding the sale (R4.6). | — |

8. Each load detail shows a four-step progress bar (Open, Closed, Picked up, Sold) and one "Next step" sentence for its current state, with one primary action: Close load, Mark as picked up, Record sale, or See margin.
9. The Load tab lists all loads, newest first, filterable by state (All, Open, Closed, Picked up, Sold) with counts. When no load is open it offers "Start new load". **[NEW]**
10. Choosing the buyer happens on the close step. The buyer list supports adding a buyer inline (R7.6) and long-press (550 ms) to edit, delete or hide a buyer. A buyer added there is selected automatically. **[NEW]**

## R4 Sale

Defines how a picked-up load becomes a sale, and how the buyer's weights are compared with the shop's.

1. A sale references exactly one load (in DISPATCHED) and its buyer.
2. Per material mode: one line per material in the load, each with buyer_weight_g and rate. Mixed mode (A5): one total buyer weight and one mixed rate. In mixed mode revenue is allocated to materials by shop net share, rounded per material, with the last material taking the remainder so allocations sum to sale_amount exactly. Allocation is for margin reporting only.
3. sale_amount = sum of rounded line amounts, or round(total_g × mixed_rate / 1000).
4. Payment method is CASH or CASHLESS, labelled "Payment method: how the buyer paid you for this load". paid_amount defaults to sale_amount. paid_amount < sale_amount sets receivable = true (flag only). **[CHANGED]**
5. Weight difference per material = buyer_weight_g − shop_net_g. Total difference as a percent of shop weight, one decimal. Estimate error is removed. **[CHANGED]**
6. Voiding a sale requires a reason and returns the load to DISPATCHED.
7. The sale screen shows the sale amount first, then "How this load did" with each figure and its plain-language source: **[NEW]**

| Label | Computed from | Helper text on screen |
|---|---|---|
| Sale amount | R4.3 | Buyer's weight × buyer's price |
| Your scale | total_g of the load (R3.4) | Net weight of every purchase in this load, added up |
| Buyer's scale | Sum of buyer_weight_g, or total_g in mixed mode | What the buyer weighed |
| Weight difference | Buyer's scale − your scale, and percent | A minus means the buyer counted less |
| Load cost | R6.1 | What you paid sellers for everything in this load |
| Margin | Sale amount − load cost | Before labor, transport and rent |

## R5 Ledger and Home summary

1. Purchases are cash out. Sales are cash in. Voided records are shown struck through and excluded from totals.
2. Periods: Today, This week (Monday start, A6), This month, and Custom (from and to dates, inclusive), using Asia/Manila dates from recorded_at.
3. cash_in = sum of sale paid_amount in the period. cash_out = sum of purchase totals in the period. net = cash_in − cash_out.
4. The ledger's in/out bar shows each as a share of cash_in + cash_out.
5. Transaction detail shows party, type, payment method, per-line breakdown (scale weight, tare, net, defect, payable, listed and applied rate), total, and an audit tab (ULID, number, recorded time, received time or "waiting to sync", status, remarks including void reason or "Correction of PUR-xxxx").
6. Net cash flow is not profit. Profit is defined in R6.
7. Home shows Cash out (Biniling Kalakal) and Cash in (Kita sa Nakalakal) as two independent totals with their own period filter (default Today) and a record count each. Home shows no net figure; a purchase never changes the cash-in total and a sale never changes the cash-out total. **[NEW]**
8. Home also shows the open load's fill, the full-truck banner (R3.5), a link to Materials & prices, and the four most recent records. **[NEW]**

## R6 Margin

1. Load cost = sum of line amounts of non-void purchase lines in the load.
2. Per material: cost_m = sum of its line amounts; revenue_m = its sale line amount or allocated share (R4.2); margin_m = revenue_m − cost_m.
3. Load margin = sale_amount − load cost. A load counts toward the week its sale was recorded.
4. Stock on hand in the open load is valued at cost.
5. Labelled a gross margin estimate. It excludes labor, transport, rent and weight loss between scales (shown separately as weight difference).

## R7 Buyers

1. Two kinds: directory buyers (curated, shared, read-only on the device) and private buyers (added by the owner, visible only to that shop).
2. Fields: name, type (junk buyer, recycling plant, middleman, other), city or barangay, materials collected, contact (business contact only), source, verified_at.
3. Filters combine with AND across location, type and search text. The material filter matches any selected material.
4. The directory is a versioned file cached on the device with its as-of date. No online map tiles. Location is a dropdown.
5. Contact details of individuals are not published in the shared directory without that person's permission.
6. Create private buyer: name and city or barangay required; type defaults to junk buyer; contact optional. Available from the top of the Buyers screen and from the close-load buyer list. **[NEW]**
7. Materials collected is a set of entries. Each entry is either a material_id from the shop's list or a free-text name for a material the shop does not buy. Free-text names match a listed material by name, case-insensitive, and become that material_id. Free-text entries never create materials or prices. **[NEW]**
8. Update and delete apply to private buyers only. Delete is a soft delete; past loads and sales keep the name. Deleting a buyer selected in the close step clears the selection. **[NEW]**
9. Directory buyers can be hidden per shop. Hidden IDs are stored per shop; the directory file is not changed. **[NEW]**

## R8 Suppliers **[CHANGED]**

1. Default supplier is Walk-in: no supplier record, supplier_id = null on the purchase.
2. A saved supplier has name (required), type, mobile (optional), added_at and removed_at. No consent record is required while the app is used only by the owner.
3. Supplier types: Collector (staff), Walk-in, Business, Other. "Collector (staff)" is a person the owner employs to collect material. "Walk-in" as a type marks a named seller who visits on their own, and is different from the unnamed default in R8.1.
4. Update: name, type and mobile can change. Past transactions show the current name.
5. Remove: soft delete. The supplier disappears from the list and picker; past purchases show the name with "(removed)". If the removed supplier is on the current draft, the draft falls back to Walk-in.
6. Supplier personal fields stay in the supplier record; transactions reference only supplier_id (invariant 10), so consent and erasure can be added later without migrating transactions.

## R9 Sync

1. Every write is queued locally as an op with a ULID op_id and sent when online. The server applies each op_id once (idempotent).
2. Append-only ops: PURCHASE, VOID, SALE, PRICE_EVENT, LOAD_OPEN, LOAD_CLOSE, LOAD_DISPATCH, LOAD_REOPEN.
3. Last-write-wins per field: MATERIAL (create, update, remove), CATEGORY (create), SUPPLIER (create, update, remove), BUYER (private create, update, delete), BUYER_HIDE, load capacity.
4. Load state changes follow R3. The server rejects line ops (purchase, void, correction) whose load is not OPEN at the op's position in the queue.
5. Directory buyers are server-authoritative.
6. One device per shop in phase 1 (A7). Reinstalling restores data from the server.
7. The header always shows sync state: Offline with the number of queued ops, Syncing, or Synced.

## Data model summary

Minimum fields for the backend. Every table also carries id (ULID), shop_id, recorded_at and received_at.

| Entity | Fields |
|---|---|
| category | name_en, name_tl?, sort_order, is_default |
| material | category_id, name_en, name_tl?, unit='kg', price_mode (FIXED\|RANGE\|NEGOTIABLE), price_c, min_c?, max_c?, last_updated, removed_at? |
| price_event | material_id, mode, old_value, new_value, at |
| purchase | number, supplier_id?, payment_method (CASH\|CASHLESS), load_id, total_c, corrects_id?, void_reason?, voided_at? |
| purchase_line | purchase_id, material_id, gross_g, tare_g, net_g, defect_g, defect_mode (KG\|PCT), defect_raw, defect_reason?, payable_g, listed_rate_c, applied_rate_c, override, out_of_range, amount_c |
| load | number, state (OPEN\|CLOSED\|DISPATCHED\|SOLD), capacity_g, buyer_id?, pickup_date?, picked_up_at? |
| load_event | load_id, from_state, to_state, reason?, at |
| sale | number, load_id, buyer_id, mode (PER_MATERIAL\|MIXED), mixed_rate_c?, buyer_total_g, amount_c, paid_c, payment_method, receivable, void_reason?, voided_at? |
| sale_line | sale_id, material_id, buyer_weight_g, shop_net_g, rate_c?, amount_c (or allocated_c in mixed mode) |
| supplier | name, type (COLLECTOR_STAFF\|WALK_IN\|BUSINESS\|OTHER), mobile?, added_at, removed_at? |
| buyer | source (DIRECTORY\|PRIVATE), name, type, location, contact?, verified_at?, removed_at? |
| buyer_material | buyer_id, material_id? \| free_text_name? |
| buyer_hidden | buyer_id (directory) |
| op_queue (device) | op_id, type, payload, created_at, sent_at? |

## Decisions on open design questions

| Question | Decision | Changes if |
|---|---|---|
| Defect handling | Store raw input and gram result (R2) | Owners price by percent of price only |
| Load to sale | Close with buyer, confirm pickup, record sale (R3, R4) | Buyer pays at pickup, so the two steps merge |
| Refused materials | Refused means not on the list (R1.2) | Staff need to see why an item is refused |
| Editing saved purchases | Correction = void + new record (R2.15) | Nothing expected; keeps audit trail |
| Profit vs cash flow | Separate cash totals plus load margin (R5, R6) | Owners do not log mixed loads per material |
| Supplier consent | Not required while owner-only (R8) | Staff accounts, data sharing, or legal review |
| Sync | One device per shop (R9) | Staff use a second phone |

## Assumptions to validate with owners

- A1: When cardboard is wet, do you lower the price per kilo or subtract weight? How much?
- A2: How often does each material price change, and who tells you?
- A3: Do you ever hold more than one pile or truck at a time?
- A4: Is wet or dirty material still loaded on the truck, or thrown away?
- A5: Does the buyer pay one price for the whole mixed load or a price per material?
- A6: When does your business week start, and when do you want to see weekly profit?
- A7: Does the owner use one phone, or do staff use another?
- A8: When are you paid after a pickup, and do you ever give cash advances?
- A9: Do the six default categories match how you sort material in the yard? **[NEW]**
- A10: Is the buyer always known when you decide to close a load? **[NEW]**

## Worked examples

Each case becomes a test. Weights in grams, rates in centavos per kg, amounts in centavos. E1–E10 carry over from the interview draft except where noted.

| ID | Case | Expected |
|---|---|---|
| E1 | Gross 12,000, tare 0, defect 2,000, rate 750 | net 12,000; payable 10,000; amount 7,500 (₱75.00) |
| E2 | PUR-0042: PET gross 5,000, defect 500, rate 1,800; carton gross 10,000, defect 2,000, rate 1,050 | PET 8,100; carton 8,400; total 16,500; payable 12,500 g |
| E3 | Load: 350,000 at 1,800; 200,000 at 600 (override, listed 750); 600,000 at 600; 100,000 at 1,200; capacity 2,000,000 | total 1,250,000 g; 62.5%; remaining 750,000 g; cost 1,230,000 |
| E4 | Override: listed 750, applied 700, payable 10,000 | amount 7,000; override true |
| E5 | Percent defect: net 100,000, 20%, rate 750 | defect 20,000; payable 80,000; amount 60,000 |
| E6 | Tare 12,000 with gross 12,000 | rejected |
| E7 | Load cost 1,230,000, sale 1,400,000 | margin 170,000 (₱1,700.00) |
| E8 | Same purchase op sent twice | one record |
| E9 | Net 10,000, percentage mode, owner types 20 | defect 2,000 stored; preview "20% = −2.0 kg" |
| E10 | Owner types 1.5 in kilos mode | stored 1,500 g; shown 1.5 kg |
| E11 | Correction: in open load, PUR-0040 paper line gross 600,000 at 600 edited to gross 550,000 | PUR-0040 void "Corrected → PUR-0043"; PUR-0043 amount 330,000, corrects_id = PUR-0040; load total −50,000 g |
| E12 | Edit a line in a CLOSED load | rejected; load must be reopened |
| E13 | Close an OPEN load with no buyer chosen | rejected |
| E14 | Reopen a DISPATCHED load with no reason, no other open load | state OPEN; buyer_id, pickup_date, picked_up_at null; load_event logged |
| E15 | Reopen a CLOSED load while another load is OPEN | rejected |
| E16 | Save a purchase that brings total_g to 2,000,000 of 2,000,000 | saved; 100.0%; full-truck prompt shown |
| E17 | Mixed sale L-0007: shop net PET 300,000, carton 400,000, paper 462,500, iron 100,000; buyer total 1,250,000 at 1,120 | sale 1,400,000; allocated 332,673 / 443,564 / 512,871 / 110,892; difference −12,500 g (−1.0%) |
| E18 | Home, Today: one purchase 16,500 voided, one purchase 120,000, no sales | cash out 120,000 (1 purchase); cash in 0 (0 sales) |
| E19 | Remove material Glass bottles that has past purchases | hidden from intake and list; past lines still show "Glass bottles" and stored rates |
| E20 | Add category "plastic" when "Plastic" exists | no new category; existing Plastic selected |
| E21 | Private buyer materials: tap PET, type "car batteries", type "carton" | entries: material pet, free text "car batteries", material carton |

## Screen map

| Prototype v1.0 screen | Rules |
|---|---|
| Home | R5.7–R5.8, R3.5 |
| Materials & prices, Add/Edit material | R1 |
| Buy: New purchase, Choose materials, Weigh item | R2 |
| Load: list, Load details, Purchases in load | R3, R2.15–R2.16 |
| Choose buyer (close step) | R3.7, R3.10, R7.6–R7.9 |
| Record sale | R4 |
| Ledger, Transaction detail | R5.1–R5.6 |
| Margin | R6 |
| Buyers, Add/Edit private buyer | R7 |
| Suppliers, Supplier detail, Add/Edit supplier | R8 |
| Sync, header chip | R9 |
