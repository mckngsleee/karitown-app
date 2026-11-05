// Everything the owner can do. Each action changes the records on the phone right away and,
// when it is something the server must know, adds an "op" to the Waiting to upload list
// (see sync.ts). This is what lets the app work with no signal.

import { dayKey, kg, kgIn, listedRate, parseKg, parsePeso, peso, pesoIn, priceDesc, ulid } from "../lib/format";
import { calcLine, loadStats, newLine, saleCalc } from "../lib/rules";
import { getState, setState } from "./store";
import { requestSync } from "./sync";
import type { Line, Load, Material, Op, Purchase, Sale, Screen, State } from "./types";

const DEFAULT_CAPACITY = 2_000_000; // a 2,000 kg truck
const iso = (t: number) => new Date(t).toISOString();
const num = (prefix: string, n: number) => `${prefix}-${String(n).padStart(4, "0")}`;

// ---------- Moving between screens ----------

const scroll = (st: State) => ({ scrollTick: st.scrollTick + 1 });

export function go(screen: Screen, x: Partial<State> = {}) {
  setState((st) => ({ stack: [...st.stack, screen], sheet: null, ...scroll(st), ...x }));
}

export function back() {
  setState((st) => ({ stack: st.stack.length > 1 ? st.stack.slice(0, -1) : st.stack, sheet: null, ...scroll(st) }));
}

/** Jump to a bottom tab (or any screen stack), forgetting the screens in between. */
export function tab(screen: Screen | Screen[], x: Partial<State> = {}) {
  setState((st) => ({ stack: Array.isArray(screen) ? screen : [screen], sheet: null, ...scroll(st), ...x }));
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(msg: string) {
  setState({ toast: msg });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => setState({ toast: null }), 3200);
}

export const closeSheet = () => setState({ sheet: null, sheetText: "" });

// ---------- Looking things up ----------

export function M(id: string): Material {
  const st = getState();
  const found = st.materials.find((m) => m.id === id);
  if (found) return found;
  // Not on the list any more: use the name saved on an old purchase line.
  const name = st.purchases.flatMap((p) => p.lines).find((l) => l.mat === id)?.name ?? id;
  return { id, cat: "Other", en: name, tl: "", mode: "fixed", price: 0, min: 0, max: 0, upd: 0, deleted: true };
}

export function supName(id: string) {
  if (id === "walkin") return "Walk-in";
  const s = getState().suppliers.find((x) => x.id === id);
  return !s ? "Unknown" : s.deleted ? s.name + " (removed)" : s.name;
}

export const buyerName = (id: string | null) => getState().buyers.find((b) => b.id === id)?.name ?? "—";
export const pTotal = (p: Purchase) => p.lines.reduce((a, l) => a + l.amount, 0);
export const openLoad = (st: State) => st.loads.find((l) => l.state === "OPEN");
export const stats = (st: State, l: Load) => loadStats(st.purchases, l);

// ---------- Uploads ----------

function op(st: State, name: string, ref: string, method: Op["method"], path: string, body?: unknown): Op[] {
  return [...st.ops, { id: ulid(Date.now()), op: name, ref, t: Date.now(), method, path, body }];
}

/** The purchase line in the shape the backend expects (backend/app/models.py LineIn). */
const lineForApi = (l: Line) => ({
  material_id: l.mat,
  gross_g: l.gross_g,
  tare_g: l.tare_g,
  defect_mode: l.dmode,
  defect_value: l.dmode === "kg" ? l.defect_g : Number(l.draw) || 0,
  defect_reason: l.defect_g ? l.reason : "",
  rate_c: l.applied,
});

const purchaseForApi = (p: Purchase) => ({
  id: p.id, number: p.no, created_at: iso(p.t), load_id: p.loadId, corrects: p.corrOf ?? null,
  supplier_id: p.sup === "walkin" ? null : p.sup, payment: p.pay, lines: p.lines.map(lineForApi),
});

const loadForApi = (l: Load) => ({ id: l.id, number: l.no, created_at: iso(l.t), capacity_g: l.cap });

const materialForApi = (m: Material) => ({
  id: m.id, name: m.en, name_tl: m.tl, category: m.cat, price_mode: m.mode,
  price_c: m.mode === "range" ? null : m.price, min_c: m.mode === "range" ? m.min : null, max_c: m.mode === "range" ? m.max : null,
});

