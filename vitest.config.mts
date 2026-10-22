import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const alias = { "@": fileURLToPath(new URL("./src", import.meta.url)) };

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      { resolve: { alias }, test: { name: "unit", include: ["src/**/*.test.ts"], exclude: ["src/**/*.db.test.ts"] } },
      // Against a real Postgres with every migration applied (CI). One file at a time, so tests can't see each other's rows mid-run.
      {
        resolve: { alias },
        test: { name: "db", include: ["src/**/*.db.test.ts"], setupFiles: ["src/test/db-setup.ts"], fileParallelism: false },
      },
    ],
  },
});
