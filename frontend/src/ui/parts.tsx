// Small pieces every screen uses, matching the prototype's look.

import type { CSSProperties, ReactNode } from "react";

import { Icon } from "./Icon";

/** Buttons that sit side by side, touching (Today | Week | Month | Custom). */
export function Seg<T extends string>({ options, value, onChange, minHeight = 44, fontSize = 13, style }: {
  options: { value: T; label: ReactNode }[];
  value: T | null;
  onChange: (v: T) => void;
  minHeight?: number;
  fontSize?: number;
  style?: CSSProperties;
}) {
  return (
    <div className="seg" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)`, ...style }}>
      {options.map((o) => (
        <button key={o.value} aria-pressed={value === o.value} onClick={() => onChange(o.value)} style={{ minHeight, fontSize }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** "RECENT ............ See ledger" */
export function SecHead({ title, right, rule = false }: { title: string; right?: ReactNode; rule?: boolean }) {
  return (
    <div className={"sec-head" + (rule ? " rule-b" : "")}>
      <span className="caps">{title}</span>
      {typeof right === "string" ? <span className="sub">{right}</span> : right}
    </div>
  );
}

/** A label with its Tagalog word: "Gross · Timbang" */
export function Label({ en, tl }: { en: string; tl?: string }) {
  return (
    <span className="label">
      {en} {tl && <span className="tl">· {tl}</span>}
    </span>
  );
}

/** A big number box with a unit: [ 12      kg ] */
export function NumBox({ value, onChange, unit, cur, size = 28, placeholder = "0", pad }: {
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  cur?: boolean;
  size?: number;
  placeholder?: string;
  pad?: string;
}) {
  return (
    <span className="box">
      {cur && <span className="cur" style={{ fontSize: size - 2 }}>₱</span>}
      <input type="text" inputMode="decimal" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={{ font: `800 ${size}px var(--font-heading)`, padding: pad }} />
      {unit && <span className="unit">{unit}</span>}
    </span>
  );
}

export function TextField({ label, tl, value, onChange, placeholder, type = "text", strong }: {
  label: string;
  tl?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  strong?: boolean;
}) {
  return (
    <label className="field">
      <Label en={label} tl={tl} />
      <input className="text-input" type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={strong ? { fontSize: 17, fontWeight: 600 } : undefined} />
    </label>
  );
}

/** One "label ..... value" line. */
export function KV({ k, v }: { k: ReactNode; v: ReactNode }) {
  return (
    <div className="kv">
      <span>{k}</span>
      <span>{v}</span>
    </div>
  );
}

/** One "label / value" pair stacked, as on the Audit tab. */
export function Stacked({ k, v }: { k: ReactNode; v: ReactNode }) {
  return (
    <div className="col" style={{ padding: "8px 0", borderBottom: "1px solid var(--color-divider)" }}>
      <span style={{ fontSize: 12 }} className="muted">{k}</span>
      <span style={{ fontWeight: 600, fontSize: 14, wordBreak: "break-all" }}>{v}</span>
    </div>
  );
}

export function Bar({ pct, height, warn }: { pct: number; height: number; warn?: boolean }) {
  return (
    <div className="bar" data-warn={warn} style={{ height, width: "100%" }}>
      <span style={{ width: Math.min(100, pct) + "%" }} />
    </div>
  );
}

export function Notice({ children, strong, style }: { children: ReactNode; strong?: boolean; style?: CSSProperties }) {
  return (
    <div className={"notice" + (strong ? " notice-strong" : "")} style={style}>
      <Icon name="alert" />
      <span>{children}</span>
    </div>
  );
}

export function Errors({ list }: { list: string[] }) {
  return (
    <div className="col" style={{ gap: 6 }}>
      {list.map((e) => (
        <div key={e} className="err">
          <Icon name="alert" />
          <span>{e}</span>
        </div>
      ))}
    </div>
  );
}

/** "+ Add materials · Magdagdag" outlined button */
export function LineButton({ onClick, children, tl, minHeight = 56 }: { onClick: () => void; children: ReactNode; tl?: string; minHeight?: number }) {
  return (
    <button className="btn-line press" onClick={onClick} style={{ minHeight }}>
      <Icon name="plus" />
      <span>
        {children} {tl && <span style={{ fontWeight: 400, fontSize: 14 }}>· {tl}</span>}
      </span>
    </button>
  );
}

/** "+ Add private buyer" filled green button */
export function MainButton({ onClick, children, minHeight = 52, fontSize = 16, style }: { onClick: () => void; children: ReactNode; minHeight?: number; fontSize?: number; style?: CSSProperties }) {
  return (
    <button className="btn-main" onClick={onClick} style={{ width: "100%", minHeight, display: "flex", alignItems: "center", gap: 12, padding: "0 16px", font: `800 ${fontSize}px var(--font-heading)`, ...style }}>
      <Icon name="plus" />
      <span>{children}</span>
    </button>
  );
}

/** Row with an icon box on the left and a chevron on the right (More screen, suppliers). */
export function NavRow({ icon, title, sub, onClick, minHeight = 64 }: { icon: ReactNode; title: ReactNode; sub: ReactNode; onClick: () => void; minHeight?: number }) {
  return (
    <button className="row" onClick={onClick} style={{ minHeight, gap: 14 }}>
      <span className="icon-box">{icon}</span>
      <span className="col grow">
        <span style={{ fontWeight: 600, fontSize: 16 }}>{title}</span>
        <span className="sub">{sub}</span>
      </span>
      <Icon name="chev" />
    </button>
  );
}
