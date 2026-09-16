import { build, mergeConfig } from "vite";
import { fileURLToPath } from "node:url";
import config from "../vite.config.js";

// Same production options as the app, separate entry/output. Serve the repo's
// artifacts/production-sdk directory, then open test-support/production-sdk.html.
// Optional --without-keep-names demonstrates the original production failure.
const reproduce = process.argv.includes("--without-keep-names");
await build(mergeConfig(config, {
  configFile: false,
  build: {
    outDir: "artifacts/production-sdk",
    emptyOutDir: true,
    rolldownOptions: {
      input: fileURLToPath(new URL("./production-sdk.html", import.meta.url)),
      ...(reproduce ? { output: { keepNames: false } } : {}),
    },
  },
}));