// ---------- Buying (Pasok Kalakal) ----------

/** Pasok Kalakal: open the purchase and, for a new one, ask who is selling before anything else. */
export function startBuying() {
  tab("intake");
  const d = getState().draft;
  if (!d.lines.length && !d.supSet) setState({ sheet: "supPick" });
}

/** Add materials: make sure the seller was chosen first. */
export function addMaterials() {
  if (!getState().draft.supSet) setState({ sheet: "supPick" });
  else go("pickMat", { pick: [] });
}

export function setLine(p: Partial<State["line"] & object>) {
  setState((st) => ({ line: st.line ? { ...st.line, ...p, touched: true } : null }));
}

export function togglePick(id: string) {
  setState((s) => ({ pick: s.pick.includes(id) ? s.pick.filter((x) => x !== id) : [...s.pick, id] }));
}

export function startWeigh() {
  const q = getState().pick;
  if (!q.length) return;
  go("line", { queue: q.slice(1), qTotal: q.length, line: newLine(M(q[0])), lineCtx: { kind: "new" }, pick: [] });
}

/** The Weigh item screen's main button: add to the purchase, save an edit, or correct a saved purchase. */
export function addLine() {
  const st = getState();
  if (!st.line) return;
  const c = calcLine(M(st.line.mat), st.line);
  if (!c.ok) return;
  const { m, errs: _errs, ok: _ok, ...ln0 } = c;
  const ln: Line = { ...ln0, inp: { ...st.line, touched: false } };
  const ctx = st.lineCtx || { kind: "new" };
  if (ctx.kind === "draft") {
    setState((s) => ({ draft: { ...s.draft, lines: s.draft.lines.map((x, i) => (i === ctx.idx ? ln : x)) }, stack: s.stack.slice(0, -1), line: null, lineCtx: null, ...scroll(s) }));
    toast(m.en + " updated.");
  } else if (ctx.kind === "purchase") {
    correct(ctx.pid, ctx.li, ln);
    setState((s) => ({ stack: s.stack.slice(0, -1), line: null, lineCtx: null, ...scroll(s) }));
  } else {
    const lines = [...st.draft.lines, ln];
    if (st.queue.length) {
      const [nx, ...rest] = st.queue;
      setState((s) => ({ draft: { ...s.draft, lines }, queue: rest, line: newLine(M(nx)), ...scroll(s) }));
      toast(m.en + " added. Next: " + M(nx).en + ".");
    } else {
      setState((s) => ({ draft: { ...s.draft, lines }, stack: s.stack.filter((x) => x !== "pickMat" && x !== "line"), line: null, lineCtx: null, queue: [], qTotal: 0, ...scroll(s) }));
    }
  }
}

function makeLoad(st: State): Load {
  const last = st.loads[st.loads.length - 1];
  return { id: ulid(Date.now()), no: num("L", st.lno), t: Date.now(), state: "OPEN", cap: last ? last.cap : DEFAULT_CAPACITY, buyer: null, disp: null, log: [] };
}

export function startLoad() {
  const st = getState();
  if (openLoad(st)) return;
  const l = makeLoad(st);
  setState({ loads: [...st.loads, l], lno: st.lno + 1, loadSel: l.id, ops: op(st, "LOAD_OPEN", l.no, "POST", "/loads", loadForApi(l)), sheet: null, stack: ["load", "loadDetail"], capEdit: true, capStr: kgIn(l.cap), ...scroll(st) });
  requestSync();
  toast(l.no + " started. Set the truck size below.");
}

export function savePurchase() {
  const st = getState();
  if (!st.draft.lines.length) return;
  const now = Date.now();
  let loads = st.loads;
  let ops = st.ops;
  let lno = st.lno;
  let open = openLoad(st);
  const created = !open;
  if (!open) {
    open = makeLoad(st);
    loads = [...loads, open];
    lno++;
    ops = op({ ...st, ops }, "LOAD_OPEN", open.no, "POST", "/loads", loadForApi(open));
  }
  const p: Purchase = { id: ulid(now), no: num("PUR", st.pno), t: now, sup: st.draft.sup, pay: st.draft.pay, lines: st.draft.lines, loadId: open.id, void: null, recv: null };
  const purchases = [...st.purchases, p];
  const s = loadStats(purchases, open);
  ops = op({ ...st, ops }, "PURCHASE", p.no, "POST", "/purchases", purchaseForApi(p));
  setState({ purchases, loads, lno, pno: st.pno + 1, ops, draft: { sup: "walkin", pay: "Cash", lines: [] }, stack: ["home"], loadSel: open.id, sheet: s.pct >= 100 ? "full" : null, ...scroll(st) });
  requestSync();
  toast(`Saved ${p.no} · ${peso(pTotal(p))}. ${created ? "Started new load " : "Added to "}${open.no}, now ${s.pct.toFixed(1)}% full.` + (isOnline() ? "" : " Naka-save sa phone."));
}

