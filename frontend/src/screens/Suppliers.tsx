import { fmtDate } from "../lib/format";
import { go } from "../store/actions";
import { setState, useStore } from "../store/store";
import type { SupplierForm } from "../store/types";
import { Icon } from "../ui/Icon";
import { LineButton, NavRow, TextField } from "../ui/parts";

export const STYPES = ["Collector (staff)", "Walk-in", "Business", "Other"];

const goSupNew = () => go("supplierNew", { sf: { id: null, name: "", type: "Collector (staff)", contact: "", from: null } });

/** Suppliers: regular sellers and your collectors. */
export default function Suppliers() {
  const st = useStore();
  return (
    <div className="col">
      <div className="muted rule-b" style={{ padding: "12px 16px", fontSize: 14 }}>
        Walk-in is used when you don't need a name. Save regular sellers and your collectors here so their purchases are easy to find.
      </div>
      {st.suppliers.filter((s) => !s.deleted).map((s) => {
        const c = st.purchases.filter((p) => p.sup === s.id && !p.void).length;
        return <NavRow key={s.id} icon={<Icon name="user" />} title={s.name} sub={`${s.type} · ${c} purchase${c === 1 ? "" : "s"}`} onClick={() => go("supplier", { supSel: s.id })} />;
      })}
      <div style={{ padding: 16 }}><LineButton onClick={goSupNew} tl="Bagong nagbebenta">Add supplier</LineButton></div>
    </div>
  );
}

/** One supplier's details, with Edit and Remove. */
export function SupplierDetail() {
  const st = useStore();
  const s = st.suppliers.find((x) => x.id === st.supSel);
  if (!s) return null;
  const count = st.purchases.filter((p) => p.sup === s.id && !p.void).length;
  return (
    <div className="col" style={{ padding: 16, gap: 4 }}>
      <span style={{ font: "800 24px/1.1 var(--font-heading)" }}>{s.name}</span>
      {[["Type", s.type], ["Mobile", s.contact || "Not given"], ["Added", fmtDate(s.added)], ["Purchases", String(count)]].map(([k, v]) => (
        <div key={k} className="col" style={{ padding: "8px 0", borderBottom: "1px solid var(--color-divider)" }}>
          <span className="muted" style={{ fontSize: 12 }}>{k}</span>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{v}</span>
        </div>
      ))}
      {!s.deleted && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16 }}>
          <button onClick={() => go("supplierNew", { sf: { id: s.id, name: s.name, type: s.type, contact: s.contact, from: null } })} style={{ minHeight: 52, padding: "0 16px", background: "transparent", border: "2px solid var(--color-text)", fontWeight: 800, textAlign: "left" }}>Edit</button>
          <button className="btn-warn" onClick={() => setState({ sheet: "supDel" })} style={{ minHeight: 52, padding: "0 16px" }}>Remove</button>
        </div>
      )}
    </div>
  );
}

/** Add or edit a supplier. */
export function SupplierNew() {
  const st = useStore();
  const f = st.sf;
  const set = (p: Partial<SupplierForm>) => setState((s) => ({ sf: { ...s.sf, ...p } }));
  return (
    <div className="col" style={{ gap: 16, padding: 16 }}>
      <TextField label="Name" tl="Pangalan" value={f.name} onChange={(name) => set({ name })} />
      <div className="col" style={{ gap: 6 }}>
        <span className="label">Type</span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {STYPES.map((t) => <button key={t} className="chip" aria-pressed={f.type === t} onClick={() => set({ type: t })} style={{ minHeight: 48 }}>{t}</button>)}
        </div>
      </div>
      <TextField label="Mobile number" tl="optional" type="tel" value={f.contact} onChange={(contact) => set({ contact })} placeholder="09XX XXX XXXX" />
    </div>
  );
}

