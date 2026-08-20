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
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(22,35,58,0.06), 0 8px 24px -8px rgba(22,35,58,0.12)",
      },
    },
  },
  plugins: [],
};
export default config;
