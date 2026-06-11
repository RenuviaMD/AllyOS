import type { Config } from "tailwindcss";

/**
 * BioaxisOS operational theme — mirrors the public marketing tokens
 * (cyan accent, Manrope/Inter/Plex Mono) but strips ornament: no glow,
 * no particles, no marquees on operational chrome.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "#22D3EE", // cyan — matches bioaxis.renuviamd.com
          fg: "#062A30",
          muted: "#0E4A52",
        },
        surface: {
          base: "#0A0E14", // HUD near-black
          raised: "#111824",
          border: "#1E2A38",
        },
        ink: {
          DEFAULT: "#E6EDF3",
          muted: "#9AA7B4",
          faint: "#5C6A78",
        },
        status: {
          ok: "#34D399",
          warn: "#FBBF24",
          stop: "#F87171",
        },
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "var(--font-inter)", "system-ui", "sans-serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "0.625rem",
      },
      backgroundImage: {
        // Subtle HUD grid — operational, low-contrast, no glow.
        "hud-grid":
          "linear-gradient(to right, rgba(34,211,238,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(34,211,238,0.05) 1px, transparent 1px)",
      },
      backgroundSize: {
        "hud-grid": "32px 32px",
      },
    },
  },
  plugins: [],
};

export default config;
