import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "types/index": "src/types/index.ts",
    "client/index": "src/client/index.ts",
  },
  format: ["cjs", "esm"],
  dts: {
    resolve: true,
    compilerOptions: {
      skipLibCheck: true,
      composite: false,
    },
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  tsconfig: "./tsconfig.json",
});

