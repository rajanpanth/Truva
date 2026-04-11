import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: "#14F195",
        "accent-dim": "#0FBE76",
        surface: {
          1: "#0a0a0a",
          2: "#111111",
          3: "#181818",
          4: "#1e1e1e",
          5: "#262626",
        },
        gold: "#fbbf24",
        silver: "#94a3b8",
        bronze: "#f97316",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
