// Weigh item: gross − tare = net, − defect (bawas) = payable, × rate = amount.
// The live breakdown lets the owner check the math in front of the seller.

import { MODE, kg, listedRate, parsePeso, peso, pesoIn, priceDesc, rate } from "../lib/format";
import { calcLine } from "../lib/rules";
import { M, setLine } from "../store/actions";
import { useStore } from "../store/store";
import { Errors, Label, NumBox, Seg } from "../ui/parts";

const REASONS = [
  { value: "moisture", label: "Moisture · Basa" },
  { value: "dirt", label: "Dirt · Dumi" },
  { value: "mixed", label: "Mixed · Halo" },
  { value: "other", label: "Other" },
];

export default function WeighItem() {
  const st = useStore();
  const L = st.line;
  if (!L) return null;
  const m = M(L.mat);
  const c = calcLine(m, L);

  const done = st.qTotal - st.queue.length;
  const rangeChips = m.mode === "range" ? ([["Min", m.min], ["Mid", listedRate(m)], ["Max", m.max]] as const) : [];
  const rateTags = [];
  if (c.override) rateTags.push("Price changed · listed " + rate(c.listed));
  if (c.oor) rateTags.push("Outside range " + priceDesc(m));

  const preview = c.net_g > 0
    ? L.dmode === "pct"
      ? `${L.pct || 0}% = −${kg(c.defect_g, 1)}`
      : c.defect_g ? `−${kg(c.defect_g, 1)} = ${(Math.round((c.defect_g * 1000) / c.net_g) / 10).toFixed(1)}% of net` : "No defect · Walang bawas"
    : "Enter gross weight first";

  return (
    <div className="col" style={{ gap: 18, padding: 16 }}>
      {st.qTotal > 1 && (
        <div className="col" style={{ gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Item {done} of {st.qTotal}</span>
          <div style={{ display: "flex", gap: 4 }}>
            {Array.from({ length: st.qTotal }, (_, i) => (
              <span key={i} style={{ flex: 1, height: 6, background: i < done - 1 ? "var(--color-text)" : i === done - 1 ? "var(--color-green)" : "var(--color-neutral-300)" }} />
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div className="col">
          <span style={{ font: "800 24px/1.1 var(--font-heading)" }}>{m.en}</span>
          <span className="muted" style={{ fontSize: 14 }}>{m.tl}</span>
        </div>
        <span className="tag tag-grey">{MODE[m.mode]}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 10 }}>
        <label className="field"><Label en="Gross" tl="Timbang" /><NumBox value={L.gross} onChange={(gross) => setLine({ gross })} unit="kg" /></label>
        <label className="field"><Label en="Tare" tl="Sako" /><NumBox value={L.tare} onChange={(tare) => setLine({ tare })} unit="kg" /></label>
      </div>

      <div className="col" style={{ gap: 8 }}>
        <Label en="Defect" tl="Bawas (basa, dumi)" />
        {L.dmode === "kg"
          ? <NumBox value={L.defect} onChange={(defect) => setLine({ defect })} unit="kg" size={24} />
          : <NumBox value={L.pct} onChange={(pct) => setLine({ pct })} unit="%" size={24} />}
        <Seg options={[{ value: "kg", label: "Kilos" }, { value: "pct", label: "Percentage" }]} value={L.dmode} onChange={(dmode) => setLine({ dmode })} fontSize={14} />
        {L.dmode === "pct" && (
          <div style={{ display: "flex", gap: 8 }}>
            {["5", "10", "20"].map((p) => (
              <button key={p} className="chip" aria-pressed={L.pct === p} onClick={() => setLine({ pct: p })} style={{ flex: 1, minHeight: 44 }}>{p}%</button>
            ))}
          </div>
        )}
        <span style={{ fontSize: 15, fontWeight: 700 }}>{preview}</span>
        {c.defect_g > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {REASONS.map((r) => (
              <button key={r.value} className="chip" aria-pressed={L.reason === r.value} onClick={() => setLine({ reason: L.reason === r.value ? "" : r.value })} style={{ borderWidth: 1, fontWeight: 400 }}>{r.label}</button>
            ))}
          </div>
        )}
      </div>

      <div className="col" style={{ gap: 8 }}>
        <span style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <Label en="Rate" tl="Presyo kada kilo" />
          <span className="sub">{m.mode === "negotiable" ? "Last agreed " + rate(m.price) : "Listed " + (m.mode === "range" ? priceDesc(m) : rate(c.listed))}</span>
        </span>
        {rangeChips.length > 0 && (
          <div style={{ display: "flex", gap: 8 }}>
            {rangeChips.map(([label, v]) => (
              <button key={label} className="chip" aria-pressed={parsePeso(L.rate) === v} onClick={() => setLine({ rate: pesoIn(v) })} style={{ flex: 1, minHeight: 44, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span>{label}</span>
                <span style={{ fontWeight: 400 }}>{peso(v)}</span>
              </button>
            ))}
          </div>
        )}
        <NumBox value={L.rate} onChange={(r) => setLine({ rate: r })} cur unit="/kg" size={24} placeholder="0.00" pad="6px" />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{rateTags.map((t) => <span key={t} className="tag tag-warn">{t}</span>)}</div>
      </div>

      <div className="col" style={{ gap: 4, paddingTop: 10, borderTop: "2px solid var(--color-text)" }}>
        <span className="muted" style={{ fontSize: 14 }}>
          {c.net_g > 0 && parsePeso(L.rate) !== null ? `Net ${kg(c.net_g)} − bawas ${kg(c.defect_g)} = ${kg(Math.max(c.payable_g, 0))} × ${rate(c.applied)}` : "Net − bawas = payable × rate"}
        </span>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontWeight: 600 }}>Amount · Halaga</span>
          <span style={{ font: "800 30px var(--font-heading)" }}>{peso(c.amount)}</span>
        </div>
      </div>

      {L.touched && c.errs.length > 0 && <Errors list={c.errs} />}
    </div>
  );
}
