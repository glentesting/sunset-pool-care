import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Server-side unit/integration tests (npm test). Node environment: the code
 * under test is route handlers and lib/ modules, not browser UI.
 *
 * `server-only` is aliased to an empty module — the real package throws on
 * purpose when imported outside Next's server build, which is what a test is.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/helpers/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
