type Status = "ok" | "warn" | "stop";

const color: Record<Status, string> = {
  ok: "bg-status-ok",
  warn: "bg-status-warn",
  stop: "bg-status-stop",
};

export function StatusDot({ status, label }: { status: Status; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-ink-muted">
      <span className={`h-2 w-2 rounded-full ${color[status]}`} aria-hidden="true" />
      {label}
    </span>
  );
}
