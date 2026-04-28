import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Prevent vitest/vite from traversing up to the root postcss.config.mjs
    environment: "node",
  },
  // Explicitly set root to sdk/ — stops PostCSS config search from going up
  root: ".",
  css: {
    postcss: {},
  },
});
