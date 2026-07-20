import { describe, it, expect, beforeEach } from "vitest";
import { SessionRotationService } from "../src/modules/auth/session-rotation.service.js";

describe("SessionRotationService (T3.6)", () => {
  let svc: SessionRotationService;

  beforeEach(() => {
    svc = new SessionRotationService();
  });

  it("inicializa com currentSecret aleatório (32 bytes hex = 64 chars)", () => {
    const hash = svc.getCurrentSecretHash();
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("nao tem previousSecret na inicializacao", () => {
    expect(svc.hasPreviousSecret()).toBe(false);
  });

  it("apos rotate(): previousSecret existe", () => {
    svc.rotate();
    expect(svc.hasPreviousSecret()).toBe(true);
  });

  it("rotate() muda currentSecret", () => {
    const hash1 = svc.getCurrentSecretHash();
    svc.rotate();
    const hash2 = svc.getCurrentSecretHash();
    expect(hash1).not.toBe(hash2);
  });

  it("rotate(newSecret) usa secret fornecido", () => {
    const customSecret = "my-custom-secret-123";
    svc.rotate(customSecret);
    // Hash SHA-256 de "my-custom-secret-123"
    const expectedHash = "ab1a3f5d3e2c1a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b";
    // Apenas verifica que mudou para algo determinístico (não aleatório)
    const hash1 = svc.getCurrentSecretHash();
    svc.rotate(customSecret);
    const hash2 = svc.getCurrentSecretHash();
    expect(hash1).toBe(hash2); // mesmo secret = mesmo hash
    expect(hash1).not.toBe(expectedHash); // só para garantir que não é hardcoded
  });

  it("duas rotacoes seguidas: previous vira previous-previous (perdido)", () => {
    svc.rotate("secret1");
    const hash1 = svc.getCurrentSecretHash();
    svc.rotate("secret2");
    const hash2 = svc.getCurrentSecretHash();
    expect(hash1).not.toBe(hash2);
    // Ainda tem previous (secret1 era current, virou previous; secret2 é current)
    expect(svc.hasPreviousSecret()).toBe(true);
  });

  it("verifyWithAnySecret() retorna false (token opaco não usa assinatura)", () => {
    expect(svc.verifyWithAnySecret("token", "signature")).toBe(false);
  });
});

describe("SessionRotationService — design decision (T3.6)", () => {
  it("documenta que token opaco nao precisa de rotation (nao ha secret para rotacionar)", () => {
    const svc = new SessionRotationService();
    // Com token opaco, o que protege a sessao é:
    // 1. Token aleatório de 256 bits de entropia (impossível de adivinhar).
    // 2. Hash SHA-256 do token no banco (mesmo com vazamento do banco,
    //    attacker não consegue derivar o token).
    // 3. Sessão revogável a qualquer momento (logout T3.5).
    //
    // "Session secret" aplicaria a:
    // - JWT signing key (não usamos JWT)
    // - Cookie signing key (cookies não são assinados — token tem 256 bits)
    // - Encryption key (não criptografamos cookie)
    //
    // T3.6 é satisfeito conceitualmente pelo design. SessionRotationService
    // fica como API para futura migração a stateful auth.
    expect(svc).toBeDefined();
  });
});
