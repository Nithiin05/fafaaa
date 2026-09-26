import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#070C18",
          900: "#0B1324",
          850: "#0F192E",
          800: "#15213A",
          700: "#1F2C47",
          600: "#2A3A5C",
        },
        fg: { DEFAULT: "#E8EDF7", muted: "#93A0BA", subtle: "#6B7894" },
        sky: { DEFAULT: "#5AA9FF", strong: "#3B8BEB", soft: "rgba(90,169,255,0.12)" },
        amber: { DEFAULT: "#F2B544", soft: "rgba(242,181,68,0.12)" },
        ok: { DEFAULT: "#3CCB8E", soft: "rgba(60,203,142,0.12)" },
        bad: { DEFAULT: "#F26B6B", soft: "rgba(242,107,107,0.12)" },
        review: { DEFAULT: "#A68CF7", soft: "rgba(166,140,247,0.14)" },
      },
      fontFamily: {
        sans: ["'Inter Variable'", "Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      borderRadius: { xl: "0.875rem", "2xl": "1.125rem" },
      boxShadow: { card: "0 1px 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.5)" },
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "none" } },
      },
      animation: { "fade-up": "fade-up .35s ease-out both" },
    },
  },
  plugins: [],
};
export default config;
