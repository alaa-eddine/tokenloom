import { defineConfig } from "rollup";
import typescript from "@rollup/plugin-typescript";
import esbuild from "rollup-plugin-esbuild";
import dts from "rollup-plugin-dts";
import nodePolyfills from "rollup-plugin-polyfill-node";

export default defineConfig([
  // CommonJS build (Node.js)
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
  // Browser build (UMD)
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.browser.js",
      format: "umd",
      name: "TokenLoomLib",
      sourcemap: true,
      exports: "named",
      outro: `
// Make TokenLoom class available directly as global TokenLoom for convenience
if (typeof window !== 'undefined') {
  window.TokenLoom = TokenLoomLib.TokenLoom;
  // Also expose other exports on the TokenLoom function
  Object.assign(window.TokenLoom, TokenLoomLib);
}
if (typeof global !== 'undefined') {
  global.TokenLoom = TokenLoomLib.TokenLoom;
  Object.assign(global.TokenLoom, TokenLoomLib);
}
      `.trim(),
    },
    plugins: [
      nodePolyfills(),
      esbuild({
        target: "es2020",
        minify: false,
      }),
    ],
    external: [],
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
