import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";

export default defineConfig({
  // Vitest 4.x usa oxc por padrao para TS, que nao emite decorator metadata.
  // Para suportar NestJS DI (que depende de emitDecoratorMetadata), usamos
  // unplugin-swc com legacy decorators + decorator metadata e desabilitamos
  // o transformer nativo do vitest.
  esbuild: false,
  oxc: false,
  plugins: [
    swc.vite({
      jsc: {
        target: "es2022",
        parser: { syntax: "typescript", decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
      module: { type: "es6" },
    }),
  ],
  test: {
    environment: "node",
    globals: false,
    include: ["test/**/*.spec.ts", "src/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/main.ts", "src/**/*.spec.ts", "src/**/*.module.ts"],
    },
  },
});
