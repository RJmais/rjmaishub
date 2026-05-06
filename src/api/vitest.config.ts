import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: [
        "src/lib/hubspot.ts",
        "src/routes/webhooks/anaLead.ts",
      ],
    },
  },
  resolve: {
    alias: {
      // mirror tsconfig @/* → src/*
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
