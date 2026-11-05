import { MODE, ago, priceDesc } from "../lib/format";
import { togglePick } from "../store/actions";
import { isStale, liveMaterials } from "../store/selectors";
import { useStore } from "../store/store";
import { Icon } from "../ui/Icon";

/** Choose materials: tap everything the seller brought, then weigh them one by one. */
export default function PickMaterials() {
  const st = useStore();
  const mats = liveMaterials(st);
  const groups = st.cats.map(([c, tl]) => ({ name: c, tl, items: mats.filter((m) => (m.cat || "Other") === c) })).filter((g) => g.items.length);

  return (
    <div className="col">
      <div className="rule-b" style={{ padding: "12px 16px", fontSize: 15 }}>
        Tap every material the seller brought, then weigh them one by one. <span className="muted">Piliin lahat ng dala.</span>
      </div>
      {!mats.length && <div className="sub" style={{ padding: 16 }}>Your price list is empty. Add materials under More → Materials &amp; prices.</div>}
      {groups.map((g) => (
        <div key={g.name}>
          <div className="panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 16, padding: "12px 16px", borderTop: "2px solid var(--color-text)", borderBottom: "2px solid var(--color-text)" }}>
            <span style={{ font: "800 18px/1.2 var(--font-heading)" }}>{g.name}</span>
            <span className="sub">{g.tl}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            {g.items.map((m) => {
              const sel = st.pick.includes(m.id);
              const stale = isStale(m.upd);
              const subColor = sel ? "var(--color-bg)" : "var(--color-neutral-700)";
              return (
                <button key={m.id} aria-pressed={sel} onClick={() => togglePick(m.id)} style={{ minHeight: 112, display: "flex", flexDirection: "column", alignItems: "stretch", gap: 4, padding: "12px 14px", background: "transparent", border: 0, borderRight: "1px solid var(--color-divider)", borderBottom: "1px solid var(--color-divider)", textAlign: "left" }}>
                  <span style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "flex-start" }}>
                    <span style={{ font: "800 17px/1.15 var(--font-heading)" }}>{m.en}</span>
                    <span style={{ width: 26, height: 26, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid currentColor" }}>{sel && <Icon name="check" size={18} />}</span>
                  </span>
                  <span style={{ fontSize: 13, color: subColor }}>{m.tl}</span>
                  <span style={{ fontWeight: 600, fontSize: 14, marginTop: "auto" }}>{priceDesc(m)}</span>
                  <span style={{ fontSize: 12, color: subColor, fontWeight: stale && !sel ? 700 : 400, display: "flex", alignItems: "center", gap: 6 }}>
                    {stale && <span style={{ width: 8, height: 8, background: "var(--color-orange)", flex: "none" }} />}
                    {stale ? "Old price · " + ago(m.upd) : MODE[m.mode].split(" · ")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
