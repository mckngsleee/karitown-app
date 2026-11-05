import { fmtDT, fmtTime } from "../lib/format";
import { isOnline } from "../store/actions";
import { API_URL, dismissFailed, setOnline } from "../store/sync";
import { useStore } from "../store/store";
import { Icon, Spinner } from "../ui/Icon";
import { KV, Seg } from "../ui/parts";
import { DIRECTORY } from "./Buyers";

/** Sync: what is waiting to upload, and whether the server can be reached. */
export default function Sync() {
  const st = useStore();
  const online = isOnline();
  const n = st.ops.length;
  const title = !online ? "Working offline" : st.syncing ? "Uploading…" : "All synced";
  const body = !online
    ? st.forcedOffline || !navigator.onLine
      ? "Everything you save stays on this phone and uploads when there is signal. Hindi mawawala ang datos."
      : "The server is not answering. Everything you save stays on this phone and uploads when it is back."
    : st.syncing ? `Sending ${n} record${n === 1 ? "" : "s"}. Each is sent once, even if retried.` : "Every record is on the server.";

  return (
    <div className="col">
      <div className="col rule-b" style={{ padding: "20px 16px", gap: 8, background: online ? undefined : "var(--color-orange-soft)", borderLeft: online ? undefined : "6px solid var(--color-orange)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 10, font: "800 24px var(--font-heading)" }}>
          {online ? st.syncing ? <Spinner /> : <Icon name="check" size={24} /> : <Icon name="cloudoff" size={24} />}
          {title}
        </span>
        <span style={{ fontSize: 15 }}>{body}</span>
        <span className="sub">{st.lastSync ? "Last synced " + fmtDT(st.lastSync) : "Not synced yet"}</span>
      </div>

      <div className="col rule-b" style={{ padding: "12px 16px", gap: 6 }}>
        <span className="sub">Phone signal · switch off to work offline on purpose</span>
        <Seg options={[{ value: "off", label: "No signal" }, { value: "on", label: "Online" }]} value={st.forcedOffline ? "off" : "on"} onChange={(v) => setOnline(v === "on")} minHeight={48} fontSize={15} />
      </div>

      <div className="sec-head rule-b"><span className="caps">Waiting to upload</span><span className="sub">{n}</span></div>
      {st.ops.slice().reverse().map((o) => (
        <div key={o.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid var(--color-divider)", fontSize: 14 }}>
          <span><b>{o.op.replace(/_/g, " ")}</b> · {o.ref}</span>
          <span className="muted">{fmtTime(o.t)}</span>
        </div>
      ))}
      {!n && <div className="sub" style={{ padding: "12px 16px", fontSize: 14 }}>Nothing waiting. All records are on the server.</div>}

      {st.failed.length > 0 && (
        <>
          <div className="sec-head rule-b"><span className="caps">Not accepted by the server</span><span className="sub">{st.failed.length}</span></div>
          {st.failed.map((f) => (
            <div key={f.id} className="col" style={{ gap: 6, padding: "10px 16px", borderBottom: "1px solid var(--color-divider)", fontSize: 14 }}>
              <span><b>{f.op.replace(/_/g, " ")}</b> · {f.ref}</span>
              <span className="err"><Icon name="alert" /><span>{f.error}</span></span>
              <button className="link" onClick={() => dismissFailed(f.id)} style={{ alignSelf: "flex-start", minHeight: 32 }}>Dismiss</button>
            </div>
          ))}
        </>
      )}

      <div className="col" style={{ padding: 16, gap: 4 }}>
        <KV k="This phone" v="The only device for this shop" />
        <KV k="Reinstall" v="Restores from server" />
        <KV k="Buyer directory" v={DIRECTORY.replace("Directory ", "").replace(" · as of", " ·") + " · cached"} />
        <KV k="Records" v="Never deleted; corrections are voids" />
        <KV k="Server" v={API_URL} />
      </div>
    </div>
  );
}
