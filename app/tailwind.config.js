const path = require("path");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    path.join(__dirname, "app/**/*.{js,ts,jsx,tsx,mdx}"),
    path.join(__dirname, "components/**/*.{js,ts,jsx,tsx,mdx}"),
    path.join(__dirname, "lib/**/*.{js,ts,jsx,tsx,mdx}"),
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
