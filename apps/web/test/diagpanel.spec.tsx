import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { DiagPanel } from "@/components/DiagPanel";

function mockResponse(status: number, body: unknown) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as Response;
}

describe("DiagPanel (T346 — sem requests duplicados)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async () => mockResponse(200, { email: "diag@teste.com" }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState({}, "", "/");
  });

  it("sem ?diag=1 NÃO dispara chamadas de API", async () => {
    render(<DiagPanel />);
    await new Promise((r) => setTimeout(r, 50));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("com ?diag=1 dispara exatamente UMA chamada por endpoint", async () => {
    window.history.pushState({}, "", "/?diag=1");
    render(<DiagPanel />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const meCalls = fetchMock.mock.calls.filter(([u]) => String(u).includes("/auth/me"));
    const wlCalls = fetchMock.mock.calls.filter(([u]) => String(u).includes("/watchlist"));
    expect(meCalls).toHaveLength(1);
    expect(wlCalls).toHaveLength(1);
  });
});
