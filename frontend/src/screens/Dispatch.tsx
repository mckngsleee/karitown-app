import { useRef } from "react";

import { goBuyerNew, selectedLoad } from "../store/actions";
import { setState, useStore } from "../store/store";
import { Label, LineButton } from "../ui/parts";

/** Choose buyer: who will pick up the load, and when. Press and hold a buyer to edit or delete it. */
export default function Dispatch() {
  const st = useStore();
  const sel = selectedLoad(st);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const fired = useRef(false);
  if (!sel) return null;

  const down = (id: string) => {
    clearTimeout(timer.current);
    fired.current = false;
    timer.current = setTimeout(() => {
      fired.current = true;
      setState({ sheet: "buyerAct", bAct: id });
      navigator.vibrate?.(20);
    }, 550);
  };
  const up = () => clearTimeout(timer.current);

  return (
    <div className="col">
      <div className="col" style={{ padding: 16, gap: 4 }}>
        <span style={{ fontSize: 15 }}>Who will pick up <b>{sel.no}</b>?</span>
        <span className="sub">Press and hold a buyer to edit or delete.</span>
      </div>
      <div style={{ padding: "0 16px 12px" }}><LineButton onClick={goBuyerNew} tl="Bagong mamimili" minHeight={52}>Add buyer</LineButton></div>
      {st.buyers.filter((b) => !b.deleted).map((b) => {
        const on = st.dsp.buyer === b.id;
        return (
          <button
            key={b.id}
            onClick={() => {
              if (fired.current) {
                fired.current = false;
                return;
              }
              setState((s) => ({ dsp: { ...s.dsp, buyer: b.id } }));
            }}
            onPointerDown={() => down(b.id)}
            onPointerUp={up}
            onPointerLeave={up}
            onContextMenu={(e) => e.preventDefault()}
            role="radio"
            aria-checked={on}
            style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 64, padding: "8px 16px", background: on ? "var(--color-neutral-200)" : "transparent", border: 0, borderTop: "1px solid var(--color-divider)", textAlign: "left", userSelect: "none", WebkitUserSelect: "none" }}
          >
            <span style={{ width: 22, height: 22, flex: "none", borderRadius: "50%", border: "2px solid var(--color-text)", boxShadow: "inset 0 0 0 4px var(--color-bg)", background: on ? "var(--color-text)" : "transparent" }} />
            <span className="col grow">
              <span style={{ fontWeight: 600, fontSize: 15 }}>{b.name}</span>
              <span className="sub">{b.type} · {b.loc}{b.src === "private" ? " · private" : ""}</span>
            </span>
          </button>
        );
      })}
      <label className="field" style={{ padding: 16, borderTop: "2px solid var(--color-divider)" }}>
        <Label en="Pickup date" tl="Petsa ng pagkuha" />
        <input type="date" value={st.dsp.date} onChange={(e) => { const date = e.target.value; setState((s) => ({ dsp: { ...s.dsp, date } })); }} className="text-input" style={{ fontSize: 17, fontWeight: 600 }} />
      </label>
    </div>
  );
}
