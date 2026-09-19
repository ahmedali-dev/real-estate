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
          DEFAULT: "#16233A",
          50: "#EEF1F6",
          100: "#D6DCE8",
          200: "#AEB9D0",
          300: "#8695B7",
          400: "#5E729D",
          500: "#3B4E77",
          600: "#28395C",
          700: "#1D2B49",
          800: "#16233A",
          900: "#0E1626",
        },
        stone: {
          50: "#FAF9F6",
          100: "#F4F2EC",
          200: "#E9E5DA",
        },
        brass: {
          DEFAULT: "#B08D4F",
          50: "#FBF6EC",
          100: "#F3E7CC",
          500: "#B08D4F",
          600: "#8F7040",
        },
        moss: {
          DEFAULT: "#2F6F63",
          50: "#EAF3F1",
          100: "#CFE4DF",
          500: "#2F6F63",
          600: "#245A50",
        },
        rust: {
          DEFAULT: "#B14A3A",
          50: "#FBEAE7",
          500: "#B14A3A",
          600: "#933A2C",
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
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-inter)", "sans-serif"],
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
