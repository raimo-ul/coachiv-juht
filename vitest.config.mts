import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      // The real package throws on import outside a React Server Component, by
      // design: it is how Next stops server code reaching a browser bundle. In
      // a plain node test there is no such bundle, so it is stubbed out. The
      // guard still holds where it matters, which is the build.
      "server-only": fileURLToPath(new URL("./test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
