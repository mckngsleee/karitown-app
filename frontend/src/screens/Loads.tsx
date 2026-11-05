import { dayKey, kg, kgIn } from "../lib/format";
import { buyerName, go, openLoad, startLoad, stats } from "../store/actions";
import { setState, useStore } from "../store/store";
import type { Load, LoadState } from "../store/types";
import { Icon } from "../ui/Icon";
import { Bar } from "../ui/parts";
import { goOpenLoad } from "./Home";

export const ORDER: LoadState[] = ["OPEN", "CLOSED", "PICKED_UP", "SOLD"];
export const STATE_UI: Record<LoadState, { label: string; tl: string; cls: string }> = {
  OPEN: { label: "Open", tl: "Bukas", cls: "tag-green" },
  CLOSED: { label: "Closed", tl: "Sarado", cls: "tag-grey" },
  PICKED_UP: { label: "Picked up", tl: "Nakuha na", cls: "tag-dark" },
  SOLD: { label: "Sold", tl: "Nabenta", cls: "" },
};

export function StateTag({ l }: { l: Load }) {
  const u = STATE_UI[l.state];
  return <span className={"tag " + u.cls} style={{ padding: "3px 10px", border: "1px solid var(--color-text)" }}>{u.label}</span>;
}

/** Truck loads: the current load, and every load by status. */
export default function Loads() {
  const st = useStore();
  const open = openLoad(st);
  const os = open ? stats(st, open) : null;
  const fl = st.loadFilter;
  const filters = [["all", "All"], ...ORDER.map((s) => [s, STATE_UI[s].label])] as [typeof fl, string][];
  const rows = [...st.loads].reverse().filter((l) => fl === "all" || l.state === fl);

  return (
    <div className="col">
      {open && os ? (
        <>
          <button className="press" onClick={goOpenLoad} style={{ display: "flex", flexDirection: "column", gap: 10, padding: 16, background: "transparent", border: 0, borderBottom: "2px solid var(--color-divider)", textAlign: "left" }}>
            <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}><span className="sub">Current load · Kasalukuyang karga</span><Icon name="chev" /></span>
            <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <span style={{ font: "800 18px var(--font-heading)" }}>{open.no}</span>
              <span className="tag tag-green" style={{ padding: "3px 10px" }}>Open · Bukas</span>
            </span>
            <span style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ font: "800 48px/1 var(--font-heading)" }}>{os.pct.toFixed(1)}%</span>
              <span className="muted" style={{ fontSize: 14 }}>{kg(os.remaining)} left</span>
            </span>
            <Bar pct={os.pct} height={24} warn={os.pct >= 90} />
            <span style={{ fontSize: 14 }}>{kg(os.total)} of {kg(open.cap)}</span>
          </button>
          {os.pct >= 100 && (
            <div className="col notice-strong" style={{ padding: "12px 16px", gap: 10 }}>
              <span style={{ display: "flex", gap: 8, alignItems: "flex-start", fontWeight: 800, fontSize: 15 }}>
                <Icon name="alert" />
                <span>{open.no} reached its limit of {kg(open.cap)}. Raise the capacity, or close it and start a new load.</span>
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button onClick={() => setState((s) => ({ stack: ["load", "loadDetail"], loadSel: open.id, capEdit: true, capStr: kgIn(open.cap), scrollTick: s.scrollTick + 1 }))} style={{ minHeight: 48, padding: "0 12px", background: "transparent", border: "2px solid var(--color-text)", fontWeight: 800, textAlign: "left" }}>Raise capacity</button>
                <button onClick={() => setState((s) => ({ stack: ["load", "loadDetail", "dispatch"], loadSel: open.id, sheet: null, dsp: { buyer: null, date: dayKey(Date.now()) }, scrollTick: s.scrollTick + 1 }))} style={{ minHeight: 48, padding: "0 12px", background: "var(--color-bg)", border: 0, fontWeight: 800, textAlign: "left" }}>Close &amp; dispatch</button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="col panel" style={{ padding: 16, gap: 10, borderBottom: "2px solid var(--color-divider)" }}>
          <span style={{ font: "800 20px var(--font-heading)" }}>No open load</span>
          <span style={{ fontSize: 15 }}>Wala pang bukas na karga. Start one now to set the truck size, or your next purchase will start it.</span>
          <button className="btn-main" onClick={startLoad} style={{ minHeight: 56, display: "flex", alignItems: "center", gap: 12, padding: "0 16px", font: "800 17px var(--font-heading)" }}>
            <Icon name="plus" /><span>Start new load</span>
          </button>
        </div>
      )}

      <div className="sec-head"><span className="caps">All loads</span><span className="sub">Lahat ng karga</span></div>
      <div style={{ display: "flex", gap: 6, padding: "0 16px 12px", overflowX: "auto" }}>
        {filters.map(([v, label]) => (
          <button key={v} className="chip" aria-pressed={fl === v} onClick={() => setState({ loadFilter: v })}>
            {label} {v === "all" ? st.loads.length : st.loads.filter((x) => x.state === v).length}
          </button>
        ))}
      </div>
      <div style={{ borderTop: "2px solid var(--color-divider)" }}>
        {rows.map((l) => {
          const s = stats(st, l);
          return (
            <button key={l.id} className="row" onClick={() => go("loadDetail", { loadSel: l.id, capEdit: false })} style={{ minHeight: 64 }}>
              <span className="col grow" style={{ gap: 2 }}>
                <span style={{ fontWeight: 800, fontSize: 16 }}>{l.no}</span>
                <span className="sub">{kg(s.total)} · {s.pct.toFixed(1)}%{l.buyer ? " · " + buyerName(l.buyer) : ""}</span>
              </span>
              <StateTag l={l} />
              <Icon name="chev" />
            </button>
          );
        })}
        {!rows.length && <div className="sub" style={{ padding: 16, fontSize: 14 }}>No loads with this status.</div>}
      </div>
    </div>
  );
}
