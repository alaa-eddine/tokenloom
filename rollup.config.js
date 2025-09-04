import { defineConfig } from "rollup";
import typescript from "@rollup/plugin-typescript";
import esbuild from "rollup-plugin-esbuild";
import dts from "rollup-plugin-dts";

export default defineConfig([
  // CommonJS build
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.cjs",
      format: "cjs",
      sourcemap: true,
      exports: "auto",
    },
    plugins: [
      esbuild({
        target: "node18",
        minify: false,
      }),
    ],
    external: (id) => {
      // Only mark node_modules as external, bundle our own code
      return id.includes("node_modules");
    },
  },
  // ES Module build (bundled)
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.esm.js",
      format: "esm",
      sourcemap: true,
    },
    plugins: [
      esbuild({
        target: "node18",
        minify: false,
      }),
    ],
    // Don't mark internal modules as external - bundle them
    external: (id) => {
      // Only mark node_modules as external, bundle our own code
      return id.includes("node_modules");
    },
  },
  // Type declarations bundle
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.d.ts",
      format: "es",
    },
    plugins: [dts()],
    external: (id) => id.includes("node_modules"),
  },
]);
