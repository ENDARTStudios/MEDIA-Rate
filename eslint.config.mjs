// ESLint 9 flat config — MEDIA Rate
// Documentacao: https://eslint.org/docs/latest/use/configure/configuration-files
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier/recommended";

export default tseslint.config(
  // Arquivos ignorados (nao lintar)
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      "coverage/**",
      ".next/**",
      ".turbo/**",
      "skills/**",
      "upload/**",
      "download/**",
      "apps/web/.next/**",
      "apps/web/out/**",
      "apps/api/dist/**",
      "**/*.md",
      "**/*.json",
    ],
  },

  // Base: regras recomendadas do ESLint + typescript-eslint strict
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,

  // Plugin Prettier (roda Prettier como regra ESLint)
  prettierPlugin,

  // Desativa regras ESLint que conflitam com Prettier
  prettierConfig,

  // Configuracao especifica do projeto
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.mjs", "**/*.cjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      // Padroes exigidos pelo PROMPT_DOER_MESTRE.md Secao 3 (fail fast, sem stub)
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-unused-vars": "off", // delegado para @typescript-eslint/no-unused-vars
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "prefer-const": "error",
      "no-var": "error",
      "eqeqeq": ["error", "always", { null: "ignore" }],
      "no-throw-literal": "error",
      "prettier/prettier": [
        "error",
        {
          endOfLine: "lf",
          semi: true,
          singleQuote: false,
          trailingComma: "all",
          printWidth: 100,
          tabWidth: 2,
        },
      ],
    },
  },

  // Arquivos de configuracao (Node.js, CommonJS ou ESM puro)
  {
    files: ["*.config.{js,mjs,cjs,ts}", "eslint.config.mjs"],
    languageOptions: {
      globals: {
        module: "readonly",
        require: "readonly",
        process: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-var-requires": "off",
    },
  },

  // Modulos NestJS (controllers, modules, providers) — classes vazias com
  // decorator sao padrao do framework; regra de "no-extraneous-class"
  // precisa ser relaxada para esses arquivos.
  {
    files: ["**/*.module.ts", "**/*.controller.ts"],
    rules: {
      "@typescript-eslint/no-extraneous-class": "off",
    },
  },

  // NestJS usa emitDecoratorMetadata: classes injetadas via constructor
  // precisam ser importadas como VALUE (não type-only) para que o metadata
  // de design:paramtypes seja emitido. "consistent-type-imports" converteria
  // esses imports e quebraria o DI em runtime.
  {
    files: ["apps/api/**/*.ts"],
    rules: {
      "@typescript-eslint/consistent-type-imports": "off",
    },
  },
);
