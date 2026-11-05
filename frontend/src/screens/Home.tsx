import { kg, peso, plural } from "../lib/format";
import { go, openLoad, pTotal, startBuying, stats, tab } from "../store/actions";
import { PERIODS, inPeriod, liveMaterials, records } from "../store/selectors";
import { setState, useStore } from "../store/store";
import { Icon } from "../ui/Icon";
import { Bar, Seg } from "../ui/parts";
import { RecordRow } from "../ui/RecordRow";

export function goOpenLoad() {
  setState((st) => {
    const open = openLoad(st);
    return open
      ? { stack: ["load", "loadDetail"], loadSel: open.id, sheet: null, capEdit: false, scrollTick: st.scrollTick + 1 }
      : { stack: ["load"], sheet: null, scrollTick: st.scrollTick + 1 };
  });
}

export default function Home() {
  const st = useStore();
  const open = openLoad(st);
  const os = open ? stats(st, open) : null;
  const inP = (t: number) => inPeriod(t, st.hPeriod, st.hFrom, st.hTo);
  const out = st.purchases.filter((p) => !p.void && inP(p.t));
  const inn = st.sales.filter((s) => !s.void && inP(s.t));

  return (
    <div className="col" style={{ paddingBottom: 16 }}>
      <div style={{ padding: 16 }}>
        <button className="btn-main" onClick={startBuying} style={{ width: "100%", minHeight: 72, display: "flex", alignItems: "center", gap: 14, padding: "0 20px" }}>
          <Icon name="plus" />
          <span style={{ font: "800 22px/1.2 var(--font-heading)" }}>Pasok Kalakal</span>
        </button>
      </div>

      <Seg options={PERIODS} value={st.hPeriod} onChange={(v) => setState({ hPeriod: v })} style={{ padding: "0 16px 0 18px" }} />
      {st.hPeriod === "custom" && <DateRange from={st.hFrom} to={st.hTo} onFrom={(v) => setState({ hFrom: v })} onTo={(v) => setState({ hTo: v })} />}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", marginTop: 12, borderTop: "2px solid var(--color-divider)", borderBottom: "2px solid var(--color-divider)" }}>
        <Total title="Cash out" tl="Biniling Kalakal" amount={peso(out.reduce((a, p) => a + pTotal(p), 0))} count={plural(out.length, "purchase")} rule />
        <Total title="Cash in" tl="Kita sa Nakalakal" amount={peso(inn.reduce((a, s) => a + s.paid, 0))} count={plural(inn.length, "sale")} />
      </div>

      <button className="press" onClick={goOpenLoad} style={{ display: "flex", flexDirection: "column", gap: 8, padding: "14px 16px", background: "transparent", border: 0, borderBottom: "2px solid var(--color-divider)", textAlign: "left" }}>
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{open ? `${open.no} · Open` : "No open load"}</span>
          <span className="sub" style={{ display: "flex", alignItems: "center", gap: 4 }}>Karga <Icon name="chev" /></span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ font: "800 34px/1 var(--font-heading)" }}>{os ? os.pct.toFixed(1) + "%" : "—"}</span>
          <span className="muted" style={{ fontSize: 14 }}>{os ? kg(os.remaining) + " left · natitira" : "Tap to start one"}</span>
        </div>
        <Bar pct={os ? os.pct : 0} height={14} warn={!!os && os.pct >= 90} />
      </button>

      {!!os && os.pct >= 100 && (
        <button onClick={goOpenLoad} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56, padding: "8px 16px", background: "var(--color-orange)", border: 0, textAlign: "left" }}>
          <Icon name="alert" />
          <span className="col grow">
            <span style={{ fontWeight: 800, fontSize: 15 }}>Truck is full · Puno na</span>
            <span style={{ fontSize: 13 }}>Raise capacity or close and start a new load</span>
          </span>
          <Icon name="chev" />
        </button>
      )}

      <button className="row" onClick={() => go("prices")} style={{ minHeight: 64, borderBottom: "2px solid var(--color-divider)" }}>
        <span className="icon-box"><Icon name="tag" /></span>
        <span className="col grow">
          <span style={{ fontWeight: 600, fontSize: 16 }}>Materials &amp; prices</span>
          <span className="sub">Kalakal at presyo · {plural(liveMaterials(st).length, "item")}</span>
        </span>
        <Icon name="chev" />
      </button>

      <div className="sec-head">
        <span className="caps">Recent</span>
        <button className="link" onClick={() => tab("ledger")}>See ledger</button>
      </div>
      <div style={{ borderTop: "2px solid var(--color-divider)" }}>
        {records(st).slice(0, 4).map((r) => <RecordRow key={r.id} r={r} />)}
        {!st.purchases.length && !st.sales.length && <div className="sub" style={{ padding: "16px" }}>No purchases yet. Tap Pasok Kalakal to record your first one.</div>}
      </div>
    </div>
  );
}

function Total({ title, tl, amount, count, rule }: { title: string; tl: string; amount: string; count: string; rule?: boolean }) {
  return (
    <div className="col" style={{ padding: "12px 16px", gap: 2, borderRight: rule ? "2px solid var(--color-divider)" : undefined }}>
      <span style={{ fontWeight: 600, fontSize: 15 }}>{title}</span>
      <span className="sub">{tl}</span>
      <span style={{ font: "800 22px var(--font-heading)", marginTop: 4 }}>{amount}</span>
      <span className="muted" style={{ fontSize: 12 }}>{count}</span>
    </div>
  );
}

export function DateRange({ from, to, onFrom, onTo }: { from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void }) {
  const style = { minHeight: 44, border: "2px solid var(--color-text)", background: "var(--color-surface)", padding: "0 6px", fontSize: 14 };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "8px 16px 0" }}>
      <input type="date" aria-label="From" value={from} onChange={(e) => onFrom(e.target.value)} style={style} />
      <input type="date" aria-label="To" value={to} onChange={(e) => onTo(e.target.value)} style={style} />
    </div>
  );
}
