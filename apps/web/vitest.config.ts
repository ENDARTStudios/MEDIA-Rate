import { defineConfig } from "vitest/config";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  test: {
    environment: "jsdom",
    /**
     * #603 (vitest 4.1.11): o default passou a procurar o snapshot ao lado do spec,
     * mas os nossos ficam em test/__snapshots__/ desde sempre. Fixar o caminho evita
     * regerar .snap (o que mascararia diferenca real).
     */
    resolveSnapshotPath: (testPath, snapExtension) =>
      join(dirname(testPath), "__snapshots__", basename(testPath) + snapExtension),
    include: ["test/**/*.spec.ts", "test/**/*.spec.tsx"],
    setupFiles: ["./test/setup.ts"],
    server: {
      deps: {
        // Inline do next-intl: o alias de next/navigation (stub) só vale se o
        // módulo for transformado pelo vite (deps externalizados resolvem via
        // Node e quebram com "Cannot find module next/navigation").
        inline: ["next-intl"],
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      // vitest não resolve o módulo real de next/navigation (ESM/CJS mix) —
      // stub mínimo para componentes que usam next-intl/navigation.
      "next/navigation": resolve(__dirname, "./test/stubs/next-navigation.tsx"),
    },
  },
});
