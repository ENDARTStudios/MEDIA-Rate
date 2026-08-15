import { describe, it, expect, vi, afterEach } from "vitest";
import { ResendMailTransport } from "../src/modules/mailer/resend-mail.transport.js";
import { criarTransport, MockMailTransport } from "../src/modules/mailer/mailer.module.js";

const MSG = {
  to: "u@e.com",
  subject: "assunto",
  html: "<p>oi</p>",
  text: "oi",
};

describe("ResendMailTransport (T348)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("envia via Resend com Authorization Bearer e corpo correto", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const transport = new ResendMailTransport("re_123", "no-reply@mediarate.app");
    await transport.send(MSG);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, opts] = fetchMock.mock.calls[0] as [
      string,
      { headers: Record<string, string>; body: string },
    ];
    expect(url).toBe("https://api.resend.com/emails");
    expect(opts.headers.Authorization).toBe("Bearer re_123");
    expect(opts.headers["Content-Type"]).toBe("application/json");
    const body = JSON.parse(opts.body) as { from: string; to: string[]; subject: string };
    expect(body.from).toBe("no-reply@mediarate.app");
    expect(body.to).toEqual(["u@e.com"]);
    expect(body.subject).toBe("assunto");
  });

  it("lança quando Resend devolve não-OK (sem logar o corpo)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500 })),
    );
    const transport = new ResendMailTransport("re_123", "no-reply@mediarate.app");
    await expect(transport.send(MSG)).rejects.toThrow(/HTTP 500/);
  });
});

describe("criarTransport — seleção do provider (T348)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("default (sem MAIL_PROVIDER) → MockMailTransport", () => {
    vi.stubEnv("MAIL_PROVIDER", "");
    vi.stubEnv("RESEND_API_KEY", "");
    expect(criarTransport()).toBeInstanceOf(MockMailTransport);
  });

  it("resend + RESEND_API_KEY → ResendMailTransport", () => {
    vi.stubEnv("MAIL_PROVIDER", "resend");
    vi.stubEnv("RESEND_API_KEY", "re_123");
    expect(criarTransport()).toBeInstanceOf(ResendMailTransport);
  });

  it("resend sem RESEND_API_KEY → MockMailTransport (fallback seguro)", () => {
    vi.stubEnv("MAIL_PROVIDER", "resend");
    vi.stubEnv("RESEND_API_KEY", "");
    expect(criarTransport()).toBeInstanceOf(MockMailTransport);
  });
});
