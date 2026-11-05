// Everything the app keeps. Weights are grams, money is centavos, times are milliseconds.

export type PriceMode = "fixed" | "range" | "negotiable";
export type Pay = "Cash" | "Cashless";
export type LoadState = "OPEN" | "CLOSED" | "PICKED_UP" | "SOLD";

export type Material = {
  id: string;
  cat: string;
  en: string;
  tl: string;
  mode: PriceMode;
  price: number; // fixed or negotiable price; for a range, the middle
  min: number; // range only
  max: number; // range only
  upd: number; // when the price last changed
  deleted: boolean;
};

/** What the owner typed on the Weigh item screen. */
export type LineInput = {
  mat: string;
  gross: string;
  tare: string;
  dmode: "kg" | "pct";
  defect: string;
  pct: string;
  reason: string;
  rate: string;
  touched: boolean;
};

/** One weighed item, worked out. */
export type Line = {
  mat: string;
  name: string; // kept so old receipts show the name even after the material is removed
  gross_g: number;
  tare_g: number;
  net_g: number;
  defect_g: number;
  dmode: "kg" | "pct";
  draw: string; // what was typed for the defect (kilos or percent)
  reason: string;
  payable_g: number;
  listed: number;
  applied: number;
  override: boolean;
  oor: boolean; // outside the price range
  amount: number;
  inp?: LineInput;
};

export type Voided = { reason: string; t: number } | null;

export type Purchase = {
  id: string;
  no: string;
  t: number;
  sup: string; // supplier id, or "walkin"
  pay: Pay;
  lines: Line[];
  loadId: string;
  void: Voided;
  recv: number | null; // when the server received it; null = waiting to upload
  corrOf?: string;
};

export type Load = {
  id: string;
  no: string;
  t: number;
  state: LoadState;
  cap: number;
  buyer: string | null;
  disp: number | null; // pickup date while Closed, pickup time after
  log: { reason: string; t: number }[];
};

export type SaleLine = { mat: string; buyer_g: number; rate: number; amount: number; shop: number };

export type Sale = {
  id: string;
  no: string;
  t: number;
  loadId: string;
  buyer: string | null;
  mode: "per" | "mixed";
  mixedRate: number | null;
  total_g: number;
  lines: SaleLine[];
  amount: number;
  paid: number;
  pay: Pay;
  recv: number | null;
  void: Voided;
};

export type Supplier = { id: string; name: string; type: string; contact: string; added: number; deleted: boolean };

export type Buyer = {
  id: string;
  name: string;
  type: string;
  loc: string;
  mats: string[];
  contact: string;
  src: "dir" | "private";
  ver: string;
  deleted: boolean;
};

export type PriceEvent = { mat: string; from: string; to: string; mode: PriceMode; t: number };

/** A change saved on the phone that still has to be sent to the server. */
export type Op = { id: string; op: string; ref: string; t: number; method: "POST" | "PUT" | "DELETE"; path: string; body?: unknown };
export type FailedOp = Op & { error: string };

export type Screen =
  | "home" | "intake" | "pickMat" | "line" | "load" | "loadDetail" | "loadMat" | "dispatch" | "sale"
  | "ledger" | "txn" | "margin" | "more" | "prices" | "priceEdit" | "buyers" | "buyerNew"
  | "suppliers" | "supplier" | "supplierNew" | "sync";

export type Period = "today" | "week" | "month" | "custom";

export type Sheet =
  | null | "supPick" | "confirmClose" | "pickedUp" | "buyerAct" | "buyerDel" | "supDel" | "reopen" | "void"
  | "zero" | "delMat" | "rmLine" | "full" | "newCat" | "buyerMat";

export type LineCtx = { kind: "new" } | { kind: "draft"; idx: number } | { kind: "purchase"; pid: string; li: number };

export type SaleForm = { mode: "per" | "mixed"; w: Record<string, string>; r: Record<string, string>; tw: string; mr: string; pay: Pay; paid: string };
export type PriceForm = { id: string | null; isNew: boolean; cat: string; en: string; tl: string; mode: PriceMode; price: string; min: string; max: string; err: string };
export type BuyerForm = { id: string | null; name: string; type: string; loc: string; contact: string; mats: string[] };
export type SupplierForm = { id: string | null; name: string; type: string; contact: string; from: "intake" | null };

/** Records kept on the phone (saved in the browser's storage). */
export type Data = {
  materials: Material[];
  purchases: Purchase[];
  loads: Load[];
  sales: Sale[];
  suppliers: Supplier[];
  buyers: Buyer[];
  priceEvents: PriceEvent[];
  cats: [string, string][];
  ops: Op[];
  failed: FailedOp[];
  pno: number; // next purchase number
  sno: number; // next sale number
  lno: number; // next load number
  lastSync: number | null;
  restored: boolean; // true once the phone has its data (from the server or started fresh)
  draft: { sup: string; supSet?: boolean; pay: Pay; lines: Line[] }; // supSet: the seller was chosen for this purchase
  forcedOffline: boolean;
};

/** Where the owner is in the app and what they are typing. Not saved. */
export type Ui = {
  stack: Screen[];
  line: LineInput | null;
  lineCtx: LineCtx | null;
  pick: string[];
  queue: string[];
  qTotal: number;
  hPeriod: Period;
  hFrom: string;
  hTo: string;
  period: Period;
  from: string;
  to: string;
  txn: string | null;
  txTab: "lines" | "audit";
  sheet: Sheet;
  sheetText: string;
  toast: string | null;
  loadSel: string | null;
  loadFilter: "all" | LoadState;
  loadMat: string | null;
  rm: { pid: string; li: number } | null;
  capEdit: boolean;
  capStr: string;
  dsp: { buyer: string | null; date: string };
  sale: SaleForm | null;
  marginLoad: string | null;
  pf: PriceForm | null;
  bq: { q: string; loc: string; type: string; mats: string[] };
  bf: BuyerForm;
  sf: SupplierForm;
  supSel: string | null;
  bAct: string | null;
  collapsed: Record<string, boolean>;
  serverUp: boolean;
  syncing: boolean;
  scrollTick: number;
};

export type State = Data & Ui;
