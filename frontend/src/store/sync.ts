// Uploading to the backend (backend/app/main.py).
//
// The phone is where records are made. Every change waits in st.ops ("Waiting to upload")
// and is sent, oldest first, whenever the server answers. Each record carries its own id,
// so sending it twice (weak signal, retry) still saves it once on the server.
//
// A new phone (or a reinstall) starts by copying the shop's records from the server.

import { dayKey, kgIn } from "../lib/format";
import { CATEGORIES, getState, setState } from "./store";
import type { Buyer, Data, LoadState, Material, PriceEvent, Purchase, Sale, Supplier } from "./types";

export const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
const API_KEY = import.meta.env.VITE_API_KEY ?? "";

/** The server answered, but refused the change (a broken business rule). */
class Refused extends Error {}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(API_URL + path, {
    method,
    headers: { "Content-Type": "application/json", ...(API_KEY ? { "x-api-key": API_KEY } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const detail = Array.isArray(data.detail) ? data.detail[0]?.msg : data.detail;
    throw new Refused(data.error ?? detail ?? `Refused (${response.status})`);
  }
  return response.json() as Promise<T>;
}

// ---------- Is the server there? ----------

export async function checkServer() {
  let up = false;
  if (navigator.onLine) {
    try {
      up = (await fetch(API_URL + "/health", { signal: AbortSignal.timeout(5000) })).ok;
    } catch {
      up = false;
    }
  }
  if (up !== getState().serverUp) setState({ serverUp: up });
  if (up) {
    await restoreIfNew();
    requestSync();
  }
  return up;
}

/** The Sync screen's "No signal / Online" switch: work offline on purpose, e.g. to try it out. */
export function setOnline(on: boolean) {
  setState({ forcedOffline: !on });
  if (on) void checkServer();
}

/** Check the server now and every 20 seconds, and when the phone's signal changes. */
export function watchConnection() {
  void checkServer();
  const timer = setInterval(checkServer, 20_000);
  const onOffline = () => setState({ serverUp: false });
  const onOnline = () => void checkServer();
  window.addEventListener("offline", onOffline);
  window.addEventListener("online", onOnline);
  return () => {
    clearInterval(timer);
    window.removeEventListener("offline", onOffline);
    window.removeEventListener("online", onOnline);
  };
}

// ---------- Uploading ----------

export function requestSync() {
  const st = getState();
  if (st.forcedOffline || !st.serverUp || st.syncing || !st.ops.length) return;
  void doSync();
}

async function doSync() {
  setState({ syncing: true });
  try {
    for (;;) {
      const st = getState();
      const next = st.ops[0];
      if (!next || st.forcedOffline) break;
      let received: string | undefined;
      try {
        const answer = await call<{ received_at?: string }>(next.method, next.path, next.body);
        received = answer?.received_at;
      } catch (error) {
        if (!(error instanceof Refused)) {
          setState({ serverUp: false }); // no connection: try again later
          break;
        }
        // The server said no. Keep it on the Sync screen so the owner can see why.
        setState((s) => ({ failed: [...s.failed, { ...next, error: error.message }] }));
      }
      const recv = received ? Date.parse(received) : Date.now();
      const id = (next.body as { id?: string } | undefined)?.id;
      setState((s) => ({
        ops: s.ops.filter((o) => o.id !== next.id),
        purchases: next.op === "PURCHASE" ? s.purchases.map((p) => (p.id === id ? { ...p, recv } : p)) : s.purchases,
        sales: next.op === "SALE" ? s.sales.map((x) => (x.id === id ? { ...x, recv } : x)) : s.sales,
      }));
    }
    if (!getState().ops.length) setState({ lastSync: Date.now() });
  } finally {
    setState({ syncing: false });
  }
}

export const dismissFailed = (id: string) => setState((s) => ({ failed: s.failed.filter((f) => f.id !== id) }));

// ---------- Restoring a new phone from the server ----------

const time = (s: string | null | undefined) => (s ? Date.parse(s) : Date.now());
const numberOf = (no: string) => parseInt(no.split("-")[1] ?? "0", 10) || 0;
const fromServerPrice = (s: string) => s.replace(/P(?=\d)/g, "₱").replace(/(\d)-(\d)/, "$1–$2");

async function restoreIfNew() {
  const st = getState();
  if (st.restored) return;
  if (st.ops.length || st.purchases.length || st.materials.length) {
    setState({ restored: true }); // this phone already has its own records
    return;
  }
  try {
    const [materials, suppliers, buyers, loads, purchases, sales, categories] = await Promise.all([
      call<any[]>("GET", "/materials?include_removed=true"),
      call<any[]>("GET", "/suppliers?include_removed=true"),
      call<any[]>("GET", "/buyers?include_hidden=true"),
      call<any[]>("GET", "/loads"),
      call<any[]>("GET", "/purchases"),
      call<any[]>("GET", "/sales"),
      call<string[]>("GET", "/categories"),
    ]);
    if (getState().restored || getState().ops.length) return; // something was saved meanwhile

    const data: Partial<Data> = {
      materials: materials.map((m): Material => ({
        id: m.id, cat: m.category, en: m.name, tl: m.name_tl, mode: m.price_mode,
        price: m.price_c ?? 0, min: m.min_c ?? 0, max: m.max_c ?? 0, upd: time(m.price_updated_at), deleted: m.removed,
      })),
      priceEvents: materials.flatMap((m) => (m.history ?? []).map((h: any): PriceEvent => ({
        mat: m.id, from: fromServerPrice(h.from), to: fromServerPrice(h.to), mode: m.price_mode, t: time(h.at),
      }))),
      suppliers: suppliers.map((s): Supplier => ({ id: s.id, name: s.name, type: s.type, contact: s.contact, added: time(s.added_at), deleted: s.removed })),
      buyers: buyers.map((b): Buyer => ({
        id: b.id, name: b.name, type: b.type, loc: b.location, mats: b.materials, contact: b.contact || "—",
        src: b.source === "directory" ? "dir" : "private", ver: b.verified ?? "", deleted: b.hidden,
      })),
      loads: loads.slice().reverse().map((l) => ({
        id: l.id, no: l.number, t: time(l.created_at), state: l.state as LoadState, cap: l.capacity_g, buyer: l.buyer_id,
        disp: l.picked_up_at ? time(l.picked_up_at) : l.pickup_date ? time(l.pickup_date + "T09:00:00+08:00") : null,
        log: (l.history ?? []).filter((h: any) => h.reason).map((h: any) => ({ reason: h.reason, t: time(h.at) })),
      })),
      purchases: purchases.slice().reverse().map((p): Purchase => ({
        id: p.id, no: p.number, t: time(p.created_at), sup: p.supplier_id ?? "walkin", pay: p.payment, loadId: p.load_id,
        void: p.void ? { reason: p.void.reason, t: time(p.void.at) } : null, recv: time(p.received_at ?? p.created_at),
        corrOf: p.corrects ?? undefined,
        lines: p.lines.map((l: any) => ({
          mat: l.material_id, name: l.material_name, gross_g: l.gross_g, tare_g: l.tare_g, net_g: l.net_g,
          defect_g: l.defect_g, dmode: l.defect_mode, draw: l.defect_mode === "pct" ? String(l.defect_value ?? 0) : kgIn(l.defect_g),
          reason: l.defect_reason ?? "", payable_g: l.payable_g, listed: l.listed_rate_c, applied: l.rate_c,
          override: l.price_changed, oor: l.out_of_range, amount: l.amount_c,
        })),
      })),
      sales: sales.slice().reverse().map((s): Sale => ({
        id: s.id, no: s.number, t: time(s.created_at), loadId: s.load_id, buyer: s.buyer_id,
        mode: s.mode === "per_material" ? "per" : "mixed", mixedRate: s.mixed_rate_c, total_g: s.buyer_total_g,
        lines: s.mode === "per_material" ? s.lines.map((l: any) => ({ mat: l.material_id, buyer_g: l.buyer_weight_g, rate: l.rate_c, amount: l.amount_c, shop: l.shop_net_g })) : [],
        amount: s.amount_c, paid: s.paid_c, pay: s.payment, recv: time(s.received_at ?? s.created_at),
        void: s.void ? { reason: s.void.reason, t: time(s.void.at) } : null,
      })),
      cats: [...CATEGORIES.map((c) => [...c] as [string, string]), ...categories.filter((c) => !CATEGORIES.some((d) => d[0] === c)).map((c) => [c, ""] as [string, string])],
      pno: Math.max(0, ...purchases.map((p) => numberOf(p.number))) + 1,
      sno: Math.max(0, ...sales.map((s) => numberOf(s.number))) + 1,
      lno: Math.max(0, ...loads.map((l) => numberOf(l.number))) + 1,
      lastSync: Date.now(),
      restored: true,
    };
    setState({ ...data, dsp: { buyer: null, date: dayKey(Date.now()) } });
  } catch {
    // Server stopped answering half-way: try again on the next check.
  }
}
