import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost";

const styles: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent/90",
  ghost: "border border-surface-border text-ink hover:bg-surface-raised",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
