import type { Config } from "tailwindcss";

// Design tokens for ReachInbox — matches the target Figma: a clean,
// light, Gmail-adjacent inbox UI with a green brand accent, a dark
// near-black sidebar, and warm amber timestamp pills.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#12172B",
          soft: "#1C2340",
          border: "#2B3358",
        },
        paper: {
          DEFAULT: "#FAF9F6",
          raised: "#FFFFFF",
          border: "#E7E4DC",
        },
        signal: {
          DEFAULT: "#2F5FFF",
          hover: "#2450E0",
          soft: "#E8EDFF",
        },
        brand: {
          DEFAULT: "#1F9D6C",
          hover: "#188056",
          soft: "#E4F5EC",
        },
        success: { DEFAULT: "#1F9D6C", soft: "#E4F5EC" },
        warning: { DEFAULT: "#C9891F", soft: "#FBF0DD" },
        danger: { DEFAULT: "#D64545", soft: "#FBE7E7" },
        muted: "#6B7280",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'IBM Plex Sans'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "10px",
        lg: "14px",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
