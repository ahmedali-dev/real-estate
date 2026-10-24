import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        ink: {
          DEFAULT: "#2B1F19",
          50: "#FAF5EE",
          100: "#EADFD2",
          200: "#DCCDBB",
          300: "#A08A78",
          400: "#766154",
          500: "#6B5445",
          600: "#5A4639",
          700: "#443127",
          800: "#2B1F19",
          900: "#1C1410",
        },
        stone: {
          50: "#FAF5EE",
          100: "#F4EDE3",
          200: "#EADFD2",
        },
        brass: {
          DEFAULT: "#B8832B",
          50: "#FBF6EC",
          100: "#F3E7CC",
          500: "#B8832B",
          600: "#8A5F14",
        },
        moss: {
          DEFAULT: "#17673F",
          50: "#EDF7F1",
          100: "#E1F3E8",
          500: "#17673F",
          600: "#17673F",
        },
        rust: {
          DEFAULT: "#9A1F18",
          50: "#FBE3E1",
          500: "#9A1F18",
          600: "#7D1914",
        },
        // WattVision (electrical monitoring) tokens — namespaced "wv" so
        // they never collide with Maskan's own warm/light palette above.
        // Only ever used inside a ".wv-theme" scoped container.
        wv: {
          bg: "#121212",
          surface: "#1E1E1E",
          border: "#2C2C2E",
          "row-hover": "#252525",
          cyan: "#00E5FF",
          red: "#FF453A",
          "red-bg": "#3A1C1C",
          green: "#32D74B",
          "green-gradient": "#30D158",
          text: "#FFFFFF",
          "text-secondary": "#98989D",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
        // WattVision KPI/number font — deliberately separate from the rest
        // of the app's type system, only used inside ".wv-theme".
        "wv-mono": ["var(--font-jetbrains-mono)", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(22,35,58,0.06), 0 8px 24px -8px rgba(22,35,58,0.12)",
      },
    },
  },
  plugins: [],
};
export default config;
