import type { ReactNode } from "react";
import type { YesNo } from "../lib/types";

export function Section(props: { num: number; title: string; tag: string; children: ReactNode; readOnly?: boolean }) {
  return (
    <div className={`section${props.readOnly ? " readonly" : ""}`}>
      <div className="section-head">
        <span className="section-num">{props.num}</span>
        <span className="section-title">{props.title}</span>
        <span className="section-tag">{props.readOnly ? `${props.tag} · read-only` : props.tag}</span>
      </div>
      <div className="section-body">{props.children}</div>
    </div>
  );
}

export function Text(props: { label: string; value: string; onChange: (v: string) => void; type?: string; wide?: boolean }) {
  return (
    <div className={`field${props.wide ? " grid-wide" : ""}`}>
      <label>{props.label}</label>
      <input type={props.type ?? "text"} value={props.value} onChange={(e) => props.onChange(e.target.value)} />
    </div>
  );
}

export function Area(props: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="field grid-wide">
      <label>{props.label}</label>
      <textarea value={props.value} onChange={(e) => props.onChange(e.target.value)} />
    </div>
  );
}

export function Select(props: { label: string; value: string; onChange: (v: string) => void; options: string[]; labels?: string[] }) {
  return (
    <div className="field">
      <label>{props.label}</label>
      <select value={props.value} onChange={(e) => props.onChange(e.target.value)}>
        <option value="">— select —</option>
        {props.options.map((o, i) => (
          <option key={o} value={o}>
            {props.labels?.[i] ?? o}
          </option>
        ))}
      </select>
    </div>
  );
}

export function YesNoField(props: { label: string; value: YesNo | string; onChange: (v: YesNo) => void; extra?: { label: string; value: string }[] }) {
  const opts: { v: string; cls: string; text: string }[] = [
    { v: "yes", cls: "on-yes", text: "Yes" },
    { v: "no", cls: "on-no", text: "No" },
    ...(props.extra ?? []).map((e) => ({ v: e.value, cls: "on-neutral", text: e.label })),
  ];
  return (
    <div className="field">
      <label>{props.label}</label>
      <div className="yn">
        {opts.map((o) => (
          <button
            key={o.v}
            type="button"
            className={props.value === o.v ? o.cls : ""}
            onClick={() => props.onChange((props.value === o.v ? "" : o.v) as YesNo)}
          >
            {o.text}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CheckGroup(props: {
  items: { key: string; label: ReactNode }[];
  selected: string[];
  onChange: (sel: string[]) => void;
}) {
  function toggle(key: string) {
    props.onChange(props.selected.includes(key) ? props.selected.filter((k) => k !== key) : [...props.selected, key]);
  }
  return (
    <div className="checkgroup">
      {props.items.map((it) => (
        <label key={it.key} className={props.selected.includes(it.key) ? "checked" : ""}>
          <input type="checkbox" checked={props.selected.includes(it.key)} onChange={() => toggle(it.key)} />
          {it.label}
        </label>
      ))}
    </div>
  );
}
