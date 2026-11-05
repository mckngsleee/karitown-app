import { fmtDT, MODE } from "../lib/format";
import { setState, useStore } from "../store/store";
import type { PriceForm, PriceMode } from "../store/types";
import { Errors, Label, NumBox, TextField } from "../ui/parts";

const MODE_HELP: Record<PriceMode, string> = {
  fixed: "One price per kilo. Purchases default to it.",
  range: "Min and max. Purchases default to the middle; outside the range is allowed but flagged.",
  negotiable: "Last agreed price. The rate must be confirmed at every purchase.",
};

/** Add or edit a material: name, category, how it is priced, and its price history. */
export default function PriceEdit() {
  const st = useStore();
  const f = st.pf;
  if (!f) return null;
  const set = (p: Partial<PriceForm>) => setState((s) => ({ pf: s.pf ? { ...s.pf, ...p, err: "" } : null }));
  const history = st.priceEvents.filter((e) => e.mat === f.id).reverse();
  const box = { minHeight: 52, border: "2px solid var(--color-text)", fontWeight: 600 } as const;

  return (
    <div className="col" style={{ gap: 16, padding: 16 }}>
      <TextField label="Name in English" value={f.en} onChange={(en) => set({ en })} placeholder="e.g. Plastic chairs" strong />
      <TextField label="Name in Tagalog" value={f.tl} onChange={(tl) => set({ tl })} placeholder="hal. Silyang plastik" />

      <div className="col" style={{ gap: 6 }}>
        <Label en="Category" tl="Uri" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          {st.cats.map(([c, tl]) => (
            <button key={c} aria-pressed={f.cat === c} onClick={() => set({ cat: c })} style={{ ...box, background: "transparent", fontSize: 13, display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", padding: "0 8px", textAlign: "left" }}>
              <span>{c}</span><span style={{ fontWeight: 400, fontSize: 11 }}>{tl}</span>
            </button>
          ))}
          <button onClick={() => setState({ sheet: "newCat", sheetText: "" })} style={{ ...box, borderStyle: "dashed", background: "transparent", fontSize: 13, padding: "0 8px", textAlign: "left" }}>+ New</button>
        </div>
      </div>

      <div className="col" style={{ gap: 6 }}>
        <span className="label">Price mode</span>
        <div className="seg" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
          {(["fixed", "range", "negotiable"] as PriceMode[]).map((v) => {
            const [label, tl] = MODE[v].split(" · ");
            return (
              <button key={v} aria-pressed={f.mode === v} onClick={() => set({ mode: v })} style={{ minHeight: 52, fontSize: 14, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span>{label}</span><span style={{ fontWeight: 400, fontSize: 12 }}>{tl}</span>
              </button>
            );
          })}
        </div>
        <span className="sub">{MODE_HELP[f.mode]}</span>
      </div>

      {f.mode !== "range" ? (
        <label className="field">
          <span className="label">{f.mode === "negotiable" ? "Reference price (last agreed)" : "Price per kilo"}</span>
          <NumBox value={f.price} onChange={(price) => set({ price })} cur unit="/kg" size={24} placeholder="0.00" pad="6px" />
        </label>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <label className="field"><span className="label">Min</span><NumBox value={f.min} onChange={(min) => set({ min })} cur size={22} pad="6px" placeholder="" /></label>
          <label className="field"><span className="label">Max</span><NumBox value={f.max} onChange={(max) => set({ max })} cur size={22} pad="6px" placeholder="" /></label>
        </div>
      )}
      {f.err && <Errors list={[f.err]} />}

      {!f.isNew && (
        <>
          <div className="col">
            <span className="caps rule-b" style={{ paddingBottom: 6 }}>Price history · Kasaysayan</span>
            {history.map((h, i) => (
              <div key={i} className="col" style={{ padding: "8px 0", borderBottom: "1px solid var(--color-divider)", fontSize: 14 }}>
                <span style={{ fontWeight: 600 }}>{h.from} → {h.to}</span>
                <span className="muted" style={{ fontSize: 12 }}>{fmtDT(h.t)} · {MODE[h.mode].split(" · ")[0]}</span>
              </div>
            ))}
            {!history.length && <span className="muted" style={{ padding: "8px 0", fontSize: 14 }}>No edits yet.</span>}
          </div>
          <button className="btn-warn" onClick={() => setState({ sheet: "delMat" })} style={{ minHeight: 52, display: "flex", alignItems: "center", padding: "0 16px" }}>Remove from list</button>
        </>
      )}
    </div>
  );
}