/** Change or remove one line of a saved purchase: the original is kept as void, and a corrected copy is saved. */
export function correct(pid: string, li: number, nl: Line | null) {
  const st = getState();
  const now = Date.now();
  const p = st.purchases.find((x) => x.id === pid);
  if (!p) return;
  const lines = p.lines.map((l, i) => (i === li ? nl : l)).filter((l): l is Line => !!l);
  const no = num("PUR", st.pno);
  const reason = (nl ? "Corrected" : "Line removed") + (lines.length ? " → " + no : "");
  const purchases = st.purchases.map((x) => (x.id === pid ? { ...x, void: { reason, t: now } } : x));
  let ops = op(st, "VOID", p.no, "POST", `/purchases/${p.id}/void`, { reason });
  let pno = st.pno;
  if (lines.length) {
    const copy: Purchase = { id: ulid(now), no, t: now, sup: p.sup, pay: p.pay, lines, loadId: p.loadId, void: null, recv: null, corrOf: p.no };
    purchases.push(copy);
    ops = op({ ...st, ops }, "PURCHASE", no, "POST", "/purchases", purchaseForApi(copy));
    pno++;
  }
  setState({ purchases, ops, pno, sheet: null, rm: null });
  requestSync();
  toast(`${p.no} ${nl ? "corrected" : "updated"}${lines.length ? " as " + no : ""}. Original kept as void.`);
}

// ---------- Truck loads ----------

function updLoad(id: string, p: Partial<Load>, opName: string, method: Op["method"], path: string, body?: unknown) {
  setState((st) => {
    const l = st.loads.find((x) => x.id === id)!;
    return { loads: st.loads.map((x) => (x.id === id ? { ...x, ...p } : x)), ops: op(st, opName, l.no, method, path, body), sheet: null, sheetText: "" };
  });
  requestSync();
}

export function selectedLoad(st: State) {
  return st.loads.find((l) => l.id === st.loadSel) || openLoad(st) || st.loads[st.loads.length - 1];
}

export function saveCap() {
  const st = getState();
  const l = selectedLoad(st);
  if (!l) return;
  const g = parseKg(st.capStr);
  const s = stats(st, l);
  if (g === null || g < s.total || g <= 0) return;
  updLoad(l.id, { cap: g }, "LOAD_CAPACITY", "PUT", `/loads/${l.id}/capacity`, { capacity_g: g });
  setState({ capEdit: false });
  toast("Capacity set to " + kg(g));
}

export function closeLoad() {
  const st = getState();
  const l = selectedLoad(st);
  if (!l || !st.dsp.buyer) return;
  const pDate = new Date(st.dsp.date + "T09:00:00+08:00").getTime();
  updLoad(l.id, { state: "CLOSED", buyer: st.dsp.buyer, disp: pDate }, "LOAD_CLOSE", "POST", `/loads/${l.id}/close`, { buyer_id: st.dsp.buyer, pickup_date: st.dsp.date });
  setState((s) => ({ stack: s.stack.filter((x) => x !== "dispatch"), capEdit: false, ...scroll(s) }));
  toast(l.no + " closed. Waiting for " + buyerName(st.dsp.buyer).replace(/\.$/, "") + ".");
}

export function markPickedUp() {
  const st = getState();
  const l = selectedLoad(st);
  if (!l) return;
  const now = Date.now();
  updLoad(l.id, { state: "PICKED_UP", disp: now }, "LOAD_DISPATCH", "POST", `/loads/${l.id}/pickup`, { at: iso(now) });
  toast(l.no + " picked up. Record the sale when paid.");
}

