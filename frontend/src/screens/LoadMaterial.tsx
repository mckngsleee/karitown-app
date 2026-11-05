import { fmtDT, kg, peso, rate } from "../lib/format";
import { M, go, selectedLoad, startBuying, stats, supName } from "../store/actions";
import { setState, useStore } from "../store/store";
import { LineButton } from "../ui/parts";
import { inputOf } from "./Intake";
import { STATE_UI } from "./Loads";

/** Purchases in load: every purchase line of one material in the load, with Edit and Remove. */
export default function LoadMaterial() {
  const st = useStore();
  const sel = selectedLoad(st);
  if (!sel || !st.loadMat) return null;
  const m = M(st.loadMat);
  const g = stats(st, sel).gs.find((x) => x.mat === st.loadMat) || { net: 0, cost: 0 };
  const editable = sel.state === "OPEN";
  const rows = st.purchases.filter((p) => p.loadId === sel.id && !p.void).flatMap((p) =>
    p.lines.map((l, li) => ({ p, l, li })).filter(({ l }) => l.mat === st.loadMat),
  );

  return (
    <div className="col">
      <div className="col rule-b" style={{ padding: 16, gap: 4 }}>
        <span style={{ font: "800 24px/1.1 var(--font-heading)" }}>{m.en}</span>
        <span className="muted" style={{ fontSize: 14 }}>{sel.no} · {kg(g.net)} net · {peso(g.cost)}</span>
      </div>
      {!editable && <div className="panel" style={{ margin: "16px 16px 0", padding: "10px 12px", fontSize: 14 }}>This load is {STATE_UI[sel.state].label.toLowerCase()}. Reopen it to edit or remove purchases.</div>}
      {rows.map(({ p, l, li }) => (
        <div key={p.id + li} className="col" style={{ gap: 6, padding: "12px 16px", borderBottom: "1px solid var(--color-divider)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontWeight: 800, fontSize: 16 }}>
            <span>{kg(l.net_g)} net</span><span>{peso(l.amount)}</span>
          </div>
          <span style={{ fontSize: 14 }}>{p.no} · {supName(p.sup)} · {fmtDT(p.t)}</span>
          <span className="sub">Gross {kg(l.gross_g)} · tare {kg(l.tare_g)} · bawas {kg(l.defect_g)} · {rate(l.applied)}</span>
          {editable && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
              <button onClick={() => go("line", { line: inputOf(l), lineCtx: { kind: "purchase", pid: p.id, li }, queue: [], qTotal: 0 })} style={{ minHeight: 44, padding: "0 12px", border: "2px solid var(--color-text)", background: "transparent", fontWeight: 600, textAlign: "left" }}>Edit</button>
              <button className="btn-warn" onClick={() => setState({ sheet: "rmLine", rm: { pid: p.id, li } })} style={{ minHeight: 44, padding: "0 12px", fontWeight: 600 }}>Remove</button>
            </div>
          )}
        </div>
      ))}
      {!rows.length && <div className="sub" style={{ padding: 16, fontSize: 14 }}>No purchases of this material in the load.</div>}
      {editable && <div style={{ padding: 16 }}><LineButton onClick={startBuying}>New purchase for this load</LineButton></div>}
      <div className="sub" style={{ padding: "0 16px 16px" }}>Edits keep the original as void and save a corrected copy, so the audit trail stays complete.</div>
    </div>
  );
}
