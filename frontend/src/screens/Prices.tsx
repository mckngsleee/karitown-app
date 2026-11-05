import { MODE, ago, priceDesc } from "../lib/format";
import { newMat, openPrice } from "../store/actions";
import { isStale, liveMaterials } from "../store/selectors";
import { setState, useStore } from "../store/store";
import { Icon } from "../ui/Icon";
import { MainButton, Notice } from "../ui/parts";

/** Materials & prices: the list of what the shop buys, grouped by category. */
export default function Prices() {
  const st = useStore();
  const mats = liveMaterials(st);
  const stale = mats.filter((m) => isStale(m.upd));

  return (
    <div className="col">
      <div className="rule-b" style={{ padding: "12px 16px", fontSize: 14 }}>
        You only buy what is on this list. Anything not listed is refused. <span className="muted">Wala sa listahan, hindi tinatanggap.</span>
      </div>
      {stale.length > 0 && (
        <Notice style={{ padding: "12px 16px", borderBottom: "2px solid var(--color-divider)", fontWeight: 400 }}>
          <span className="col" style={{ gap: 2 }}>
            <span style={{ fontWeight: 800, fontSize: 15 }}>{stale.length} price{stale.length > 1 ? "s are" : " is"} older than 30 days</span>
            <span style={{ fontSize: 13 }}>Lumang presyo. Check with your buyer, then tap to update.</span>
          </span>
        </Notice>
      )}
      <div style={{ display: "flex", gap: 8, padding: "12px 16px 0" }}>
        <MainButton onClick={() => setState({ sheet: "newCat", sheetText: "" })}>Add category</MainButton>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, padding: "8px 16px 0" }}>
        <button className="link" onClick={() => setState({ collapsed: {} })}>Expand all</button>
        <button className="link" onClick={() => setState((s) => ({ collapsed: Object.fromEntries(s.cats.map((c) => [c[0], true])) }))}>Collapse all</button>
      </div>

      {st.cats.map(([c, tl]) => {
        const items = mats.filter((m) => (m.cat || "Other") === c);
        const old = items.filter((m) => isStale(m.upd)).length;
        const open = !st.collapsed[c];
        return (
          <div key={c} className="col" style={{ marginTop: 12 }}>
            <div className="panel" style={{ display: "flex", alignItems: "stretch", borderTop: "2px solid var(--color-text)", borderBottom: "2px solid var(--color-text)" }}>
              <button className="press" aria-expanded={open} onClick={() => setState((s) => ({ collapsed: { ...s.collapsed, [c]: !s.collapsed[c] } }))} style={{ flex: 1, minWidth: 0, minHeight: 60, display: "flex", alignItems: "center", gap: 10, padding: "8px 8px 8px 12px", background: "transparent", border: 0, textAlign: "left" }}>
                <Icon name={open ? "chevDown" : "chev"} />
                <span className="col grow">
                  <span style={{ font: "800 18px/1.2 var(--font-heading)" }}>{c}</span>
                  <span className="sub">{items.length} item{items.length === 1 ? "" : "s"}{tl ? " · " + tl : ""}</span>
                </span>
                {old > 0 && <span className="tag tag-warn" style={{ fontWeight: 700 }}>{old} old</span>}
              </button>
              <button className="press" aria-label={"Add item to " + c} onClick={() => newMat(c)} style={{ flex: "none", minWidth: 84, display: "flex", alignItems: "center", gap: 6, padding: "0 12px", background: "transparent", border: 0, borderLeft: "2px solid var(--color-text)", fontWeight: 800, fontSize: 14 }}>
                <Icon name="plus" /><span>Add</span>
              </button>
            </div>
            {open && items.map((m) => {
              const s = isStale(m.upd);
              return (
                <button key={m.id} className="row" onClick={() => openPrice(m.id)} style={{ minHeight: 68 }}>
                  <span className="col grow" style={{ gap: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: 16 }}>{m.en} <span className="sub" style={{ fontWeight: 400 }}>· {m.tl || "—"}</span></span>
                    <span style={{ fontSize: 13, fontWeight: s ? 700 : 400, display: "flex", alignItems: "center", gap: 6 }} className={s ? "" : "muted"}>
                      {s && <span style={{ width: 8, height: 8, background: "var(--color-orange)", flex: "none" }} />}
                      {s ? "Old price · updated " + ago(m.upd) : "Updated " + ago(m.upd)}
                    </span>
                  </span>
                  <span className="col" style={{ alignItems: "flex-end", gap: 2 }}>
                    <span style={{ fontWeight: 800, fontSize: 15 }}>{priceDesc(m)}</span>
                    <span className="muted" style={{ fontSize: 12 }}>{MODE[m.mode].split(" · ")[0]}</span>
                  </span>
                </button>
              );
            })}
            {open && !items.length && <div className="sub" style={{ padding: "14px 16px", fontSize: 14, borderBottom: "1px solid var(--color-divider)" }}>No items yet. Tap Add to put a material here.</div>}
          </div>
        );
      })}
      <div style={{ height: 16 }} />
    </div>
  );
}
