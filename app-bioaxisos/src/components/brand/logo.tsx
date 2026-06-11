/** DNA double-helix mark — operational (flat, no glow), cyan accent. */
export function HelixMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#22D3EE"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M7 3c0 4 10 5 10 9s-10 5-10 9" />
      <path d="M17 3c0 4-10 5-10 9s10 5 10 9" />
      <path d="M8.5 6h7M8.5 18h7M7 12h10M9 9h6M9 15h6" strokeWidth="1.1" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2 font-sans text-lg font-semibold tracking-tight">
      <HelixMark size={22} />
      <span>
        Bioaxis<span className="text-accent">OS</span>
      </span>
    </span>
  );
}
