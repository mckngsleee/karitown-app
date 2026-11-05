import { kg, peso, pesoIn } from "../lib/format";
import { saleCalc } from "../lib/rules";
import { M, buyerName, selectedLoad, stats } from "../store/actions";
import { setState, useStore } from "../store/store";
import type { SaleForm } from "../store/types";
import { Label, NumBox, Notice, Seg } from "../ui/parts";

/** Record sale: what the buyer weighed and paid for the load, and how the load did. */
export default function RecordSale() {
  const st = useStore();
  const sel = selectedLoad(st);
  const f = st.sale;
  if (!sel || !f) return null;
  const s = stats(st, sel);
  const c = saleCalc(s, f);
  const set = (p: Partial<SaleForm>) => setState((x) => ({ sale: x.sale ? { ...x.sale, ...p } : null }));
  const setIn = (k: "w" | "r", mat: string, v: string) => setState((x) => ({ sale: x.sale ? { ...x.sale, [k]: { ...x.sale[k], [mat]: v } } : null }));
  const varTot = c.buyerTotal - s.total;
  const rows = [
    { k: "Your scale", v: kg(s.total), d: "Net weight of every purchase in this load, added up" },
    { k: "Buyer's scale", v: kg(c.buyerTotal), d: "What the buyer weighed, from the boxes above" },
    { k: "Weight difference", v: `${varTot >= 0 ? "+" : ""}${kg(varTot)} (${s.total ? (Math.round((varTot * 1000) / s.total) / 10).toFixed(1) : "0.0"}%)`, d: "Buyer's scale minus your scale. A minus means the buyer counted less" },
    { k: "Load cost", v: peso(s.cost), d: "What you paid sellers for everything in this load" },
    { k: "Margin", v: peso(c.amount - s.cost), d: "Sale amount minus load cost, before labor, transport and rent" },
  ];

  return (
    <div className="col" style={{ gap: 16, padding: 16 }}>
      <div style={{ fontSize: 15 }}><b>{sel.no}</b> · {buyerName(sel.buyer)}</div>
      <Seg options={[{ value: "per", label: "Per material" }, { value: "mixed", label: "One price for all" }]} value={f.mode} onChange={(mode) => set({ mode })} minHeight={48} fontSize={14} />
      <span className="sub" style={{ marginTop: -8 }}>Enter the weights from the buyer's scale · Timbang ng mamimili</span>

      {f.mode === "per" ? (
        <div className="col" style={{ borderTop: "2px solid var(--color-text)" }}>
          {s.gs.map((g, i) => {
            const ln = c.lines[i];
            const v = (ln?.buyer_g || 0) - g.net;
            return (
              <div key={g.mat} className="col" style={{ gap: 8, padding: "12px 0", borderBottom: "1px solid var(--color-divider)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600, fontSize: 16 }}>{M(g.mat).en}</span>
                  <span className="sub">Your scale {kg(g.net)}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 8 }}>
                  <label className="field" style={{ gap: 4 }}><span className="muted" style={{ fontSize: 12 }}>Buyer weight</span><NumBox value={f.w[g.mat] ?? ""} onChange={(x) => setIn("w", g.mat, x)} unit="kg" size={18} pad="8px" /></label>
                  <label className="field" style={{ gap: 4 }}><span className="muted" style={{ fontSize: 12 }}>Buyer price</span><NumBox value={f.r[g.mat] ?? ""} onChange={(x) => setIn("r", g.mat, x)} cur unit="/kg" size={18} pad="8px 4px" /></label>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span className="muted">Difference {v >= 0 ? "+" : ""}{kg(v)}</span>
                  <span style={{ fontWeight: 800, fontSize: 15 }}>{peso(ln?.amount || 0)}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <label className="field"><span style={{ fontWeight: 600, fontSize: 14 }}>Buyer total</span><NumBox value={f.tw} onChange={(tw) => set({ tw })} unit="kg" size={20} /></label>
            <label className="field"><span style={{ fontWeight: 600, fontSize: 14 }}>Mixed rate</span><NumBox value={f.mr} onChange={(mr) => set({ mr })} cur unit="/kg" size={20} placeholder="0.00" pad="6px 4px" /></label>
          </div>
          <span className="sub" style={{ marginTop: -6 }}>Revenue is split by each material's share of shop weight, for margin only.</span>
        </>
      )}

      <div className="col" style={{ borderTop: "2px solid var(--color-text)" }}>
        <div className="rule-b" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "10px 0" }}>
          <span className="col"><span style={{ fontWeight: 600 }}>Sale amount</span><span className="muted" style={{ fontSize: 12 }}>Buyer's weight × buyer's price</span></span>
          <span style={{ font: "800 28px var(--font-heading)" }}>{peso(c.amount)}</span>
        </div>
        <span className="caps" style={{ padding: "14px 0 4px" }}>How this load did · Kita sa karga</span>
        {rows.map((r) => (
          <div key={r.k} className="col" style={{ gap: 2, padding: "8px 0", borderBottom: "1px solid var(--color-divider)" }}>
            <span style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 15 }}><span style={{ fontWeight: 600 }}>{r.k}</span><span style={{ fontWeight: 800, whiteSpace: "nowrap" }}>{r.v}</span></span>
            <span className="sub">{r.d}</span>
          </div>
        ))}
      </div>

      <div className="col" style={{ gap: 2, marginBottom: -8 }}>
        <Label en="Payment method" tl="Paraan ng bayad" />
        <span className="sub">How the buyer paid you for this load. Cashless covers GCash, Maya and bank transfer.</span>
      </div>
      <Seg options={[{ value: "Cash", label: "Cash" }, { value: "Cashless", label: "Cashless" }]} value={f.pay} onChange={(pay) => set({ pay })} minHeight={52} fontSize={15} />
      <label className="field">
        <Label en="Amount received" tl="Natanggap" />
        <NumBox value={f.paid === "" ? pesoIn(c.amount) : f.paid} onChange={(paid) => set({ paid })} cur size={24} pad="6px" />
      </label>
      {c.paid < c.amount && <Notice>Receivable: {peso(c.amount - c.paid)} still owed by buyer. Flag only, no reminders in phase 1.</Notice>}
    </div>
  );
}
