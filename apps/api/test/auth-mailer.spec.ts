import { describe, it, expect, vi } from "vitest";
import { MockMailService } from "../src/common/mock-mail.service.js";
import { MailTemplateService } from "../src/modules/mailer/mail-template.service.js";
import type { MailerService } from "../src/modules/mailer/mailer.service.js";

describe("MockMailService → MailerService (T342)", () => {
  function buildMockMailer() {
    return { enviar: vi.fn(async () => ({ enviado: true })) } as unknown as MailerService;
  }

  it("enviarResetSenha delega para mailer (reset_senha, dedupe off)", async () => {
    const mailer = buildMockMailer();
    const svc = new MockMailService(mailer);
    await svc.enviarResetSenha("u@e.com", "tok123");
    expect(mailer.enviar).toHaveBeenCalledWith(
      "reset_senha",
      "u@e.com",
      { token: "tok123" },
      { dedupeTtlMs: 0 },
    );
  });

  it("enviarVerificacaoEmail delega para mailer (verificacao_email, dedupe off)", async () => {
    const mailer = buildMockMailer();
    const svc = new MockMailService(mailer);
    await svc.enviarVerificacaoEmail("u@e.com", "tok456", {
      link: "https://mediarate.app/pt-BR/verificar-email?token=tok456",
      lang: "pt",
    });
    expect(mailer.enviar).toHaveBeenCalledWith(
      "verificacao_email",
      "u@e.com",
      {
        token: "tok456",
        link: "https://mediarate.app/pt-BR/verificar-email?token=tok456",
        lang: "pt",
      },
      { dedupeTtlMs: 0 },
    );
  });
});

describe("MailTemplateService — templates de auth (T342)", () => {
  it("reset_senha escapa token no HTML (anti template injection)", () => {
    const svc = new MailTemplateService();
    const r = svc.render("reset_senha", { token: "<script>x</script>" });
    expect(r.html).not.toContain("<script>");
    expect(r.html).toContain("&lt;script&gt;");
    expect(r.text).toContain("<script>x</script>"); // texto puro (não é HTML)
  });

  it("verificacao_email renderiza token", () => {
    const svc = new MailTemplateService();
    const r = svc.render("verificacao_email", { token: "abc123" });
    expect(r.text).toContain("abc123");
    expect(r.html).toContain("abc123");
  });

  it("verificacao_email renderiza LINK clicável com token (T376)", () => {
    const svc = new MailTemplateService();
    const r = svc.render("verificacao_email", {
      token: "tok123",
      link: "https://mediarate.app/pt-BR/verificar-email?token=tok123",
      lang: "pt",
    });
    expect(r.html).toContain('href="https://mediarate.app/pt-BR/verificar-email?token=tok123"');
    expect(r.html).toContain("Verificar meu email");
    expect(r.text).toContain("https://mediarate.app/pt-BR/verificar-email?token=tok123");
    expect(r.text).toContain("tok123"); // código como fallback
  });

  it("verificacao_email respeita locale (en)", () => {
    const svc = new MailTemplateService();
    const r = svc.render("verificacao_email", {
      token: "t",
      link: "https://x/en/verificar-email?token=t",
      lang: "en",
    });
    expect(r.subject).toContain("Verify your email");
    expect(r.html).toContain("Verify my email");
  });
});
