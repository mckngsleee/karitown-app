# Karitown business rules

## Glossary

| Term | Meaning | Stored as |
|---|---|---|
| Gross weight | What the scale shows, including the sack | grams |
| Tare weight | The weight of the sack or container | grams |
| Net weight | Gross minus tare | grams |
| Defect (bawas) | Weight taken off for wet, dirty or mixed material | grams |
| Payable weight | Net minus defect. The weight that gets paid | grams |
| Listed rate | The price per kilo on the price list | centavos per kg |
| Applied rate | The price per kilo actually paid | centavos per kg |
| Line amount | Payable weight times applied rate | centavos |
| Purchase | One seller visit with one or more weighed items. Cash out | record |
| Load | The scrap collected for one truck pickup | record |
| Sale | A picked-up load sold to a buyer. Cash in | record |
| Load cost | What was paid to sellers for everything in a load | centavos |
| Margin | Sale amount minus load cost | centavos |
| Void | A cancelled record that is kept, with a reason | part of the record |

## Units: screen vs backend

The owner types kilos and pesos. The app stores grams and centavos.

| Item | On screen | Stored |
|---|---|---|
| Weight | Kilos, up to 3 decimals (12.5 kg) | Whole grams (12,500) |
| Truck capacity | Kilos (2,000 kg) | Whole grams (2,000,000) |
| Defect | Kilos or a percent | Grams, plus what was typed |
| Money | Pesos, 2 decimals (₱75.00) | Whole centavos (7,500) |
| Rate | Pesos per kilo (₱7.50/kg) | Centavos per kg (750) |

## Invariants

Rules that are always true, on every screen.

1. Weight is whole grams and money is whole centavos. No decimals are stored.
2. Each line amount is rounded to the nearest centavo. Totals add up the rounded lines.
3. Purchases, sales and price history are never deleted. A mistake is voided with a reason.
4. Removed materials, suppliers and buyers are hidden, but past records still show their names.
5. Every record gets its ID on the phone. Numbers like PUR-0042 are for display.
6. Every record keeps the time it was saved on the phone and the time the server received it.
7. A purchase line always stores both the listed rate and the applied rate.
8. Only one load is Open at a time.
9. Purchases can be added, edited or voided only while their load is Open.
10. Input that fails a check is never saved.

## Buying

```
net      = gross - tare
payable  = net - defect
amount   = payable x applied rate
```

- The shop buys only materials on its price list.
- Gross must be above 0, tare less than gross, and defect not more than net.
- Payment is Cash or Cashless. The app only records it.
- A saved purchase goes into the Open load. If none is open, a load is started.

## Truck load states and transitions

| From | To | Condition |
|---|---|---|
| (none) | Open | No other load is Open. Started by the owner or by the first purchase |
| Open | Closed | At least one purchase, a buyer chosen, and a pickup date set |
| Closed | Picked up | The owner confirms the buyer took the load |
| Picked up | Sold | The sale is recorded |
| Closed | Open | No other load is Open. A reason is required |
| Picked up | Open | No other load is Open. The buyer and pickup date are cleared |
| Sold | Picked up | Only by voiding the sale |

At 90% full the load shows a warning. At 100% the app asks the owner to close the load or raise the capacity.

## Sale screen: "How this load did"

| Label | Comes from | Helper text on screen |
|---|---|---|
| Sale amount | Buyer's weight times buyer's price | Buyer's weight × buyer's price |
| Your scale | Net weight of all purchases in the load | Net weight of every purchase in this load, added up |
| Buyer's scale | The weights the owner enters from the buyer | What the buyer weighed |
| Weight difference | Buyer's scale minus your scale | A minus means the buyer counted less |
| Load cost | Sum of all line amounts in the load | What you paid sellers for everything in this load |
| Margin | Sale amount minus load cost | Before labor, transport and rent |

## Syncing

- Every change saves on the phone first and waits to upload.
- Changes upload in order when the phone is online.
- The server saves each record only once, even if it is sent twice.
- A phone that lost its data downloads the shop's records from the server.

## Data model summary

Every record also has an `id` made on the phone.

| Record | Fields |
|---|---|
| material | name, name_tl, category, price_mode (fixed, range, negotiable), price_c, min_c, max_c, price_updated_at, history, removed |
| supplier | name, type, contact, added_at, removed |
| buyer | name, type, location, contact, materials, source (directory, private), hidden |
| purchase | number, supplier_id, payment, lines, total_c, load_id, corrects, void, created_at, received_at |
| purchase line | material_id, gross_g, tare_g, net_g, defect_mode, defect_g, defect_reason, payable_g, listed_rate_c, rate_c, price_changed, out_of_range, amount_c |
| load | number, state (OPEN, CLOSED, PICKED_UP, SOLD), capacity_g, buyer_id, pickup_date, picked_up_at, history |
| sale | number, load_id, buyer_id, mode (per_material, mixed), lines, buyer_total_g, mixed_rate_c, amount_c, paid_c, payment, void, created_at, received_at |

Fields ending in `_g` are grams. Fields ending in `_c` are centavos.
