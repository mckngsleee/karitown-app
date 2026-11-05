// Panels that slide up from the bottom: questions, confirmations and short lists.

import type { ReactNode } from "react";

import { dayKey, fmtDate, kg, kgIn } from "../lib/format";
import {
  addBuyerMat, addCategory, buyerName, closeLoad, closeSheet, correct, delBuyer, delMat, delSup, doVoid, editBuyer,
  go, markPickedUp, openLoad, reopenLoad, savePrice, selectedLoad, stats,
} from "../store/actions";
import { setState, useStore } from "../store/store";
import { Icon } from "./Icon";

type ListItem = { label: string; sub: string; selected?: boolean; onClick: () => void };
type SheetSpec = {
  title: string;
  tl: string;
  body?: ReactNode;
  list?: ListItem[];
  chips?: string[];
  input?: string; // placeholder of a text box
  action?: [string, () => void, boolean?]; // label, what it does, enabled
  action2?: [string, () => void];
};

function useSheet(): SheetSpec | null {
  const st = useStore();
  const sel = selectedLoad(st);
  const txt = st.sheetText;
  const open = openLoad(st);

  switch (st.sheet) {
    case "supPick":
      return {
        title: "Who is selling?", tl: "Sino ang nagbebenta?",
        body: st.draft.supSet ? undefined : "Choose the seller first, so the purchase is saved under the right name.",
        list: [
          { label: "Walk-in", sub: "No name stored · Walang pangalan", selected: st.draft.supSet && st.draft.sup === "walkin", onClick: () => setState((s) => ({ draft: { ...s.draft, sup: "walkin", supSet: true }, sheet: null })) },
          ...st.suppliers.filter((s) => !s.deleted).map((s) => ({ label: s.name, sub: s.type, selected: st.draft.supSet && st.draft.sup === s.id, onClick: () => setState((x) => ({ draft: { ...x.draft, sup: s.id, supSet: true }, sheet: null })) })),
          { label: "+ Add new supplier", sub: "Name, type and mobile", onClick: () => go("supplierNew", { sf: { id: null, name: "", type: "Collector (staff)", contact: "", from: "intake" } }) },
        ],
      };
    case "confirmClose": {
      if (!sel || !st.dsp.buyer) return null;
      const pDate = new Date(st.dsp.date + "T09:00:00+08:00").getTime();
      return {
        title: `Close ${sel.no}?`, tl: "Isara ang karga",
        body: `${buyerName(st.dsp.buyer)} will pick up ${kg(stats(st, sel).total)} on ${fmtDate(pDate)}. New purchases will go to the next load.`,
        action: ["Close load", closeLoad],
      };
    }
    case "pickedUp":
      if (!sel) return null;
      return { title: "Did the buyer pick it up?", tl: "Nakuha na ba?", body: `${buyerName(sel.buyer)} took ${sel.no}. Next, enter what they weighed and paid.`, action: ["Yes, picked up", markPickedUp] };
    case "buyerAct": {
      const b = st.buyers.find((x) => x.id === st.bAct);
      if (!b) return null;
      const priv = b.src === "private";
      return {
        title: b.name, tl: `${b.type} · ${b.loc}`,
        body: priv ? undefined : "From the Karitown buyer directory. Its details are kept up to date for you, so they cannot be edited.",
        list: priv
          ? [{ label: "Edit details", sub: "Name, type, location, materials", onClick: () => editBuyer(b.id) }, { label: "Delete buyer", sub: "Past sales keep the name", onClick: () => setState({ sheet: "buyerDel" }) }]
          : [{ label: "Hide from my list", sub: "Past sales keep the name", onClick: () => setState({ sheet: "buyerDel" }) }],
      };
    }
    case "buyerDel": {
      const b = st.buyers.find((x) => x.id === st.bAct);
      if (!b) return null;
      return { title: b.src === "dir" ? "Hide this buyer?" : "Delete this buyer?", tl: b.name, body: "Past loads and sales keep the name.", action: [b.src === "dir" ? "Hide buyer" : "Delete buyer", delBuyer] };
    }
    case "supDel":
      return { title: "Remove this supplier?", tl: "Alisin ang nagbebenta", body: "They will no longer show when buying. Past purchases keep the name.", action: ["Remove supplier", delSup] };
    case "reopen": {
      if (!sel) return null;
      const fromPicked = sel.state === "PICKED_UP";
      return {
        title: `Reopen ${sel.no}?`, tl: "Buksan muli",
        body: fromPicked ? "The buyer and pickup date will be cleared and the load goes back to Open." : "Allowed before the sale is recorded. A reason is required.",
        input: fromPicked ? undefined : "Reason · Dahilan",
        action: ["Reopen load", reopenLoad, fromPicked || !!txt.trim()],
      };
    }
    case "void":
      return {
        title: "Void this record?", tl: "Hindi ito mabubura",
        body: "It stays visible as void and is removed from load and ledger totals.",
        chips: ["Wrong weight", "Wrong material", "Wrong supplier", "Duplicate"],
        input: "Reason · Dahilan",
        action: ["Void record", doVoid, !!txt.trim()],
      };
    case "zero":
      return { title: "Save a ₱0.00 price?", tl: "Libreng kuha", body: "Zero means free pickup. Purchases of this material will pay nothing.", action: ["Yes, save ₱0.00", () => savePrice(true)] };
    case "delMat":
      return { title: "Remove this material?", tl: "Alisin sa listahan", body: "It will no longer show when buying, so it counts as refused. Past purchases and sales keep its name and price.", action: ["Remove material", delMat] };
    case "rmLine":
      if (!st.rm) return null;
      return {
        title: "Remove from load?", tl: "Alisin sa karga",
        body: 'The purchase is kept as void with the reason "Line removed". Other items in the same purchase are saved again as a corrected copy.',
        action: ["Remove", () => correct(st.rm!.pid, st.rm!.li, null)],
      };
    case "full":
      if (!open) return null;
      return {
        title: "Truck is full · Puno na", tl: `${open.no} reached ${kg(open.cap)}`,
        body: "Close it and choose a buyer, or raise the capacity if the truck can take more.",
        action: ["Close and choose buyer", () => setState((s) => ({ stack: ["load", "loadDetail", "dispatch"], loadSel: open.id, sheet: null, dsp: { buyer: null, date: dayKey(Date.now()) }, scrollTick: s.scrollTick + 1 }))],
        action2: ["Raise capacity", () => setState((s) => ({ stack: ["load", "loadDetail"], loadSel: open.id, sheet: null, capEdit: true, capStr: kgIn(open.cap), scrollTick: s.scrollTick + 1 }))],
      };
    case "newCat": {
      const v = txt.trim();
      const ex = st.cats.find((c) => c[0].toLowerCase() === v.toLowerCase());
      return { title: "New category", tl: "Bagong uri", body: "Group materials the way you sort them in the shop.", input: "e.g. Rubber · Goma", action: [ex ? "Use " + ex[0] : "Add category", addCategory, !!v] };
    }
    case "buyerMat": {
      const v = txt.trim();
      const known = st.materials.find((m) => !m.deleted && m.en.toLowerCase() === v.toLowerCase());
      return { title: "Other material", tl: "Ibang kalakal", body: "For materials this buyer takes that you do not buy yet. It is saved on this buyer only, not on your price list.", input: "e.g. Car batteries · Baterya", action: [known ? "Select " + known.en : "Add material", addBuyerMat, !!v] };
    }
    default:
      return null;
  }
}

