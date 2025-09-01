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
      // Use TS only for typechecking; do not emit declarations here
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: false,
        emitDeclarationOnly: false,
        rootDir: "src",
      }),
      esbuild({
        target: "node20",
        minify: false,
      }),
    ],
    external: (id) => {
      // Mark all node_modules as external
      return !id.startsWith(".") && !id.startsWith("/");
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
        target: "node20",
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
