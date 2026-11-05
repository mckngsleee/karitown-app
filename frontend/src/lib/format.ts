// Numbers and dates, exactly as the prototype shows them.
// Underneath, weight is whole grams (12.5 kg = 12500) and money is whole centavos (₱7.50 = 750),
// so the math never has rounding surprises.

import type { Material, PriceMode } from "../store/types";

const MANILA_MS = 8 * 3600e3;
export const DAY = 86400e3;
export const HOUR = 3600e3;

/** "2026-10-28": the date in the Philippines for a timestamp. */
export const dayKey = (t: number) => new Date(t + MANILA_MS).toISOString().slice(0, 10);

const group = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** 7500 -> "₱75.00", -16500 -> "−₱165.00" */
export function peso(c: number) {
  const neg = c < 0;
  c = Math.abs(c);
  return (neg ? "−" : "") + "₱" + group(Math.floor(c / 100)) + "." + String(c % 100).padStart(2, "0");
}

/** 12500 -> "12.5 kg" */
export function kg(g: number, minDecimals = 0) {
  const neg = g < 0;
  g = Math.abs(g);
  let f = String(g % 1000).padStart(3, "0").replace(/0+$/, "");
  while (f.length < minDecimals) f += "0";
  return (neg ? "−" : "") + group(Math.floor(g / 1000)) + (f ? "." + f : "") + " kg";
}

/** grams -> what goes in a kilo input box: 12500 -> "12.5" */
export function kgIn(g: number) {
  const f = String(g % 1000).padStart(3, "0").replace(/0+$/, "");
  return Math.floor(g / 1000) + (f ? "." + f : "");
}

/** centavos -> what goes in a peso input box: 750 -> "7.50" */
export const pesoIn = (c: number) => Math.floor(c / 100) + "." + String(c % 100).padStart(2, "0");

/** "12.5" -> 12500, or null if it isn't kilos with up to 3 decimals */
export function parseKg(s: string | null | undefined): number | null {
  s = String(s ?? "").trim().replace(/,/g, "");
  if (!/^\d+(\.\d{0,3})?$/.test(s)) return null;
  const [a, b = ""] = s.split(".");
  return parseInt(a, 10) * 1000 + parseInt((b + "000").slice(0, 3), 10);
}

/** "7.5" -> 750, or null if it isn't pesos with up to 2 decimals */
export function parsePeso(s: string | null | undefined): number | null {
  s = String(s ?? "").trim().replace(/^₱/, "").replace(/,/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null;
  const [a, b = ""] = s.split(".");
  return parseInt(a, 10) * 100 + parseInt((b + "00").slice(0, 2), 10);
}

/** Payable grams × centavos per kilo, rounded to the nearest centavo. Same formula as the backend. */
export const lineAmount = (g: number, rateC: number) => Math.floor((g * rateC + 500) / 1000);

export const rate = (c: number) => peso(c) + "/kg";

/** The price a purchase starts with: the price, or the middle of a range. */
export const listedRate = (m: Material) => (m.mode === "range" ? Math.round((m.min + m.max) / 2) : m.price);

/** "₱7.50/kg", "₱9.00–13.00/kg" or "Ref ₱380.00/kg" */
export function priceDesc(m: Pick<Material, "mode" | "price" | "min" | "max">) {
  if (m.mode === "range") return peso(m.min) + "–" + peso(m.max).slice(1) + "/kg";
  if (m.mode === "negotiable") return "Ref " + rate(m.price);
  return rate(m.price);
}

export const MODE: Record<PriceMode, string> = {
  fixed: "Fixed · Takda",
  range: "Range · Saklaw",
  negotiable: "Negotiable · Tawaran",
};

export const fmtTime = (t: number) =>
  new Date(t).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" });
export const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString("en-PH", { month: "short", day: "numeric", timeZone: "Asia/Manila" });
export const fmtDT = (t: number) => fmtDate(t) + ", " + fmtTime(t);

export function ago(t: number) {
  const d = Math.floor((Date.now() - t) / DAY);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : d + " days ago";
}

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** A ULID: a unique record id that also sorts by time. Made on the phone, so it works offline. */
export function ulid(t: number) {
  let s = "";
  let x = Math.floor(t);
  for (let i = 0; i < 10; i++) {
    s = B32[x % 32] + s;
    x = Math.floor(x / 32);
  }
  const random = crypto.getRandomValues(new Uint8Array(16));
  for (let i = 0; i < 16; i++) s += B32[random[i] % 32];
  return s;
}
