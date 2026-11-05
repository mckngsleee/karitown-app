// The one main action pinned at the bottom of a screen (Save purchase, Close load, ...).

import { dayKey, peso } from "../lib/format";
import { calcLine, saleCalc } from "../lib/rules";
import {
  M, addLine, go, isOnline, saveBuyer, savePrice, savePurchase, saveSale, saveSup, selectedLoad, startSale, startWeigh, stats,
} from "../store/actions";
import { requestSync } from "../store/sync";
import { setState, useStore } from "../store/store";
import { Icon } from "./Icon";

type Action = { primary: string; tl: string; onPrimary: () => void; enabled?: boolean; info?: [string, string]; secondary?: [string, () => void]; quiet?: boolean };

function useFooter(): Action | null {
  const st = useStore();
  const top = st.stack[st.stack.length - 1];
  const sel = selectedLoad(st);

  if (top === "intake") {
    const n = st.draft.lines.length;
    return { primary: "Save purchase", tl: "I-save · cash out", onPrimary: savePurchase, enabled: n > 0, info: [`Total · ${n} item${n === 1 ? "" : "s"}`, peso(st.draft.lines.reduce((a, l) => a + l.amount, 0))] };
  }
  if (top === "pickMat") {
    const n = st.pick.length;
    return { primary: n ? `Weigh ${n} item${n === 1 ? "" : "s"}` : "Pick materials", tl: "Timbangin isa-isa", onPrimary: startWeigh, enabled: n > 0 };
  }
  if (top === "line" && st.line) {
    const ok = calcLine(M(st.line.mat), st.line).ok;
    const ctx = st.lineCtx || { kind: "new" };
    if (ctx.kind !== "new") return { primary: "Save changes", tl: ctx.kind === "purchase" ? "Original kept as void" : "I-save", onPrimary: addLine, enabled: ok };
    if (st.queue.length) return { primary: "Next: " + M(st.queue[0]).en, tl: "Susunod", onPrimary: addLine, enabled: ok };
    return { primary: "Add to purchase", tl: "Idagdag", onPrimary: addLine, enabled: ok };
  }
  if (top === "loadDetail" && sel) {
    const otherOpen = st.loads.some((l) => l.state === "OPEN" && l.id !== sel.id);
    const reopen: Action["secondary"] = !otherOpen ? ["Reopen", () => setState({ sheet: "reopen", sheetText: "" })] : undefined;
    if (sel.state === "OPEN") return { primary: "Close load", tl: "Choose who picks it up", onPrimary: () => go("dispatch", { dsp: { buyer: null, date: dayKey(Date.now()) } }), enabled: stats(st, sel).gs.length > 0 };
    if (sel.state === "CLOSED") return { primary: "Mark as picked up", tl: "Nakuha na ng mamimili", onPrimary: () => setState({ sheet: "pickedUp" }), secondary: reopen };
    if (sel.state === "PICKED_UP") return { primary: "Record sale", tl: "Itala ang benta", onPrimary: startSale, secondary: reopen };
    return { primary: "See margin", tl: "Tingnan ang kita", onPrimary: () => go("margin", { marginLoad: sel.id }) };
  }
  if (top === "dispatch") return { primary: "Close load", tl: "Isara ang karga", onPrimary: () => setState({ sheet: "confirmClose" }), enabled: !!st.dsp.buyer && !!st.dsp.date };
  if (top === "sale" && st.sale && sel) return { primary: "Save sale", tl: "I-save · cash in", onPrimary: saveSale, enabled: saleCalc(stats(st, sel), st.sale).ok };
  if (top === "txn") {
    const p = st.purchases.find((x) => x.id === st.txn);
    const s = st.sales.find((x) => x.id === st.txn);
    const r = p || s;
    const pl = p ? st.loads.find((l) => l.id === p.loadId) : null;
    const canVoid = !!r && !r.void && (!p || pl?.state === "OPEN");
    if (canVoid) return { primary: "Void this record", tl: "I-void · needs a reason", onPrimary: () => setState({ sheet: "void", sheetText: "" }), quiet: true };
  }
  if (top === "priceEdit") return { primary: st.pf?.isNew ? "Add material" : "Save material", tl: "I-save · history kept", onPrimary: () => savePrice(false) };
  if (top === "supplierNew") return { primary: st.sf.id ? "Save changes" : "Save supplier", tl: "I-save", onPrimary: saveSup, enabled: !!st.sf.name.trim() };
  if (top === "buyerNew") return { primary: st.bf.id ? "Save changes" : "Save buyer", tl: "Private to your shop", onPrimary: saveBuyer, enabled: !!st.bf.name.trim() && !!st.bf.loc.trim() };
  if (top === "sync" && isOnline() && st.ops.length && !st.syncing) return { primary: "Sync now", tl: "I-sync ngayon", onPrimary: requestSync };
  return null;
}

export function Footer() {
  const f = useFooter();
  if (!f) return null;
  const enabled = f.enabled ?? true;
  return (
    <div className="footer">
      {f.info && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span className="muted" style={{ fontSize: 14 }}>{f.info[0]}</span>
          <span style={{ font: "800 24px var(--font-heading)" }}>{f.info[1]}</span>
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        {f.secondary && (
          <button onClick={f.secondary[1]} style={{ minHeight: 56, padding: "0 14px", background: "transparent", border: "2px solid var(--color-text)", fontWeight: 800, fontSize: 15, textAlign: "left" }}>{f.secondary[0]}</button>
        )}
        <button className={f.quiet ? "btn-warn" : "btn-main"} onClick={f.onPrimary} disabled={!enabled} style={{ flex: 1, minHeight: 56, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "0 16px" }}>
          <span className="col">
            <span style={{ font: "800 17px/1.15 var(--font-heading)" }}>{f.primary}</span>
            <span style={{ fontSize: 12, fontWeight: 400 }}>{f.tl}</span>
          </span>
          <Icon name="chev" />
        </button>
      </div>
    </div>
  );
}