export function reopenLoad() {
  const st = getState();
  const l = selectedLoad(st);
  if (!l) return;
  const fromPicked = l.state === "PICKED_UP";
  const reason = fromPicked ? "Reopened from picked up" : st.sheetText.trim();
  if (!reason) return;
  updLoad(l.id, { state: "OPEN", buyer: null, disp: null, log: [...l.log, { reason, t: Date.now() }] }, "LOAD_REOPEN", "POST", `/loads/${l.id}/reopen`, { reason: fromPicked ? "" : reason });
  toast(l.no + " is open again.");
}

// ---------- Selling ----------

export function startSale() {
  const st = getState();
  const l = selectedLoad(st);
  if (!l) return;
  const s = stats(st, l);
  const w: Record<string, string> = {};
  const r: Record<string, string> = {};
  s.gs.forEach((g) => {
    w[g.mat] = kgIn(g.net);
    r[g.mat] = pesoIn(Math.round((listedRate(M(g.mat)) * 1.15) / 25) * 25);
  });
  go("sale", { sale: { mode: "per", w, r, tw: kgIn(s.total), mr: "", pay: "Cash", paid: "" } });
}

export function saveSale() {
  const st = getState();
  const l = selectedLoad(st);
  if (!l || !st.sale) return;
  const s = stats(st, l);
  const c = saleCalc(s, st.sale);
  if (!c.ok) return;
  const now = Date.now();
  const sale: Sale = { id: ulid(now), no: num("SAL", st.sno), t: now, loadId: l.id, buyer: l.buyer, mode: st.sale.mode, mixedRate: c.mr, total_g: c.buyerTotal, lines: c.lines, amount: c.amount, paid: c.paid, pay: st.sale.pay, recv: null, void: null };
  const body = {
    id: sale.id, number: sale.no, created_at: iso(now), load_id: l.id,
    mode: sale.mode === "per" ? "per_material" : "mixed",
    entries: Object.fromEntries(c.lines.map((x) => [x.mat, { buyer_weight_g: x.buyer_g, rate_c: x.rate }])),
    buyer_total_g: sale.mode === "mixed" ? c.buyerTotal : null, mixed_rate_c: sale.mode === "mixed" ? c.mr : null,
    paid_c: c.paid, payment: sale.pay,
  };
  setState({ sales: [...st.sales, sale], sno: st.sno + 1, loads: st.loads.map((x) => (x.id === l.id ? { ...x, state: "SOLD" } : x)), ops: op(st, "SALE", sale.no, "POST", "/sales", body), stack: ["ledger", "margin"], marginLoad: l.id, ...scroll(st) });
  requestSync();
  toast(`${l.no} sold for ${peso(c.amount)}. Margin ${peso(c.amount - s.cost)}.`);
}

/** Void a purchase or sale. Nothing is deleted: it stays visible, marked void, with the reason. */
export function doVoid() {
  const st = getState();
  const r = st.sheetText.trim();
  if (!r) return;
  const now = Date.now();
  const p = st.purchases.find((x) => x.id === st.txn);
  if (p) {
    setState({ purchases: st.purchases.map((x) => (x.id === p.id ? { ...x, void: { reason: r, t: now } } : x)), ops: op(st, "VOID", p.no, "POST", `/purchases/${p.id}/void`, { reason: r }), sheet: null, sheetText: "" });
    requestSync();
    toast(p.no + " voided. Removed from load and totals.");
    return;
  }
  const s = st.sales.find((x) => x.id === st.txn);
  if (s) {
    const l = st.loads.find((x) => x.id === s.loadId);
    setState({ sales: st.sales.map((x) => (x.id === s.id ? { ...x, void: { reason: r, t: now } } : x)), loads: st.loads.map((x) => (x.id === s.loadId ? { ...x, state: "PICKED_UP" } : x)), ops: op(st, "VOID", s.no, "POST", `/sales/${s.id}/void`, { reason: r }), sheet: null, sheetText: "" });
    requestSync();
    toast(s.no + " voided. " + (l?.no ?? "The load") + " is back to Picked up.");
  }
}

// ---------- Materials & prices ----------

export function openPrice(id: string) {
  const m = M(id);
  go("priceEdit", { pf: { id, isNew: false, cat: m.cat || "Other", en: m.en, tl: m.tl, mode: m.mode, price: pesoIn(m.price), min: pesoIn(m.min || listedRate(m)), max: pesoIn(m.max || listedRate(m)), err: "" } });
}

export function newMat(cat?: string) {
  go("priceEdit", { pf: { id: null, isNew: true, cat: cat || "Plastic", en: "", tl: "", mode: "fixed", price: "", min: "", max: "", err: "" } });
}

