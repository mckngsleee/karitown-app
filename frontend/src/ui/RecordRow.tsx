import { go } from "../store/actions";
import type { Rec } from "../store/selectors";
import { fmtDate, fmtTime, peso } from "../lib/format";
import { Icon } from "./Icon";

/** One purchase or sale in a list (Home "Recent" and the Ledger). */
export function RecordRow({ r }: { r: Rec }) {
  const strike = r.void ? "line-through" : "none";
  const isIn = r.kind === "in";
  return (
    <button className="row" onClick={() => go("txn", { txn: r.id, txTab: "lines" })}>
      <span style={{ width: 36, height: 36, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: isIn ? "var(--color-text)" : "var(--color-green-soft)", color: isIn ? "var(--color-bg)" : "var(--color-text)" }}>
        <Icon name={isIn ? "inArr" : "outArr"} size={18} />
      </span>
      <span className="col grow">
        <span className="ellipsis" style={{ fontWeight: 600, fontSize: 15, textDecoration: strike }}>{r.party}</span>
        <span className="sub ellipsis">{r.no} · {r.sub}</span>
      </span>
      <span className="col" style={{ alignItems: "flex-end" }}>
        <span style={{ fontWeight: 800, fontSize: 15, textDecoration: strike }}>{(isIn ? "+" : "−") + peso(r.amount)}</span>
        {r.void ? <span className="tag tag-warn" style={{ fontSize: 11, padding: "1px 6px", marginTop: 2 }}>VOID</span> : <span className="muted" style={{ fontSize: 12 }}>{fmtDate(r.t) + " " + fmtTime(r.t)}</span>}
      </span>
    </button>
  );
}