export function Sheet() {
  const st = useStore();
  const sh = useSheet();
  if (!sh) return null;
  const enabled = sh.action ? sh.action[2] ?? true : true;
  return (
    <div className="sheet-wrap">
      <div onClick={closeSheet} style={{ flex: 1 }} />
      <div className="sheet" role="dialog" aria-label={sh.title}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <span className="col">
            <span style={{ font: "800 20px/1.2 var(--font-heading)" }}>{sh.title}</span>
            <span className="sub">{sh.tl}</span>
          </span>
          <button onClick={closeSheet} aria-label="Close" style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: 0, margin: "-8px -8px 0 0" }}>
            <Icon name="x" />
          </button>
        </div>
        {sh.body && <p style={{ margin: 0, fontSize: 15 }}>{sh.body}</p>}
        {sh.list && (
          <div className="col" style={{ margin: "0 -16px" }}>
            {sh.list.map((o) => (
              <button key={o.label} onClick={o.onClick} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56, padding: "8px 16px", background: o.selected ? "var(--color-neutral-200)" : "transparent", border: 0, borderTop: "1px solid var(--color-divider)", textAlign: "left" }}>
                <span className="col grow">
                  <span style={{ fontWeight: 600, fontSize: 16 }}>{o.label}</span>
                  <span className="sub">{o.sub}</span>
                </span>
                {o.selected && <Icon name="check" />}
              </button>
            ))}
          </div>
        )}
        {sh.chips && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {sh.chips.map((c) => <button key={c} className="chip" aria-pressed={st.sheetText === c} onClick={() => setState({ sheetText: c })} style={{ borderWidth: 1, fontWeight: 400 }}>{c}</button>)}
          </div>
        )}
        {sh.input && (
          <span className="box">
            <input type="text" aria-label={sh.input} value={st.sheetText} placeholder={sh.input} onChange={(e) => setState({ sheetText: e.target.value })} style={{ minHeight: 52, fontSize: 17, fontWeight: 600 }} />
          </span>
        )}
        {sh.action && (
          <button className="btn-main" onClick={sh.action[1]} disabled={!enabled} style={{ minHeight: 56, display: "flex", alignItems: "center", padding: "0 16px", font: "800 17px var(--font-heading)" }}>{sh.action[0]}</button>
        )}
        {sh.action2 && (
          <button onClick={sh.action2[1]} style={{ minHeight: 56, display: "flex", alignItems: "center", padding: "0 16px", background: "transparent", border: "2px solid var(--color-text)", font: "800 17px var(--font-heading)", textAlign: "left" }}>{sh.action2[0]}</button>
        )}
      </div>
    </div>
  );
}
