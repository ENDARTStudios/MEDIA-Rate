/* eslint-disable @typescript-eslint/no-empty-object-type -- a extensao de interface sem membros proprios e o objetivo do arquivo (#603). */
/**
 * Tipos dos matchers do jest-dom para o vitest (#603).
 *
 * Contexto: `@testing-library/jest-dom/vitest` registra os matchers em runtime
 * (ver `test/setup.ts`), mas no vitest 4.1.11 a augmentacao do tipo `Assertion`
 * deixou de alcancar o `expect` global — `toHaveStyle`, `toBeInTheDocument` e
 * companhia somem do tipo e o `tsc --noEmit` acusa 33 erros, mesmo com os testes
 * verdes em runtime.
 *
 * Esta declaracao faz o que o pacote deveria fazer: estende `Assertion` (e as
 * matchers assimetricas) com a superficie do jest-dom. Se um dia o pacote voltar
 * a declarar isso sozinho, este arquivo vira redundante — e o `tsc` acusa
 * interface duplicada, que e o sinal certo para apaga-lo.
 */
import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";

declare module "vitest" {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  interface Assertion<T = any> extends TestingLibraryMatchers<any, T> {}
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers<any, any> {}
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
