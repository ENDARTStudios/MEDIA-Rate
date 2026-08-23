import "@testing-library/jest-dom/vitest";
import * as matchers from "@testing-library/jest-dom/matchers";
import { expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// jest-dom v6 + vitest 4: a entrada /vitest provê a AUGMENTAÇÃO DE TIPOS do
// Assertion (toHaveStyle etc.), mas a chamada expect.extend interna dela não
// alcança o expect global quando o dep é externalizado pelo vite — por isso
// registramos os matchers explicitamente aqui (runtime) além da tipagem.
expect.extend(matchers);

afterEach(() => {
  cleanup();
});
