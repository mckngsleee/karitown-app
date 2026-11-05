import { describe, expect, it } from "vitest";

import type { Load, Material, Purchase } from "../store/types";
import { kg, parseKg, parsePeso, peso, priceDesc } from "./format";
import { calcLine, loadStats, newLine, saleCalc, splitByWeight } from "./rules";

const carton: Material = { id: "carton", cat: "Paper", en: "Carton", tl: "Karton", mode: "fixed", price: 750, min: 0, max: 0, upd: 0, deleted: false };
const tin: Material = { ...carton, id: "tin", en: "Tin cans", mode: "range", price: 1100, min: 900, max: 1300 };

describe("format", () => {
  it("shows pesos and kilos like the prototype", () => {
    expect(peso(7500)).toBe("₱75.00");
    expect(peso(-16500)).toBe("−₱165.00");
    expect(kg(1262500)).toBe("1,262.5 kg");
    expect(priceDesc(tin)).toBe("₱9.00–13.00/kg");
  });

  it("reads typed numbers exactly", () => {
    expect(parseKg("12.5")).toBe(12500);
    expect(parseKg("1.2345")).toBeNull();
    expect(parsePeso("₱7.5")).toBe(750);
  });
});

describe("weigh item", () => {
  it("matches the prototype example: 12 kg carton, 2 kg bawas", () => {
    const r = calcLine(carton, { ...newLine(carton), gross: "12", defect: "2" });
    expect(r.ok).toBe(true);
    expect(r.payable_g).toBe(10000);
    expect(r.amount).toBe(7500);
  });

  it("works out a percent defect and flags a price outside the range", () => {
    const r = calcLine(tin, { ...newLine(tin), gross: "20", dmode: "pct", pct: "10", rate: "14" });
    expect(r.defect_g).toBe(2000);
    expect(r.oor).toBe(true);
    expect(r.override).toBe(true);
  });

  it("refuses tare heavier than gross", () => {
    const r = calcLine(carton, { ...newLine(carton), gross: "5", tare: "6" });
    expect(r.ok).toBe(false);
  });
});

describe("loads and sales", () => {
  const load: Load = { id: "l1", no: "L-0001", t: 0, state: "PICKED_UP", cap: 2000000, buyer: "b1", disp: null, log: [] };
  const line = calcLine(carton, { ...newLine(carton), gross: "100" });
  const purchases: Purchase[] = [
    { id: "p1", no: "PUR-0001", t: 0, sup: "walkin", pay: "Cash", lines: [line], loadId: "l1", void: null, recv: null },
    { id: "p2", no: "PUR-0002", t: 0, sup: "walkin", pay: "Cash", lines: [line], loadId: "l1", void: { reason: "x", t: 0 }, recv: null },
  ];

  it("adds up a load and skips voids", () => {
    const s = loadStats(purchases, load);
    expect(s.total).toBe(100000);
    expect(s.cost).toBe(75000);
    expect(s.pct).toBe(5);
  });

  it("prices a sale per material", () => {
    const s = loadStats(purchases, load);
    const c = saleCalc(s, { mode: "per", w: { carton: "99" }, r: { carton: "9" }, tw: "", mr: "", pay: "Cash", paid: "" });
    expect(c.ok).toBe(true);
    expect(c.amount).toBe(89100);
    expect(c.paid).toBe(89100);
  });

  it("splits a one-price sale so the parts add up", () => {
    const parts = splitByWeight(1000, [{ mat: "a", net: 1, cost: 0, n: 1 }, { mat: "b", net: 2, cost: 0, n: 1 }], 3);
    expect(parts[0] + parts[1]).toBe(1000);
  });
});
