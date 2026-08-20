import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("jose", () => ({
  createRemoteJWKSet: vi.fn(() => () => ({})),
  jwtVerify: vi.fn(),
}));

import { jwtVerify } from "jose";
import { GoogleAuthService } from "../src/modules/auth/google-auth.service.js";

describe("GoogleAuthService (T361)", () => {
  const service = new GoogleAuthService();
  const original = process.env.GOOGLE_CLIENT_ID;

  afterEach(() => {
    if (original === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = original;
    vi.clearAllMocks();
  });

  it("valida token e retorna email/nome", async () => {
    process.env.GOOGLE_CLIENT_ID = "client-123";
    vi.mocked(jwtVerify).mockResolvedValue({
      payload: { email: "ana@exemplo.com", name: "Ana" },
    } as never);

    const profile = await service.verify("jwt-token");
    expect(profile).toEqual({ email: "ana@exemplo.com", nome: "Ana" });
  });

  it("401 quando GOOGLE_CLIENT_ID ausente", async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    await expect(service.verify("jwt-token")).rejects.toMatchObject({ status: 401 });
  });

  it("401 quando token inválido (jwtVerify rejeita)", async () => {
    process.env.GOOGLE_CLIENT_ID = "client-123";
    vi.mocked(jwtVerify).mockRejectedValue(new Error("assinatura inválida"));
    await expect(service.verify("jwt-token")).rejects.toMatchObject({ status: 401 });
  });

  it("401 quando token sem email", async () => {
    process.env.GOOGLE_CLIENT_ID = "client-123";
    vi.mocked(jwtVerify).mockResolvedValue({ payload: { sub: "123" } } as never);
    await expect(service.verify("jwt-token")).rejects.toMatchObject({ status: 401 });
  });
});
