import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["example/**/*.test.ts"],
    exclude: ["dist", "node_modules", "output"],
    alias: {
      "~/": new URL("./src/", import.meta.url).pathname,
      "@/*": new URL("./example/*", import.meta.url).pathname,
      "#/*": new URL("./addons/*", import.meta.url).pathname,
    },
    watch: false,
  },
});
