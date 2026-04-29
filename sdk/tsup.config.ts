import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index:     "src/index.ts",
    eliza:     "src/eliza.ts",
    langchain: "src/langchain.ts",
  },
  format:    ["cjs", "esm"],
  dts:       true,
  sourcemap: true,
  clean:     true,
  treeshake: true,
});
