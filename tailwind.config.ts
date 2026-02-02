import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // OpenClaw design system
        bg: {
          DEFAULT: "#12141a",
          accent: "#14161d",
          elevated: "#1a1d25",
          hover: "#262a35",
          muted: "#262a35",
        },
        card: {
          DEFAULT: "#181b22",
          foreground: "#f4f4f5",
        },
        text: {
          DEFAULT: "#e4e4e7",
          strong: "#fafafa",
          muted: "#71717a",
        },
        border: {
          DEFAULT: "#27272a",
          strong: "#3f3f46",
          hover: "#52525b",
        },
        accent: {
          DEFAULT: "#ff5c5c",
          hover: "#ff7070",
          subtle: "rgba(255, 92, 92, 0.15)",
          glow: "rgba(255, 92, 92, 0.25)",
        },
        teal: {
          DEFAULT: "#14b8a6",
          muted: "rgba(20, 184, 166, 0.7)",
          subtle: "rgba(20, 184, 166, 0.15)",
        },
        ok: {
          DEFAULT: "#22c55e",
          muted: "rgba(34, 197, 94, 0.75)",
          subtle: "rgba(34, 197, 94, 0.12)",
        },
        warn: {
          DEFAULT: "#f59e0b",
          muted: "rgba(245, 158, 11, 0.75)",
          subtle: "rgba(245, 158, 11, 0.12)",
        },
        danger: {
          DEFAULT: "#ef4444",
          muted: "rgba(239, 68, 68, 0.75)",
          subtle: "rgba(239, 68, 68, 0.12)",
        },
        info: {
          DEFAULT: "#3b82f6",
        },
      },
      fontFamily: {
        sans: ['"Space Grotesk"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(0, 0, 0, 0.2)",
        md: "0 4px 12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.03)",
        lg: "0 12px 28px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.03)",
        glow: "0 0 30px rgba(255, 92, 92, 0.25)",
      },
      animation: {
        rise: "rise 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
