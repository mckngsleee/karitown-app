import { peso } from "../lib/format";
import { go } from "../store/actions";
import { PERIODS, inPeriod, records } from "../store/selectors";
import { setState, useStore } from "../store/store";
import { Icon } from "../ui/Icon";
import { Seg } from "../ui/parts";
import { RecordRow } from "../ui/RecordRow";
import { DateRange } from "./Home";

/** Ledger: money in and out for a period, and every record. */
export default function Ledger() {
  const st = useStore();
  const pr = records(st).filter((r) => inPeriod(r.t, st.period, st.from, st.to));
  const cin = pr.filter((r) => r.kind === "in" && !r.void).reduce((a, r) => a + r.amount, 0);
  const cout = pr.filter((r) => r.kind === "out" && !r.void).reduce((a, r) => a + r.amount, 0);
  const tot = cin + cout;
  const inW = tot ? Math.round((cin * 100) / tot) : 0;

  return (
    <div className="col">
      <Seg options={PERIODS} value={st.period} onChange={(period) => setState({ period })} style={{ padding: "12px 16px 0 18px" }} />
      {st.period === "custom" && <DateRange from={st.from} to={st.to} onFrom={(from) => setState({ from })} onTo={(to) => setState({ to })} />}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", marginTop: 12, borderTop: "2px solid var(--color-divider)" }}>
        <div style={{ padding: "12px 16px", borderRight: "2px solid var(--color-divider)" }}>
          <div className="sub">Cash in · Pasok</div>
          <div style={{ font: "800 20px var(--font-heading)" }}>{peso(cin)}</div>
        </div>
        <div style={{ padding: "12px 16px" }}>
          <div className="sub">Cash out · Labas</div>
          <div style={{ font: "800 20px var(--font-heading)" }}>{peso(cout)}</div>
        </div>
      </div>
      <div style={{ display: "flex", height: 12, margin: "0 16px", background: "var(--color-neutral-200)" }}>
        <div style={{ width: (tot ? inW : 0) + "%", background: "var(--color-text)" }} />
        <div style={{ width: (tot ? 100 - inW : 0) + "%", background: "var(--color-green)" }} />
      </div>
      <div className="rule-b" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "12px 16px" }}>
        <span style={{ fontWeight: 600 }}>Net cash flow</span>
        <span style={{ font: "800 24px var(--font-heading)" }}>{peso(cin - cout)}</span>
      </div>
      <button className="panel rule-b" onClick={() => go("margin")} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 52, padding: "8px 16px", border: 0, borderBottom: "2px solid var(--color-divider)", textAlign: "left", fontSize: 14 }}>
        <Icon name="trend" />
        <span className="grow">Cash flow is not profit. See load margin.</span>
        <Icon name="chev" />
      </button>
      {!pr.length && <div className="muted" style={{ padding: "20px 16px" }}>No transactions in this period.</div>}
      {pr.map((r) => <RecordRow key={r.id} r={r} />)}
    </div>
  );
}
