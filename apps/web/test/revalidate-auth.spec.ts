import { describe, expect, it } from "vitest";
import { isRevalidateTokenValid } from "@/lib/revalidate-auth";

describe("revalidate-auth (T447/D-441)", () => {
  it("aceita o token exato", () => {
    expect(isRevalidateTokenValid("segredo-123", "segredo-123")).toBe(true);
  });

  it("rejeita token errado, ausente ou secret vazio (fail-closed)", () => {
    expect(isRevalidateTokenValid("errado", "segredo-123")).toBe(false);
    expect(isRevalidateTokenValid(null, "segredo-123")).toBe(false);
    expect(isRevalidateTokenValid("", "segredo-123")).toBe(false);
    expect(isRevalidateTokenValid("qualquer", "")).toBe(false);
  });

  it("rejeita tamanho diferente sem lançar (guarda do timingSafeEqual)", () => {
    expect(isRevalidateTokenValid("curto", "segredo-bem-mais-longo")).toBe(false);
  });
});
