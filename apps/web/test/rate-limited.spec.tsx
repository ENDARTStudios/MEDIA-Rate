import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { api, RateLimitedError } from "@/lib/http";
import { RateLimited } from "@/components/ui/rate-limited";
import { ErrorState } from "@/components/ui/error-state";
import { useState } from "react";

const server = setupServer(
  http.get("*/api/test", () => HttpResponse.json({ ok: true })),
);
beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function TestComponent() {
  const [state, setState] = useState<"idle" | "loading" | "rateLimited" | "error">("idle");
  const [retryAfter, setRetryAfter] = useState(5);

  const handleFetch = () => {
    setState("loading");
    api.get("/api/test")
      .then(() => setState("idle"))
      .catch((e) => {
        if (e instanceof RateLimitedError) {
          setRetryAfter(e.retryAfterSeconds);
          setState("rateLimited");
        } else {
          setState("error");
        }
      });
  };

  if (state === "rateLimited") {
    return <RateLimited retryAfterSeconds={retryAfter} onRetry={handleFetch} />;
  }
  if (state === "error") {
    return <ErrorState message="Algo deu errado." onRetry={handleFetch} />;
  }
  if (state === "loading") {
    return <div data-testid="loading">Carregando...</div>;
  }
  return <button onClick={handleFetch} data-testid="fetch-btn">Fetch</button>;
}

describe("RateLimited 429 + Retry-After", () => {
  it("exibe rate-limited com retry desabilitado", async () => {
    server.use(
      http.get("*/api/test", () => new HttpResponse(null, { status: 429, headers: { "Retry-After": "3" } })),
    );
    const { getByTestId } = render(<TestComponent />);
    await userEvent.setup().click(getByTestId("fetch-btn"));

    await waitFor(() => {
      expect(getByTestId("rate-limited")).toBeTruthy();
    });
    expect(getByTestId("rate-limited").textContent).toContain("Tente novamente em 3s");
    expect((getByTestId("rate-limited-retry") as HTMLButtonElement).disabled).toBe(true);
  });

  it("exibe error-state para erro 500", async () => {
    server.use(http.get("*/api/test", () => new HttpResponse(null, { status: 500 })));
    const { getByTestId } = render(<TestComponent />);
    await userEvent.setup().click(getByTestId("fetch-btn"));
    await waitFor(() => expect(getByTestId("error-state")).toBeTruthy());
    expect(getByTestId("error-state-retry")).toBeTruthy();
  });

  it("exibe loading ao iniciar fetch com delay", async () => {
    server.use(
      http.get("*/api/test", async () => {
        await new Promise((r) => setTimeout(r, 500));
        return HttpResponse.json({ ok: true });
      }),
    );
    const { getByTestId } = render(<TestComponent />);
    await userEvent.setup().click(getByTestId("fetch-btn"));
    expect(getByTestId("loading")).toBeTruthy();
  });
});