export function savePrice(confirmed: boolean) {
  const st = getState();
  const f = st.pf;
  if (!f) return;
  const now = Date.now();
  const fail = (err: string) => setState({ pf: { ...f, err } });
  if (!f.en.trim()) return fail("Enter the material name");
  const upd: Partial<Material> = { en: f.en.trim(), tl: f.tl.trim(), cat: f.cat, mode: f.mode };
  if (f.mode === "range") {
    const a = parsePeso(f.min);
    const b = parsePeso(f.max);
    if (a === null || b === null) return fail("Enter both prices");
    if (a > b) return fail("Min must be less than or equal to max");
    Object.assign(upd, { min: a, max: b, price: Math.round((a + b) / 2) });
    if ((a === 0 || b === 0) && !confirmed) return setState({ sheet: "zero" });
  } else {
    const a = parsePeso(f.price);
    if (a === null) return fail("Enter a price of ₱0.00 or more");
    Object.assign(upd, { price: a, min: 0, max: 0 });
    if (a === 0 && !confirmed) return setState({ sheet: "zero" });
  }

  if (f.isNew) {
    const nm = { id: ulid(now), deleted: false, min: 0, max: 0, price: 0, ...upd, upd: now } as Material;
    setState({ materials: [...st.materials, nm], priceEvents: [...st.priceEvents, { mat: nm.id, from: "New", to: priceDesc(nm), mode: nm.mode, t: now }], ops: op(st, "MATERIAL", nm.en, "POST", "/materials", materialForApi(nm)), sheet: null, stack: st.stack.slice(0, -1), ...scroll(st) });
    requestSync();
    toast(nm.en + " added to your list.");
    return;
  }
  const m = M(f.id!);
  const nm: Material = { ...m, ...upd, upd: now };
  const ev = { mat: m.id, from: priceDesc(m), to: priceDesc(nm), mode: nm.mode, t: now };
  setState({ materials: st.materials.map((x) => (x.id === m.id ? nm : x)), priceEvents: [...st.priceEvents, ev], ops: op(st, "PRICE_EVENT", nm.en, "PUT", `/materials/${m.id}`, materialForApi(nm)), sheet: null, stack: st.stack.slice(0, -1), ...scroll(st) });
  requestSync();
  toast(nm.en + " saved. Price history kept.");
}

export function delMat() {
  const st = getState();
  const id = st.pf?.id;
  if (!id) return;
  setState({ materials: st.materials.map((m) => (m.id === id ? { ...m, deleted: true } : m)), ops: op(st, "MATERIAL_REMOVE", M(id).en, "DELETE", `/materials/${id}`), sheet: null, stack: st.stack.slice(0, -1), ...scroll(st) });
  requestSync();
  toast(M(id).en + " removed. Past purchases keep the name.");
}

export function addCategory() {
  const st = getState();
  const v = st.sheetText.trim();
  if (!v) return;
  const ex = st.cats.find((c) => c[0].toLowerCase() === v.toLowerCase());
  const top = st.stack[st.stack.length - 1];
  if (ex) {
    setState((s) => ({ pf: s.pf && top === "priceEdit" ? { ...s.pf, cat: ex[0] } : s.pf, sheet: null, sheetText: "" }));
    return;
  }
  setState((s) => ({ cats: [...s.cats, [v, ""]], pf: s.pf && top === "priceEdit" ? { ...s.pf, cat: v } : s.pf, sheet: null, sheetText: "" }));
  toast(v + " category added.");
}

// ---------- Suppliers ----------

const BLANK_SUPPLIER = { id: null, name: "", type: "Collector (staff)", contact: "", from: null } as const;

export function saveSup() {
  const st = getState();
  const f = st.sf;
  const name = f.name.trim();
  if (!name) return;
  const body = { name, type: f.type, contact: f.contact };
  if (f.id) {
    const id = f.id;
    setState((s) => ({ suppliers: s.suppliers.map((x) => (x.id === id ? { ...x, ...body } : x)), ops: op(s, "SUPPLIER_EDIT", name, "PUT", `/suppliers/${id}`, body), stack: s.stack.slice(0, -1), sf: { ...BLANK_SUPPLIER }, ...scroll(s) }));
    requestSync();
    toast(name + " updated.");
    return;
  }
  const id = ulid(Date.now());
  const sup = { id, ...body, added: Date.now(), deleted: false };
  setState((s) => ({ suppliers: [...s.suppliers, sup], ops: op(s, "SUPPLIER", name, "POST", "/suppliers", { id, ...body }), stack: s.stack.slice(0, -1), draft: f.from === "intake" ? { ...s.draft, sup: id, supSet: true } : s.draft, sf: { ...BLANK_SUPPLIER }, ...scroll(s) }));
  requestSync();
  toast(name + " saved.");
}

