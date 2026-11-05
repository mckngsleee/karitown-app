import { dayKey, fmtDate, kg, peso, rate } from "../lib/format";
import { splitByWeight } from "../lib/rules";
import { M, buyerName, openLoad, stats } from "../store/actions";
import { weekStart } from "../store/selectors";
import { setState, useStore } from "../store/store";
import { KV } from "../ui/parts";

/** Margin: what each sold load made (sale minus what you paid sellers). */
export default function Margin() {
  const st = useStore();
  const sold = st.loads
    .filter((l) => l.state === "SOLD")
    .map((l) => ({ l, s: st.sales.find((x) => x.loadId === l.id && !x.void) }))
    .filter((x): x is { l: typeof x.l; s: NonNullable<typeof x.s> } => !!x.s)
    .reverse();
  const ml = sold.find((x) => x.l.id === st.marginLoad) || sold[0];
  const wk = weekStart();
  const weekM = sold.filter((x) => dayKey(x.s.t) >= wk).reduce((a, x) => a + x.s.amount - stats(st, x.l).cost, 0);
  const open = openLoad(st);

  let detail = null;
  if (ml) {
    const s = stats(st, ml.l);
    const sale = ml.s;
    const shares = sale.mode === "mixed" ? splitByWeight(sale.amount, s.gs, s.total) : [];
    const mats = s.gs.map((g, i) => {
      const rev = sale.mode === "mixed" ? shares[i] : sale.lines.find((x) => x.mat === g.mat)?.amount ?? 0;
      return { name: M(g.mat).en, cost: g.cost, rev, margin: rev - g.cost };
    });
    const v = sale.total_g - s.total;
    const facts = [
      { k: "Your scale", v: kg(s.total) },
      { k: "Buyer's scale", v: kg(sale.total_g) },
      { k: "Weight difference", v: `${v >= 0 ? "+" : ""}${kg(v)} (${s.total ? (Math.round((v * 1000) / s.total) / 10).toFixed(1) : "0.0"}%)` },
    ];
    if (sale.mode === "mixed") facts.push({ k: "Priced as", v: "One mixed rate " + rate(sale.mixedRate ?? 0) });
    const cell = { padding: "8px 0", borderTop: "1px solid var(--color-divider)", fontSize: 13 } as const;
    const head = { fontSize: 12, padding: "8px 0" } as const;

    detail = (
      <>
        <div className="rule-b" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)" }}>
          <Fig k="Cost" v={peso(s.cost)} rule />
          <Fig k="Sale" v={peso(sale.amount)} rule />
          <Fig k="Margin" v={peso(sale.amount - s.cost)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto auto auto", columnGap: 10, padding: "0 16px", fontSize: 13 }}>
          <span className="muted" style={head}>Material</span>
          <span className="muted" style={{ ...head, textAlign: "right" }}>Cost</span>
          <span className="muted" style={{ ...head, textAlign: "right" }}>Revenue</span>
          <span className="muted" style={{ ...head, textAlign: "right" }}>Margin</span>
          {mats.map((m) => [
            <span key={m.name + "n"} style={{ ...cell, fontWeight: 600 }}>{m.name}</span>,
            <span key={m.name + "c"} style={{ ...cell, textAlign: "right" }}>{peso(m.cost)}</span>,
            <span key={m.name + "r"} style={{ ...cell, textAlign: "right" }}>{peso(m.rev)}</span>,
            <span key={m.name + "m"} style={{ ...cell, textAlign: "right", fontWeight: 600 }}>{peso(m.margin)}</span>,
          ])}
        </div>
        <div className="col" style={{ padding: 16, gap: 4 }}>
          <span className="caps rule-b" style={{ paddingBottom: 6 }}>Weight check · Timbang</span>
          {facts.map((f) => <KV key={f.k} k={f.k} v={f.v} />)}
        </div>
      </>
    );
  }

  return (
    <div className="col">
      <div className="rule-b" style={{ padding: 16 }}>
        <div className="sub">Gross margin estimate, this week</div>
        <div style={{ font: "800 34px/1.1 var(--font-heading)" }}>{peso(weekM)}</div>
        <div className="sub" style={{ marginTop: 6 }}>Sold loads only. Excludes labor, transport, rent, and scale loss.</div>
      </div>
      {!sold.length && <div className="muted" style={{ padding: "20px 16px" }}>No sold loads yet.</div>}
      {sold.map((x) => (
        <button key={x.l.id} aria-current={ml && x.l.id === ml.l.id} onClick={() => setState({ marginLoad: x.l.id })} className="row" style={{ background: ml && x.l.id === ml.l.id ? "var(--color-neutral-200)" : "transparent" }}>
          <span className="col grow">
            <span style={{ fontWeight: 600, fontSize: 15 }}>{x.l.no} · {buyerName(x.s.buyer)}</span>
            <span className="sub">Sold {fmtDate(x.s.t)}</span>
          </span>
          <span style={{ fontWeight: 800, fontSize: 16 }}>{peso(x.s.amount - stats(st, x.l).cost)}</span>
        </button>
      ))}
      {detail}
      <div className="panel" style={{ margin: "0 16px 16px", padding: 12, fontSize: 14, display: "flex", justifyContent: "space-between" }}>
        <span>Stock on hand, at cost</span><b>{peso(open ? stats(st, open).cost : 0)}</b>
      </div>
    </div>
  );
}

function Fig({ k, v, rule }: { k: string; v: string; rule?: boolean }) {
  return (
    <div style={{ padding: "12px 16px", borderRight: rule ? "1px solid var(--color-divider)" : undefined }}>
      <div className="muted" style={{ fontSize: 12 }}>{k}</div>
      <div style={{ fontWeight: 800, fontSize: 15 }}>{v}</div>
    </div>
  );
}
