import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#08090d",
        "bg-soft": "#101319",
        panel: "rgba(18, 21, 28, 0.95)",
        card: "rgba(22, 26, 34, 0.92)",
        accent: "#e50914",
        "accent-2": "#ff1b3d",
        muted: "#aab0bb",
        subtle: "#7c8595",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Arial", "sans-serif"],
      },
      borderRadius: {
        card: "18px",
      },
      boxShadow: {
        card: "0 22px 50px rgba(0,0,0,0.45)",
        accent: "0 0 18px rgba(229, 9, 20, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