export function delSup() {
  const st = getState();
  const id = st.supSel;
  const s0 = st.suppliers.find((x) => x.id === id);
  if (!id || !s0) return;
  setState((s) => ({ suppliers: s.suppliers.map((x) => (x.id === id ? { ...x, deleted: true } : x)), ops: op(s, "SUPPLIER_REMOVE", s0.name, "DELETE", `/suppliers/${id}`), sheet: null, stack: s.stack.slice(0, -1), draft: s.draft.sup === id ? { ...s.draft, sup: "walkin" } : s.draft, ...scroll(s) }));
  requestSync();
  toast(s0.name + " removed. Past purchases keep the name.");
}

// ---------- Buyers ----------

const BLANK_BUYER = { id: null, name: "", type: "Junk buyer", loc: "", contact: "", mats: [] as string[] };

export function saveBuyer() {
  const st = getState();
  const f = st.bf;
  if (!f.name.trim() || !f.loc.trim()) return;
  const body = { name: f.name.trim(), type: f.type, location: f.loc.trim(), contact: f.contact, materials: f.mats };
  const fields = { name: body.name, type: f.type, loc: body.location, contact: f.contact || "—", mats: f.mats };
  if (f.id) {
    const id = f.id;
    setState((s) => ({ buyers: s.buyers.map((b) => (b.id === id ? { ...b, ...fields } : b)), ops: op(s, "BUYER_EDIT", body.name, "PUT", `/buyers/${id}`, body), bf: { ...BLANK_BUYER }, stack: s.stack.slice(0, -1), ...scroll(s) }));
    requestSync();
    toast(body.name + " updated.");
    return;
  }
  const b = { id: ulid(Date.now()), ...fields, src: "private" as const, ver: "", deleted: false };
  setState((s) => ({ buyers: [...s.buyers, b], ops: op(s, "BUYER", b.name, "POST", "/buyers", { id: b.id, ...body }), bf: { ...BLANK_BUYER }, stack: s.stack.slice(0, -1), dsp: s.stack.includes("dispatch") ? { ...s.dsp, buyer: b.id } : s.dsp, ...scroll(s) }));
  requestSync();
  toast(b.name + " added. Only visible to your shop.");
}

export function editBuyer(id: string) {
  const b = getState().buyers.find((x) => x.id === id);
  if (!b) return;
  go("buyerNew", { bf: { id: b.id, name: b.name, type: b.type, loc: b.loc, contact: b.contact === "—" ? "" : b.contact, mats: [...b.mats] } });
}

export function goBuyerNew() {
  go("buyerNew", { bf: { ...BLANK_BUYER, mats: [] } });
}

export function delBuyer() {
  const st = getState();
  const id = st.bAct;
  const b = st.buyers.find((x) => x.id === id);
  if (!id || !b) return;
  setState((s) => ({ buyers: s.buyers.map((x) => (x.id === id ? { ...x, deleted: true } : x)), ops: op(s, "BUYER_REMOVE", b.name, "DELETE", `/buyers/${id}`), sheet: null, bAct: null, dsp: s.dsp.buyer === id ? { ...s.dsp, buyer: null } : s.dsp }));
  requestSync();
  toast(b.name + (b.src === "dir" ? " hidden from your list." : " deleted."));
}

export function addBuyerMat() {
  const st = getState();
  const v = st.sheetText.trim();
  if (!v) return;
  const known = st.materials.find((m) => !m.deleted && m.en.toLowerCase() === v.toLowerCase());
  const mats = st.bf.mats || [];
  const id = known ? known.id : v;
  setState((s) => ({ bf: { ...s.bf, mats: mats.includes(id) ? mats : [...mats, id] }, sheet: null, sheetText: "" }));
}

// ---------- Connection ----------

export const isOnline = () => {
  const st = getState();
  return !st.forcedOffline && st.serverUp;
};

export const today = () => dayKey(Date.now());
