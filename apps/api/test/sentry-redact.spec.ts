import { describe, it, expect } from "vitest";
import { redactEvent } from "../src/common/sentry.js";

describe("sentry.redactEvent (T293)", () => {
  it("redige header Authorization", () => {
    const evento = {
      request: {
        headers: {
          "authorization": "Bearer segredo-muito-longo",
          "content-type": "application/json",
        },
      },
    };
    const out = redactEvent(evento) as { request: { headers: Record<string, string> } };
    expect(out.request.headers.authorization).toBe("[REDACTED]");
    expect(out.request.headers["content-type"]).toBe("application/json");
  });

  it("redige header cookie e x-api-key", () => {
    const out = redactEvent({
      request: { headers: { "cookie": "sess=abc", "x-api-key": "k123", "accept": "json" } },
    }) as { request: { headers: Record<string, string> } };
    expect(out.request.headers.cookie).toBe("[REDACTED]");
    expect(out.request.headers["x-api-key"]).toBe("[REDACTED]");
    expect(out.request.headers.accept).toBe("json");
  });

  it("redige password/token em request.data (JSON string) e extra", () => {
    const out = redactEvent({
      request: { headers: {}, data: '{"email":"a@b.com","password":"segredo","token":"t"}' },
      extra: { stripe_secret_key: "sk_live_x", userId: "u1" },
    }) as {
      request: { data: string };
      extra: Record<string, string>;
    };
    const parsed = JSON.parse(out.request.data) as Record<string, string>;
    expect(parsed.password).toBe("[REDACTED]");
    expect(parsed.token).toBe("[REDACTED]");
    expect(parsed.email).toBe("a@b.com");
    expect(out.extra.stripe_secret_key).toBe("[REDACTED]");
    expect(out.extra.userId).toBe("u1");
  });

  it("limita event.user a id (sem email)", () => {
    const out = redactEvent({
      user: { id: "u1", email: "a@b.com", ip_address: "1.2.3.4" },
    }) as { user: Record<string, unknown> };
    expect(out.user).toEqual({ id: "u1" });
  });

  it("mantém evento sem dados sensíveis intacto", () => {
    const evento = { message: "erro", request: { headers: { accept: "json" } } };
    expect(redactEvent(evento)).toEqual(evento);
  });
});
