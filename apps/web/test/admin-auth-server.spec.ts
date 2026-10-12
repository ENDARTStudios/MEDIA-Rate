import { describe, it, expect, vi, beforeEach } from "vitest";
import { getServerAdminGate } from "@/lib/admin-auth-server";

/**
 * T202 — contrato do helper do gate server-side da área admin.
 * Fonte de verdade = RolesGuard da API (probe GET /api/v1/admin/backfills/status,
 * @Roles("ADMIN")) com o cookie sess do request. FAIL-CLOSED em qualquer erro.
 */

const cookieMock = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: cookieMock.get })),
}));

const fetchMock = vi.hoisted(() => vi.fn());
vi.stubGlobal("fetch", fetchMock);

describe("getServerAdminGate (T202 — deny-by-default, fail-closed)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieMock.get.mockReturnValue({ value: "sess-token" });
  });

  it("200 do endpoint admin → autenticado + isAdmin", async () => {
    fetchMock.mockResolvedValue({ status: 200 });
    expect(await getServerAdminGate()).toEqual({ autenticado: true, isAdmin: true });
  });

  it("403 (RolesGuard negou) → autenticado, mas NÃO admin", async () => {
    fetchMock.mockResolvedValue({ status: 403 });
    expect(await getServerAdminGate()).toEqual({ autenticado: true, isAdmin: false });
  });

  it("401 (sessão inválida/expirada) → tratado como anônimo", async () => {
    fetchMock.mockResolvedValue({ status: 401 });
    expect(await getServerAdminGate()).toEqual({ autenticado: false, isAdmin: false });
  });

  it("5xx → fail-closed (não-admin)", async () => {
    fetchMock.mockResolvedValue({ status: 500 });
    expect(await getServerAdminGate()).toEqual({ autenticado: false, isAdmin: false });
  });

  it("erro de rede/timeout → fail-closed", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    expect(await getServerAdminGate()).toEqual({ autenticado: false, isAdmin: false });
  });

  it("sem cookie sess → nem consulta (anônimo)", async () => {
    cookieMock.get.mockReturnValue(undefined);
    expect(await getServerAdminGate()).toEqual({ autenticado: false, isAdmin: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("consulta o probe admin com o cookie da sessão (sem segredos no corpo)", async () => {
    fetchMock.mockResolvedValue({ status: 200 });
    await getServerAdminGate();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(url)).toContain("/api/v1/admin/backfills/status");
    expect(String((init?.headers as Record<string, string>).Cookie)).toContain("sess=");
  });
});
