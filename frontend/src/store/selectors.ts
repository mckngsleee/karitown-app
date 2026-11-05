// Read-only views of the records, shared by several screens.

import { DAY, dayKey } from "../lib/format";
import { M, buyerName, pTotal, supName } from "./actions";
import type { Period, State } from "./types";

export const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "custom", label: "Custom" },
];

/** Monday of this week, as "2026-10-26". */
export function weekStart(now = Date.now()) {
  const wd = (new Date(now + 8 * 3600e3).getUTCDay() + 6) % 7;
  return dayKey(now - wd * DAY);
}

/** Is time t inside the period? Weeks start on Monday, all in Philippine time. */
export function inPeriod(t: number, p: Period, from: string, to: string) {
  const now = Date.now();
  const k = dayKey(t);
  const today = dayKey(now);
  if (p === "today") return k === today;
  if (p === "week") return k >= weekStart(now) && k <= today;
  if (p === "month") return k.slice(0, 7) === today.slice(0, 7);
  return (!from || k >= from) && (!to || k <= to);
}

export type Rec = { kind: "in" | "out"; id: string; no: string; t: number; amount: number; void: boolean; party: string; sub: string };

/** Every purchase (money out) and sale (money in), newest first. */
export function records(st: State): Rec[] {
  return [
    ...st.purchases.map((p): Rec => ({ kind: "out", id: p.id, no: p.no, t: p.t, amount: pTotal(p), void: !!p.void, party: supName(p.sup), sub: p.lines.map((l) => M(l.mat).en).join(", ") })),
    ...st.sales.map((s): Rec => ({ kind: "in", id: s.id, no: s.no, t: s.t, amount: s.paid, void: !!s.void, party: buyerName(s.buyer), sub: "Load " + (st.loads.find((l) => l.id === s.loadId)?.no ?? "") })),
  ].sort((a, b) => b.t - a.t);
}

export const liveMaterials = (st: State) => st.materials.filter((m) => !m.deleted);

export const isStale = (t: number) => Date.now() - t > 30 * DAY;
