import { describe, it, expect } from "vitest";
import { currencyForRegion } from "@/lib/currency-for-region";

// T420 (D-395): moeda por PAÍS, idioma só traduz.
describe("currencyForRegion (D-395 country-first)", () => {
  it("americano (US) em pt-BR → USD (fecha arbitrage de idioma)", () => {
    expect(currencyForRegion("pt-BR", "US")).toBe("USD");
  });

  it("brasileiro (BR) em en-US → BRL (proteção LatAm)", () => {
    expect(currencyForRegion("en-US", "BR")).toBe("BRL");
  });

  it("argentino (AR) em en-US → BRL", () => {
    expect(currencyForRegion("en-US", "AR")).toBe("BRL");
  });

  it("espanhol (ES) em es-ES → EUR", () => {
    expect(currencyForRegion("es-ES", "ES")).toBe("EUR");
  });

  it("espanhol (ES) em en-US → EUR (país prevalece)", () => {
    expect(currencyForRegion("en-US", "ES")).toBe("EUR");
  });

  it("sem país + es-ES → BRL (fallback seguro)", () => {
    expect(currencyForRegion("es-ES", null)).toBe("BRL");
  });

  it("sem país + pt-BR → BRL; sem país + en-US → USD", () => {
    expect(currencyForRegion("pt-BR", null)).toBe("BRL");
    expect(currencyForRegion("en-US", null)).toBe("USD");
  });

  it("UK (GB) → USD (fora da Europa p/ EUR)", () => {
    expect(currencyForRegion("en-US", "GB")).toBe("USD");
  });
});
