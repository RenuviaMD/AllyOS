import type { ReactNode } from "react";

/** Operational card — flat surface, hairline border, NO glow (spec: strip ornament). */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card p-5 ${className}`}>{children}</div>;
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-muted">{children}</h2>;
}
