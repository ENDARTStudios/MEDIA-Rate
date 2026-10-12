import { describe, it, expect, vi, beforeEach } from "vitest";
import { getServerAdminGate } from "@/lib/admin-auth-server";

/**
 * T206 — contrato do probe do gate admin com PROBE DEDICADO + FALLBACK:
 * 1º probe GET /api/v1/admin/gate (200=ADMIN; 403=não-admin SEM fallback);
 * 404 do gate novo → fallback automático ao probe antigo
 * (/api/v1/admin/backfills/status) para compatibilidade de rollout;
 * 401/5xx/erro/timeout/JSON inválido = FAIL-CLOSED em ambos.
 */

const fetchMock = vi.hoisted(() => vi.fn());
vi.stubGlobal("fetch", fetchMock);

const cookieMock = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: cookieMock.get })),
}));

function status(status: number, body: Record<string, unknown> = { ok: true }) {
  return { status, ok: status < 400, json: async () => body };
}

describe("getServerAdminGate (T206 — probe dedicado + fallback fail-closed)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieMock.get.mockReturnValue({ value: "sess-token" });
  });

  function urlsChamadas(): string[] {
    return fetchMock.mock.calls.map((c) => String(c[0]));
  }

  it("gate 200 → ADMIN, sem fallback (1 chamada, ao /admin/gate)", async () => {
    fetchMock.mockResolvedValueOnce(status(200));
    expect(await getServerAdminGate()).toEqual({ autenticado: true, isAdmin: true });
    const urls = urlsChamadas();
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain("/api/v1/admin/gate");
  });

  it("gate 403 → NÃO-admin SEM fallback (decisão explícita de permissão)", async () => {
    fetchMock.mockResolvedValueOnce(status(403, { statusCode: 403 }));
    expect(await getServerAdminGate()).toEqual({ autenticado: true, isAdmin: false });
    expect(urlsChamadas()).toHaveLength(1);
    expect(urlsChamadas()[0]).not.toContain("backfills");
  });

  it("gate 404 → fallback ao probe antigo; antigo 200 → ADMIN", async () => {
    fetchMock
      .mockResolvedValueOnce(status(404))
      .mockResolvedValueOnce(status(200, { processados: 0 }));
    expect(await getServerAdminGate()).toEqual({ autenticado: true, isAdmin: true });
    const urls = urlsChamadas();
    expect(urls[0]).toContain("/api/v1/admin/gate");
    expect(urls[1]).toContain("/api/v1/admin/backfills/status");
  });

  it("gate 404 + fallback 403 → negado (fallback também decide permissão)", async () => {
    fetchMock.mockResolvedValueOnce(status(404)).mockResolvedValueOnce(status(403));
    expect(await getServerAdminGate()).toEqual({ autenticado: true, isAdmin: false });
  });

  it("gate 401 → fail-closed SEM fallback (sessão inválida é a mesma no antigo)", async () => {
    fetchMock.mockResolvedValueOnce(status(401));
    expect(await getServerAdminGate()).toEqual({ autenticado: false, isAdmin: false });
    expect(urlsChamadas()).toHaveLength(1);
  });

  it("gate 5xx → fail-closed", async () => {
    fetchMock.mockResolvedValueOnce(status(500));
    expect(await getServerAdminGate()).toEqual({ autenticado: false, isAdmin: false });
  });

  it("erro de rede/timeout no gate → fail-closed", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    expect(await getServerAdminGate()).toEqual({ autenticado: false, isAdmin: false });
  });

  it("gate 404 + fallback com erro de rede → fail-closed", async () => {
    fetchMock.mockResolvedValueOnce(status(404)).mockRejectedValueOnce(new Error("down"));
    expect(await getServerAdminGate()).toEqual({ autenticado: false, isAdmin: false });
  });

  it("gate 200 com JSON inválido → fail-closed (não confia em payload quebrado)", async () => {
    fetchMock.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => {
        throw new Error("invalid json");
      },
    });
    expect(await getServerAdminGate()).toEqual({ autenticado: false, isAdmin: false });
  });

  it("sem cookie sess → nem consulta (anônimo)", async () => {
    cookieMock.get.mockReturnValue(undefined);
    expect(await getServerAdminGate()).toEqual({ autenticado: false, isAdmin: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("probe carrega o cookie da sessão e nada sensível em URL/headers extras", async () => {
    fetchMock.mockResolvedValueOnce(status(200));
    await getServerAdminGate();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(url)).toContain("/api/v1/admin/gate");
    expect(String((init?.headers as Record<string, string>).Cookie)).toContain("sess=");
  });
});
