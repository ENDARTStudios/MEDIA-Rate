import { describe, it, expect } from "vitest";
import { sentryRedact } from "../src/lib/sentry-redact";

describe("sentryRedact (T293, web)", () => {
  it("redige header Authorization e cookie", () => {
    const out = sentryRedact({
      request: {
        headers: {
          authorization: "Bearer segredo",
          cookie: "sess=abc",
          accept: "json",
        },
      },
    }) as { request: { headers: Record<string, string> } };
    expect(out.request.headers.authorization).toBe("[REDACTED]");
    expect(out.request.headers.cookie).toBe("[REDACTED]");
    expect(out.request.headers.accept).toBe("json");
  });

  it("redige password/token em request.data JSON e limita user a id", () => {
    const out = sentryRedact({
      request: { headers: {}, data: '{"password":"x","email":"a@b.com"}' },
      user: { id: "u1", email: "a@b.com" },
    }) as {
      request: { data: string };
      user: Record<string, unknown>;
    };
    const parsed = JSON.parse(out.request.data) as Record<string, string>;
    expect(parsed.password).toBe("[REDACTED]");
    expect(parsed.email).toBe("a@b.com");
    expect(out.user).toEqual({ id: "u1" });
  });
});
