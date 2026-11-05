// The app's memory: one state object, like the prototype.
// Records (Data) are saved in the browser's storage, so they survive closing the app and
// having no signal. Screen state (Ui) starts fresh each time.

import { useSyncExternalStore } from "react";

import { dayKey } from "../lib/format";
import type { Data, State, Ui } from "./types";

const KEY = "karitown:data:v1";

export const CATEGORIES: [string, string][] = [
  ["Plastic", "Plastik"], ["Paper", "Papel"], ["Metal", "Metal at bakal"],
  ["Glass", "Bubog"], ["Electronics", "Elektroniko"], ["Other", "Iba pa"],
];

export const emptyData = (): Data => ({
  materials: [], purchases: [], loads: [], sales: [], suppliers: [], buyers: [], priceEvents: [],
  cats: CATEGORIES.map((c) => [...c] as [string, string]),
  ops: [], failed: [], pno: 1, sno: 1, lno: 1, lastSync: null, restored: false,
  draft: { sup: "walkin", pay: "Cash", lines: [] },
  forcedOffline: false,
});

const startUi = (): Ui => ({
  stack: ["home"], line: null, lineCtx: null, pick: [], queue: [], qTotal: 0,
  hPeriod: "today", hFrom: "", hTo: "", period: "week", from: "", to: "",
  txn: null, txTab: "lines", sheet: null, sheetText: "", toast: null,
  loadSel: null, loadFilter: "all", loadMat: null, rm: null, capEdit: false, capStr: "",
  dsp: { buyer: null, date: dayKey(Date.now()) }, sale: null, marginLoad: null, pf: null,
  bq: { q: "", loc: "", type: "", mats: [] },
  bf: { id: null, name: "", type: "Junk buyer", loc: "", contact: "", mats: [] },
  sf: { id: null, name: "", type: "Collector (staff)", contact: "", from: null },
  supSel: null, bAct: null, collapsed: {}, serverUp: false, syncing: false, scrollTick: 0,
});

const DATA_KEYS = Object.keys(emptyData()) as (keyof Data)[];

function loadData(): Data {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...emptyData(), ...JSON.parse(raw) };
  } catch {
    // Storage blocked or broken: start empty.
  }
  return emptyData();
}

function saveData(st: State) {
  try {
    const data = Object.fromEntries(DATA_KEYS.map((k) => [k, st[k]]));
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Storage full or blocked: keep working in memory.
  }
}

let state: State = { ...loadData(), ...startUi() };
const listeners = new Set<() => void>();

export const getState = () => state;

/** Change the state, like React's setState: pass the changes, or a function of the current state. */
export function setState(change: Partial<State> | ((st: State) => Partial<State>)) {
  const patch = typeof change === "function" ? change(state) : change;
  state = { ...state, ...patch };
  if (DATA_KEYS.some((k) => k in patch)) saveData(state);
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Use the state in a component; it redraws when the state changes. */
export const useStore = () => useSyncExternalStore(subscribe, getState);

/** For tests: start over with the given records. */
export function resetState(data: Partial<Data> = {}) {
  state = { ...emptyData(), ...data, ...startUi() };
  listeners.forEach((fn) => fn());
}
