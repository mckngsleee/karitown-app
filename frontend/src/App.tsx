// The app frame: header, the current screen, the pinned action, the bottom tabs, and pop-ups.

import { useEffect, useRef, type ReactElement } from "react";

import wordmark from "./assets/wordmark.png";
import Buyers from "./screens/Buyers";
import BuyerNew from "./screens/BuyerNew";
import Dispatch from "./screens/Dispatch";
import Home from "./screens/Home";
import Intake from "./screens/Intake";
import Ledger from "./screens/Ledger";
import LoadDetail from "./screens/LoadDetail";
import LoadMaterial from "./screens/LoadMaterial";
import Loads from "./screens/Loads";
import Margin from "./screens/Margin";
import More from "./screens/More";
import PickMaterials from "./screens/PickMaterials";
import PriceEdit from "./screens/PriceEdit";
import Prices from "./screens/Prices";
import RecordSale from "./screens/RecordSale";
import Suppliers, { SupplierDetail, SupplierNew } from "./screens/Suppliers";
import Sync from "./screens/Sync";
import Transaction from "./screens/Transaction";
import WeighItem from "./screens/WeighItem";
import { back, go, isOnline, startBuying, tab } from "./store/actions";
import { useStore } from "./store/store";
import { watchConnection } from "./store/sync";
import type { Screen, State } from "./store/types";
import { Footer } from "./ui/Footer";
import { Icon, Spinner, type IconName } from "./ui/Icon";
import { Sheet } from "./ui/Sheet";

const SCREENS: Record<Screen, () => ReactElement | null> = {
  home: Home, intake: Intake, pickMat: PickMaterials, line: WeighItem, load: Loads, loadDetail: LoadDetail,
  loadMat: LoadMaterial, dispatch: Dispatch, sale: RecordSale, ledger: Ledger, txn: Transaction, margin: Margin,
  more: More, prices: Prices, priceEdit: PriceEdit, buyers: Buyers, buyerNew: BuyerNew, suppliers: Suppliers,
  supplier: SupplierDetail, supplierNew: SupplierNew, sync: Sync,
};

function title(st: State, top: Screen): [string, string] {
  const T: Record<Screen, [string, string]> = {
    home: ["Karitown", "Kariton Rolling Into Town"], intake: ["New purchase", "Pasok Kalakal"], pickMat: ["Choose materials", "Pumili ng kalakal"],
    line: ["Weigh item", "Timbangin"], load: ["Truck loads", "Karga ng trak"], loadDetail: ["Load details", "Detalye ng karga"],
    loadMat: ["Purchases in load", "Mga bili sa karga"], dispatch: ["Choose buyer", "Sino ang kukuha?"], sale: ["Record sale", "Itala ang benta"],
    ledger: ["Ledger", "Talaan ng pera"], txn: ["Transaction", "Detalye"], margin: ["Margin", "Tantiyang kita"], more: ["More", "Iba pa"],
    prices: ["Materials & prices", "Kalakal at presyo"],
    priceEdit: st.pf?.isNew ? ["Add material", "Bagong kalakal"] : ["Edit material", "Baguhin ang kalakal"],
    buyers: ["Buyers", "Mga mamimili"], buyerNew: st.bf.id ? ["Edit buyer", "Baguhin ang mamimili"] : ["Add private buyer", "Bagong mamimili"],
    suppliers: ["Suppliers", "Mga nagbebenta"], supplier: ["Supplier", "Nagbebenta"],
    supplierNew: st.sf.id ? ["Edit supplier", "Baguhin ang nagbebenta"] : ["Add supplier", "Bagong nagbebenta"], sync: ["Sync", "Pag-sync"],
  };
  return T[top];
}

const TABS: [Screen, string, string, IconName][] = [
  ["home", "Home", "Bahay", "home"],
  ["intake", "Buy", "Bili", "scale"],
  ["load", "Load", "Karga", "truck"],
  ["ledger", "Ledger", "Talaan", "receipt"],
  ["more", "More", "Iba pa", "menu"],
];

/** Header chip: always says what is waiting to upload. Tap it for the Sync screen. */
function SyncChip({ st, top }: { st: State; top: Screen }) {
  const n = st.ops.length;
  const online = isOnline();
  const look = !online
    ? { label: n ? `Offline · ${n}` : "Offline", bg: "var(--color-orange)", fg: "var(--color-text)", bd: "var(--color-orange)", icon: <Icon name="cloudoff" size={16} /> }
    : st.syncing || n
      ? { label: "Syncing…", bg: "var(--color-surface)", fg: "var(--color-text)", bd: "var(--color-text)", icon: <Spinner /> }
      : { label: "Synced", bg: "var(--color-green)", fg: "var(--color-text)", bd: "var(--color-green)", icon: <Icon name="check" size={16} /> };
  return (
    <button onClick={() => top !== "sync" && go("sync")} style={{ minHeight: 36, display: "flex", alignItems: "center", gap: 6, padding: "0 10px", border: `2px solid ${look.bd}`, background: look.bg, color: look.fg, fontSize: 12, fontWeight: 600, flex: "none", whiteSpace: "nowrap" }}>
      {look.icon}<span>{look.label}</span>
    </button>
  );
}

export default function App() {
  const st = useStore();
  const mainRef = useRef<HTMLDivElement>(null);
  const top = st.stack[st.stack.length - 1];
  const root = st.stack[0];
  const [t, tl] = title(st, top);
  const ScreenView = SCREENS[top];

  useEffect(() => watchConnection(), []);
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [st.scrollTick]);

  return (
    <div className="app">
      <header className="header">
        {st.stack.length > 1 ? (
          <button onClick={back} aria-label="Back" style={{ width: 48, height: 48, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: 0 }}>
            <Icon name="back" />
          </button>
        ) : (
          <div style={{ width: 12 }} />
        )}
        <div className="col grow">
          {top === "home" ? (
            <h1 style={{ margin: 0, lineHeight: 0 }}><img src={wordmark} alt="Karitown" style={{ height: 32, width: "auto", display: "block" }} /></h1>
          ) : (
            <>
              <h1 className="ellipsis" style={{ margin: 0, font: "800 19px/1.15 var(--font-heading)" }}>{t}</h1>
              <span className="muted" style={{ fontSize: 12 }}>{tl}</span>
            </>
          )}
        </div>
        <SyncChip st={st} top={top} />
      </header>

      <main ref={mainRef} className="main">
        <ScreenView />
      </main>

      <Footer />

      {st.stack.length === 1 && (
        <nav className="tabbar" aria-label="Main">
          {TABS.map(([id, label, tag, icon]) => (
            <button key={id} aria-current={root === id ? "page" : undefined} onClick={() => (id === "intake" ? startBuying() : tab(id))}>
              <Icon name={icon} size={24} />
              <span style={{ fontSize: 12 }}>{label}</span>
              <span style={{ fontSize: 10, lineHeight: 1, fontWeight: 400 }}>{tag}</span>
            </button>
          ))}
        </nav>
      )}

      {st.toast && (
        <div className="toast" role="status">
          <Icon name="check" />
          <span>{st.toast}</span>
        </div>
      )}
      <Sheet />
    </div>
  );
}
