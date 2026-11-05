import { fmtDT, kg, peso, rate } from "../lib/format";
import { M, buyerName, pTotal, supName } from "../store/actions";
import { setState, useStore } from "../store/store";
import { Stacked } from "../ui/parts";

const REASON: Record<string, string> = { moisture: "Moisture", dirt: "Dirt", mixed: "Mixed", other: "Other" };

/** Transaction: one purchase or sale, its lines, and its audit trail. */
export default function Transaction() {
  const st = useStore();
  const tp = st.purchases.find((p) => p.id === st.txn);
  const ts = st.sales.find((s) => s.id === st.txn);
  const r = tp || ts;
  if (!r) return null;
  const load = st.loads.find((l) => l.id === r.loadId);

  type Block = { name: string; amt: string; rows: { k: string; v: string }[] };
  const lines: Block[] = tp
    ? tp.lines.map((l) => ({
        name: M(l.mat).en, amt: peso(l.amount),
        rows: [
          { k: "Scale weight", v: kg(l.gross_g) },
          { k: "Tare", v: kg(l.tare_g) },
          { k: "Net", v: kg(l.net_g) },
          { k: "Defect", v: (l.dmode === "pct" ? l.draw + "% → " : "") + kg(l.defect_g) + (l.reason ? " · " + (REASON[l.reason] ?? l.reason) : "") },
          { k: "Payable", v: kg(l.payable_g) },
          { k: "Listed rate", v: rate(l.listed) },
          { k: "Applied rate", v: rate(l.applied) + (l.override ? " · override" : "") },
        ],
      }))
    : ts!.mode === "mixed"
      ? [{ name: "Mixed load", amt: peso(ts!.amount), rows: [{ k: "Buyer weight", v: kg(ts!.total_g) }, { k: "Mixed rate", v: rate(ts!.mixedRate ?? 0) }, { k: "Paid", v: peso(ts!.paid) }] }]
      : ts!.lines.map((l) => ({ name: M(l.mat).en, amt: peso(l.amount), rows: [{ k: "Buyer weight", v: kg(l.buyer_g) }, { k: "Shop net", v: kg(l.shop) }, { k: "Rate", v: rate(l.rate) }] }));

  const audit = [
    { k: "Record ID (ULID)", v: r.id },
    { k: "Number", v: r.no },
    { k: "Recorded (phone time)", v: fmtDT(r.t) },
    { k: "Received (server time)", v: r.recv ? fmtDT(r.recv) : "Waiting to sync · Hindi pa naka-sync" },
    { k: "Status", v: r.void ? "Void" : "Active" },
    { k: "Remarks", v: r.void ? `Voided ${fmtDT(r.void.t)}: ${r.void.reason}` : tp?.corrOf ? "Correction of " + tp.corrOf : "—" },
  ];
  const strike = r.void ? "line-through" : "none";
  const tabStyle = (on: boolean) => ({ minHeight: 48, border: 0, borderBottom: `4px solid ${on ? "var(--color-green)" : "transparent"}`, background: "transparent", fontWeight: on ? 800 : 600 });

  return (
    <div className="col">
      <div className="col rule-b" style={{ padding: 16, gap: 6 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span className="tag tag-dark">{tp ? "PURCHASE · CASH OUT" : "SALE · CASH IN"}</span>
          {r.void && <span className="tag tag-warn">VOID</span>}
          {!r.recv && <span className="tag tag-grey">Not synced</span>}
        </div>
        <span style={{ font: "800 32px/1.1 var(--font-heading)", textDecoration: strike }}>{peso(tp ? pTotal(tp) : ts!.paid)}</span>
        <span style={{ fontSize: 15 }}>{tp ? supName(tp.sup) : buyerName(ts!.buyer)}</span>
        <span className="sub">{r.no} · {fmtDT(r.t)} · {r.pay}{tp ? " · " + (load?.no ?? "") : ""}</span>
      </div>
      <div className="rule-b" style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        <button onClick={() => setState({ txTab: "lines" })} style={tabStyle(st.txTab === "lines")}>Lines · Detalye</button>
        <button onClick={() => setState({ txTab: "audit" })} style={tabStyle(st.txTab === "audit")}>Audit</button>
      </div>
      {st.txTab === "lines"
        ? lines.map((l, i) => (
            <div key={i} className="rule-b" style={{ padding: "12px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontWeight: 800, fontSize: 16 }}><span>{l.name}</span><span>{l.amt}</span></div>
              {l.rows.map((x) => (
                <div key={x.k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 14, borderBottom: "1px solid var(--color-divider)" }}>
                  <span className="muted">{x.k}</span><span style={{ fontWeight: 600, textAlign: "right" }}>{x.v}</span>
                </div>
              ))}
            </div>
          ))
        : <div style={{ padding: "8px 16px" }}>{audit.map((a) => <Stacked key={a.k} k={a.k} v={a.v} />)}</div>}
      {tp && !r.void && load && load.state !== "OPEN" && (
        <div className="panel" style={{ margin: 16, padding: "10px 12px", fontSize: 14 }}>This purchase is in a closed load. Reopen the load first to void it.</div>
      )}
    </div>
  );
}
