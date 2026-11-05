import { M } from "../store/actions";
import { liveMaterials } from "../store/selectors";
import { setState, useStore } from "../store/store";
import type { BuyerForm } from "../store/types";
import { Label, TextField } from "../ui/parts";
import { BTYPES } from "./Buyers";

/** Add or edit a private buyer. */
export default function BuyerNew() {
  const st = useStore();
  const f = st.bf;
  const set = (p: Partial<BuyerForm>) => setState((s) => ({ bf: { ...s.bf, ...p } }));
  const mats = f.mats || [];
  const extra = mats.filter((x) => !st.materials.some((m) => m.id === x)); // "Other" materials typed in
  const toggle = (id: string) => set({ mats: mats.includes(id) ? mats.filter((x) => x !== id) : [...mats, id] });

  return (
    <div className="col" style={{ gap: 16, padding: 16 }}>
      <span className="muted" style={{ fontSize: 14 }}>Private buyers are only visible on your phone. Business contact only.</span>
      <TextField label="Name" tl="Pangalan" value={f.name} onChange={(name) => set({ name })} />
      <div className="col" style={{ gap: 6 }}>
        <span className="label">Type</span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {BTYPES.map((t) => <button key={t} className="chip" aria-pressed={f.type === t} onClick={() => set({ type: t })} style={{ minHeight: 48, fontSize: 14 }}>{t}</button>)}
        </div>
      </div>
      <div className="col" style={{ gap: 6 }}>
        <Label en="Materials they buy" tl="Binibili nila" />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {liveMaterials(st).map((m) => <button key={m.id} className="chip" aria-pressed={mats.includes(m.id)} onClick={() => toggle(m.id)} style={{ minHeight: 44, fontSize: 14 }}>{m.en}</button>)}
          {extra.map((x) => <button key={x} className="chip" aria-pressed onClick={() => toggle(x)} aria-label={"Remove " + M(x).en} style={{ minHeight: 44, fontSize: 14 }}>{x}  ×</button>)}
          <button className="chip" onClick={() => setState({ sheet: "buyerMat", sheetText: "" })} style={{ minHeight: 44, fontSize: 14, borderStyle: "dashed" }}>+ Other material</button>
        </div>
      </div>
      <TextField label="City or barangay" value={f.loc} onChange={(loc) => set({ loc })} />
      <TextField label="Business contact" tl="optional" type="tel" value={f.contact} onChange={(contact) => set({ contact })} />
    </div>
  );
}
