import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: { DEFAULT: "#0f1117", card: "#161b26", border: "#252b3a" },
        accent: { DEFAULT: "#e50914", muted: "#b20710" },
      },
    },
  },
  plugins: [],
};

export default config;
