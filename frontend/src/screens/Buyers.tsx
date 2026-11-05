import { M, goBuyerNew } from "../store/actions";
import { liveMaterials } from "../store/selectors";
import { setState, useStore } from "../store/store";
import { Icon } from "../ui/Icon";
import { LineButton, MainButton } from "../ui/parts";

export const BTYPES = ["Junk buyer", "Recycling plant", "Middleman", "Other"];
export const DIRECTORY = "Directory v12 · as of Oct 1, 2026";

/** Buyers: the shared directory plus your private buyers, with search and filters. */
export default function Buyers() {
  const st = useStore();
  const q = st.bq;
  const setQ = (p: Partial<typeof q>) => setState((s) => ({ bq: { ...s.bq, ...p } }));
  const locs = [...new Set(st.buyers.filter((b) => !b.deleted).map((b) => b.loc))];
  const list = st.buyers.filter((b) =>
    !b.deleted && (!q.loc || b.loc === q.loc) && (!q.type || b.type === q.type) &&
    (!q.q || b.name.toLowerCase().includes(q.q.toLowerCase())) && (!q.mats.length || b.mats.some((m) => q.mats.includes(m))),
  );

  return (
    <div className="col">
      <div className="col rule-b" style={{ padding: "12px 16px", gap: 8 }}>
        <MainButton onClick={goBuyerNew}>Add private buyer</MainButton>
        <div className="box" style={{ alignItems: "center", gap: 8, padding: "0 10px" }}>
          <Icon name="search" />
          <input type="search" aria-label="Search buyers" value={q.q} onChange={(e) => setQ({ q: e.target.value })} placeholder="Search buyers · Hanapin" style={{ minHeight: 48, fontSize: 16, padding: 0 }} />
        </div>
        <select aria-label="Location" value={q.loc} onChange={(e) => setQ({ loc: e.target.value })} style={{ minHeight: 48, border: "2px solid var(--color-text)", background: "var(--color-surface)", padding: "0 8px", fontSize: 15, fontWeight: 600, borderRadius: 0 }}>
          <option value="">All locations · Lahat ng lugar</option>
          {locs.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
          {[["", "All types"], ...BTYPES.map((t) => [t, t])].map(([v, l]) => (
            <button key={v} className="chip" aria-pressed={q.type === v} onClick={() => setQ({ type: v })} style={{ borderWidth: 1 }}>{l}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
          {liveMaterials(st).map((m) => (
            <button key={m.id} className="chip" aria-pressed={q.mats.includes(m.id)} onClick={() => setQ({ mats: q.mats.includes(m.id) ? q.mats.filter((x) => x !== m.id) : [...q.mats, m.id] })} style={{ borderWidth: 1, borderStyle: "dashed", fontWeight: 400 }}>{m.en}</button>
          ))}
        </div>
      </div>
      <div className="sub" style={{ padding: "8px 16px", display: "flex", justifyContent: "space-between" }}>
        <span>{list.length} buyer{list.length === 1 ? "" : "s"}</span><span>{DIRECTORY}</span>
      </div>
      {list.map((b) => (
        <button key={b.id} className="press" onClick={() => setState({ sheet: "buyerAct", bAct: b.id })} style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 4, padding: "12px 16px", background: "transparent", border: 0, borderTop: "1px solid var(--color-divider)", textAlign: "left" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
            <span style={{ fontWeight: 600, fontSize: 16 }}>{b.name}</span>
            <span className={"tag " + (b.src === "dir" ? "tag-grey" : "tag-dark")} style={{ fontSize: 11, padding: "2px 8px" }}>{b.src === "dir" ? "DIRECTORY" : "PRIVATE"}</span>
          </div>
          <span className="sub">{b.type} · {b.loc}{b.ver ? " · verified " + b.ver : ""}</span>
          <span style={{ fontSize: 13 }}>{b.mats.length ? "Collects: " + b.mats.map((m) => M(m).en).join(", ") : "Materials not set"}</span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{b.contact}</span>
        </button>
      ))}
      <div style={{ padding: 16 }}><LineButton onClick={goBuyerNew}>Add private buyer</LineButton></div>
    </div>
  );
}
