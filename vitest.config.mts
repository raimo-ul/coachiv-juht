import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    // The shared modules live beside the functions that deploy them, so the
    // tests live there too. They are plain vitest files, never Deno.test:
    // a Deno.test call inside a function file crashes it at runtime.
    include: ["supabase/functions/_shared/**/*.test.ts"],
  },
});
