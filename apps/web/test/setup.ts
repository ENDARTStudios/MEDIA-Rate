import { expect, afterEach } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";

// jest-dom v6 + vitest: registra os matchers explicitamente via
// @testing-library/jest-dom/matchers (a entrada /vitest resolveu para o build
// CJS com import extensionless de ./dist/matchers, que o ESM do vitest não
// resolveu — por isso toHaveStyle falhava com "Invalid Chai property").
expect.extend(matchers);

afterEach(() => {
  cleanup();
});
