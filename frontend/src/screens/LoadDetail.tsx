import { fmtDate, kg, kgIn, parseKg, peso } from "../lib/format";
import { M, buyerName, go, saveCap, selectedLoad, stats } from "../store/actions";
import { setState, useStore } from "../store/store";
import { Icon } from "../ui/Icon";
import { Bar, KV, Notice } from "../ui/parts";
import { ORDER, STATE_UI } from "./Loads";

/** Load details: its step, how full it is, the truck size, and what is in it. */
export default function LoadDetail() {
  const st = useStore();
  const sel = selectedLoad(st);
  if (!sel) return null;
  const ls = stats(st, sel);
  const si = ORDER.indexOf(sel.state);
  const capG = parseKg(st.capStr);
  const capEdit = st.capEdit && sel.state === "OPEN";

  const next = {
    OPEN: "Keep buying. When the truck is full, tap Close load and choose who will pick it up.",
    CLOSED: `Waiting for ${buyerName(sel.buyer)} to pick up${sel.disp ? " on " + fmtDate(sel.disp) : ""}. Tap Mark as picked up when the truck leaves.`,
    PICKED_UP: "The buyer has the load. Enter what they weighed and paid.",
    SOLD: "Done. Check the margin for this load.",
  }[sel.state];

  const facts: { k: string; v: string }[] = [];
  if (sel.buyer) facts.push({ k: "Buyer", v: buyerName(sel.buyer) });
  if (sel.disp) facts.push({ k: sel.state === "CLOSED" ? "Pickup date" : "Picked up", v: fmtDate(sel.disp) });
  sel.log.forEach((x) => facts.push({ k: "Reopened " + fmtDate(x.t), v: x.reason }));

  return (
    <div className="col">
      <div className="col rule-b" style={{ padding: 16, gap: 12 }}>
        <span style={{ font: "800 20px var(--font-heading)" }}>{sel.no}</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4 }}>
          {ORDER.map((s, i) => (
            <div key={s} className="col" style={{ gap: 6 }}>
              <span style={{ height: 8, background: i < si ? "var(--color-text)" : i === si ? "var(--color-green)" : "var(--color-neutral-300)" }} />
              <span style={{ fontSize: 12, fontWeight: i === si ? 800 : 400, lineHeight: 1.2 }}>{STATE_UI[s].label}</span>
              <span className="muted" style={{ fontSize: 11, lineHeight: 1.2 }}>{STATE_UI[s].tl}</span>
            </div>
          ))}
        </div>
        <div className="col panel" style={{ padding: "10px 12px", gap: 2 }}>
          <span className="muted" style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase" }}>Next step · Susunod</span>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{next}</span>
        </div>
      </div>

      <div className="col rule-b" style={{ padding: 16, gap: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ font: "800 48px/1 var(--font-heading)" }}>{ls.pct.toFixed(1)}%</span>
          <span className="muted" style={{ fontSize: 14 }}>full · puno</span>
        </div>
        <Bar pct={ls.pct} height={24} warn={ls.pct >= 90} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
          <span>{kg(ls.total)} of {kg(sel.cap)}</span>
          <span style={{ fontWeight: 600 }}>{kg(ls.remaining)} left</span>
        </div>
        {ls.pct >= 90 && sel.state === "OPEN" && (
          <Notice strong={ls.pct >= 100}>
            {ls.pct >= 100 ? `Over the limit by ${kg(ls.total - sel.cap)}. Raise capacity or close this load.` : "Almost full · Malapit nang mapuno. Plan the pickup."}
          </Notice>
        )}
      </div>

      <div className="rule-b" style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 60, padding: "8px 16px" }}>
        <span className="col grow">
          <span className="sub">Truck capacity · Kapasidad</span>
          <span style={{ fontWeight: 800, fontSize: 17 }}>{kg(sel.cap)}</span>
        </span>
        {sel.state === "OPEN" && (
          <button onClick={() => setState((s) => ({ capEdit: !s.capEdit, capStr: kgIn(sel.cap) }))} style={{ minHeight: 44, padding: "0 14px", border: "2px solid var(--color-text)", background: "transparent", fontWeight: 600, fontSize: 14 }}>
            {st.capEdit ? "Cancel" : "Edit"}
          </button>
        )}
      </div>
      {capEdit && (
        <div className="col panel rule-b" style={{ padding: "12px 16px", gap: 10 }}>
          <input type="range" aria-label="Truck capacity in kilos" min={Math.ceil(ls.total / 1000)} max={10000} step={50} value={capG !== null ? Math.floor(capG / 1000) : Math.floor(sel.cap / 1000)} onChange={(e) => setState({ capStr: e.target.value })} style={{ width: "100%", accentColor: "var(--color-text)", height: 32 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <span className="box" style={{ flex: 1, background: "var(--color-bg)" }}>
              <input type="text" inputMode="decimal" aria-label="Capacity" value={st.capStr} onChange={(e) => setState({ capStr: e.target.value })} style={{ font: "800 20px var(--font-heading)" }} />
              <span className="unit">kg</span>
            </span>
            <button className="btn-main" onClick={saveCap} style={{ minHeight: 48, padding: "0 18px", fontWeight: 800 }}>Save</button>
          </div>
          <span style={{ fontSize: 13, fontWeight: capG === null || capG < ls.total ? 700 : 400 }} className={capG === null || capG < ls.total ? "" : "muted"}>
            {capG === null ? "Enter kilos, up to 3 decimals" : capG < ls.total ? `Cannot go below current load (${kg(ls.total)})` : `Saves as ${capG.toLocaleString("en-PH")} g`}
          </span>
        </div>
      )}

      <div className="sec-head rule-b"><span className="caps">By material</span><span className="sub">Tap to see purchases</span></div>
      {ls.gs.map((g) => (
        <button key={g.mat} className="row" onClick={() => go("loadMat", { loadMat: g.mat })} style={{ minHeight: 56, gap: 10, paddingRight: 8 }}>
          <span className="col grow">
            <span style={{ fontWeight: 600, fontSize: 15 }}>{M(g.mat).en}</span>
            <span className="sub">{g.n} purchase line{g.n === 1 ? "" : "s"}</span>
          </span>
          <span className="col" style={{ alignItems: "flex-end" }}>
            <span style={{ fontWeight: 800, fontSize: 15 }}>{kg(g.net)}</span>
            <span className="sub">{peso(g.cost)}</span>
          </span>
          <Icon name="chev" />
        </button>
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", borderBottom: "2px solid var(--color-text)", fontWeight: 800 }}>
        <span>Load cost</span><span>{peso(ls.cost)}</span>
      </div>
      {!ls.gs.length && <div className="sub" style={{ padding: "12px 16px", fontSize: 14 }}>No purchases in this load yet.</div>}
      <div className="col" style={{ padding: "8px 16px 16px", gap: 4 }}>
        {facts.map((f, i) => <KV key={i} k={f.k} v={f.v} />)}
      </div>
    </div>
  );
}
