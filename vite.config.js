import { defineConfig } from "vite";

// Relative asset paths support both a dedicated domain and a project subpath.
export default defineConfig({
  base: "./",
  build: {
    // Nexus 0.0.17 compares protobuf constructor.name values when applying
    // nested fields. Minifying those names makes ordinary messages look like
    // pointers and breaks project writes (undefined fieldIndex.slice()).
    rolldownOptions: { output: { keepNames: true } },
  },
});
