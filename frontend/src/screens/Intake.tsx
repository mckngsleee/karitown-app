// New purchase (Pasok Kalakal): who is selling, the weighed items, and how they were paid.

import { kg, kgIn, peso, pesoIn, rate } from "../lib/format";
import { M, addMaterials, go, openLoad, stats, supName } from "../store/actions";
import { setState, useStore } from "../store/store";
import type { Line, LineInput } from "../store/types";
import { Icon } from "../ui/Icon";
import { Label, LineButton, Seg } from "../ui/parts";

/** Turn a saved line back into what was typed, to edit it. */
export function inputOf(l: Line): LineInput {
  if (l.inp) return { ...l.inp, touched: true };
  return {
    mat: l.mat, gross: kgIn(l.gross_g), tare: kgIn(l.tare_g), dmode: l.dmode,
    defect: l.dmode === "kg" && l.defect_g ? kgIn(l.defect_g) : "", pct: l.dmode === "pct" ? l.draw : "",
    reason: l.reason || "", rate: pesoIn(l.applied), touched: true,
  };
}

export default function Intake() {
  const st = useStore();
  const d = st.draft;
  const open = openLoad(st);
  const os = open ? stats(st, open) : null;
  const dNet = d.lines.reduce((a, l) => a + l.net_g, 0);
  const loadNote = open && os
    ? `Goes to ${open.no}: ${os.pct.toFixed(1)}% → ${(Math.round(((os.total + dNet) * 1000) / open.cap) / 10).toFixed(1)}% full`
    : "No open load. Saving starts a new load.";

  return (
    <div className="col">
      <button className="row" onClick={() => setState({ sheet: "supPick" })} style={{ minHeight: 64, borderBottom: "2px solid var(--color-divider)" }}>
        <span className="icon-box"><Icon name="user" /></span>
        <span className="col grow">
          <span className="sub">Supplier · Nagbebenta</span>
          <span style={{ fontWeight: 600, fontSize: 16 }}>{d.supSet ? supName(d.sup) : "Choose the seller first"}</span>
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, textDecoration: "underline", textUnderlineOffset: 3 }}>Change</span>
      </button>

      <div className="sec-head rule-b">
        <span className="caps">Items</span>
        <span className="sub">Tap an item to change it</span>
      </div>
      {!d.lines.length && (
        <div className="muted" style={{ padding: "20px 16px", fontSize: 15 }}>
          No items yet. Tap Add materials and pick everything the seller brought.<br />Wala pang laman.
        </div>
      )}
      {d.lines.map((l, i) => {
        const tags = [];
        if (l.defect_g) tags.push("Bawas −" + kg(l.defect_g));
        if (l.override) tags.push("Price changed");
        if (l.oor) tags.push("Out of range");
        return (
          <div key={i} style={{ display: "flex", alignItems: "stretch", borderBottom: "1px solid var(--color-divider)" }}>
            <button className="press" onClick={() => go("line", { line: inputOf(l), lineCtx: { kind: "draft", idx: i }, queue: [], qTotal: 0 })} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "flex-start", gap: 8, padding: "12px 8px 12px 16px", background: "transparent", border: 0, textAlign: "left" }}>
              <span className="col grow" style={{ gap: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 16 }}>{M(l.mat).en}</span>
                <span className="muted" style={{ fontSize: 14 }}>{kg(l.payable_g)} × {rate(l.applied)}</span>
                <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{tags.map((t) => <span key={t} className={"tag " + (t.startsWith("Bawas") ? "tag-grey" : "tag-warn")}>{t}</span>)}</span>
              </span>
              <span className="col" style={{ alignItems: "flex-end", gap: 4 }}>
                <span style={{ font: "800 17px var(--font-heading)" }}>{peso(l.amount)}</span>
                <span style={{ fontSize: 13, fontWeight: 700, textDecoration: "underline" }}>Edit</span>
              </span>
            </button>
            <button aria-label="Remove" onClick={() => setState((s) => ({ draft: { ...s.draft, lines: s.draft.lines.filter((_, j) => j !== i) } }))} style={{ width: 48, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: 0, borderLeft: "1px solid var(--color-divider)", color: "var(--color-neutral-700)" }}>
              <Icon name="x" />
            </button>
          </div>
        );
      })}

      <div style={{ padding: "12px 16px" }}>
        <LineButton onClick={addMaterials} tl="Magdagdag">Add materials</LineButton>
      </div>

      <div className="col" style={{ padding: "12px 16px 8px", gap: 2 }}>
        <Label en="Payment method" tl="Paraan ng bayad" />
        <span className="sub">How you paid the seller.</span>
      </div>
      <Seg options={[{ value: "Cash", label: "Cash" }, { value: "Cashless", label: "Cashless" }]} value={d.pay} onChange={(pay) => setState((s) => ({ draft: { ...s.draft, pay } }))} minHeight={52} fontSize={15} style={{ padding: "0 16px 0 18px" }} />
      {d.pay === "Cashless" && <div className="sub" style={{ padding: "6px 16px 0" }}>GCash, Maya or bank. Recorded only; send the payment outside the app.</div>}

      <div className="panel" style={{ margin: 16, padding: 12, display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14 }}>
        <Icon name="truck" />
        <span>{loadNote}</span>
      </div>
    </div>
  );
}
