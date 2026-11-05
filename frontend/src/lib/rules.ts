// The business rules the phone needs to work offline. They match backend/app/rules/,
// so the server gets the same answer when the record is uploaded.

import type { Line, LineInput, Load, Material, Purchase, SaleForm } from "../store/types";
import { lineAmount, listedRate, parseKg, parsePeso, pesoIn } from "./format";

export type LineCalc = Line & { m: Material; errs: string[]; ok: boolean };

/** Work out one weighed item: gross − tare = net, − defect (bawas) = payable, × rate = amount. */
export function calcLine(m: Material, L: LineInput): LineCalc {
  const listed = listedRate(m);
  const errs: string[] = [];
  const gross = parseKg(L.gross);
  const tare = parseKg(L.tare === "" ? "0" : L.tare);
  if (gross === null || gross <= 0) errs.push("Enter a gross weight above 0 · Ilagay ang timbang");
  if (tare === null) errs.push("Tare must be kilos, up to 3 decimals");
  const net = (gross || 0) - (tare || 0);
  if (gross !== null && gross > 0 && tare !== null && tare >= gross) errs.push("Tare must be less than gross · Mas magaan dapat ang sako");

  let defect = 0;
  const raw = L.dmode === "kg" ? L.defect : L.pct;
  if (L.dmode === "kg") {
    const d = L.defect === "" ? 0 : parseKg(L.defect);
    if (d === null) errs.push("Defect must be kilos, up to 3 decimals");
    else defect = d;
  } else {
    const p = L.pct === "" ? 0 : Number(L.pct);
    if (isNaN(p) || p < 0 || p > 100) errs.push("Percent must be 0 to 100");
    else defect = Math.round((Math.max(net, 0) * p) / 100);
  }
  if (net > 0 && defect > net) errs.push("Defect cannot be more than net weight");
  const payable = net - defect;
  if (net > 0 && defect <= net && payable <= 0) errs.push("Payable weight must be above 0");

  const applied = parsePeso(L.rate);
  if (applied === null) errs.push("Enter the rate per kilo · Presyo kada kilo");
  const override = applied !== null && applied !== listed;
  const oor = m.mode === "range" && applied !== null && (applied < m.min || applied > m.max);
  const amount = applied !== null && payable > 0 ? lineAmount(payable, applied) : 0;
  return {
    m, mat: m.id, name: m.en, gross_g: gross ?? 0, tare_g: tare ?? 0, net_g: net, defect_g: defect, dmode: L.dmode,
    draw: raw || "0", reason: L.reason, payable_g: payable, listed, applied: applied ?? 0, override, oor, amount,
    errs, ok: errs.length === 0,
  };
}

/** A blank Weigh item form for a material, starting at its listed price. */
export const newLine = (m: Material): LineInput => ({
  mat: m.id, gross: "", tare: "0", dmode: "kg", defect: "", pct: "", reason: "", rate: pesoIn(listedRate(m)), touched: false,
});

export type Group = { mat: string; net: number; cost: number; n: number };
export type LoadStats = { gs: Group[]; total: number; cost: number; pct: number; remaining: number };

/** Add up the non-void purchases in a load, per material. */
export function loadStats(purchases: Purchase[], l: Load): LoadStats {
  const g: Record<string, Group> = {};
  purchases.filter((p) => p.loadId === l.id && !p.void).forEach((p) =>
    p.lines.forEach((ln) => {
      const e = g[ln.mat] || (g[ln.mat] = { mat: ln.mat, net: 0, cost: 0, n: 0 });
      e.net += ln.net_g;
      e.cost += ln.amount;
      e.n++;
    }),
  );
  const gs = Object.values(g);
  const total = gs.reduce((a, b) => a + b.net, 0);
  const cost = gs.reduce((a, b) => a + b.cost, 0);
  return { gs, total, cost, pct: Math.round((total * 1000) / l.cap) / 10, remaining: Math.max(0, l.cap - total) };
}

export type SaleCalc = {
  ok: boolean;
  lines: { mat: string; buyer_g: number; rate: number; amount: number; shop: number }[];
  amount: number;
  buyerTotal: number;
  paid: number;
  mr: number | null;
};

/** Work out a sale from what the buyer weighed and paid. */
export function saleCalc(s: LoadStats, f: SaleForm): SaleCalc {
  let ok = true;
  let lines: SaleCalc["lines"] = [];
  let amount = 0;
  let buyerTotal = 0;
  if (f.mode === "per") {
    lines = s.gs.map((g) => {
      const bw = parseKg(f.w[g.mat]);
      const r = parsePeso(f.r[g.mat]);
      if (bw === null || bw <= 0 || r === null) ok = false;
      const a = bw && r !== null ? lineAmount(bw, r) : 0;
      amount += a;
      buyerTotal += bw || 0;
      return { mat: g.mat, buyer_g: bw || 0, rate: r || 0, amount: a, shop: g.net };
    });
  } else {
    const tw = parseKg(f.tw);
    const mr = parsePeso(f.mr);
    if (tw === null || tw <= 0 || mr === null) ok = false;
    buyerTotal = tw || 0;
    amount = tw && mr !== null ? lineAmount(tw, mr) : 0;
  }
  const paid = f.paid === "" ? amount : parsePeso(f.paid);
  if (paid === null) ok = false;
  return { ok, lines, amount, buyerTotal, paid: paid || 0, mr: parsePeso(f.mr) };
}

/** For a one-price sale: split the amount across materials by their share of the shop's weight. */
export function splitByWeight(amount: number, gs: Group[], total: number) {
  let acc = 0;
  return gs.map((g, i) => {
    const rev = i === gs.length - 1 ? amount - acc : Math.round((amount * g.net) / total);
    acc += rev;
    return rev;
  });
}
