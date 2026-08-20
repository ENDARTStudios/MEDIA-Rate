import { Injectable } from "@nestjs/common";
import type { MailTipo } from "./mailer.service.js";

/**
 * T341 — renderização de templates de email transacional.
 *
 * Templates hardcoded (sem lógica arbitrária) e variáveis escapadas no HTML
 * para impedir template/HTML injection. Sujeito/plain-text usam os valores
 * crus (variáveis controladas: enum de plano e datas ISO).
 *
 * T376 (D-343) — o email de verificação ganhou LINK clicável proeminente
 * (código só como fallback), expiração e aviso de "não fui eu", com cópia
 * i18n (pt/en/es). O token só aparece dentro do link/código — nunca em log.
 */
interface Template {
  subject: string;
  html: string;
  text: string;
}

const TEMPLATES: Record<Exclude<MailTipo, "verificacao_email">, Template> = {
  trial_will_end: {
    subject: "Seu trial do {plano} termina em breve",
    html: "<p>Seu trial do <strong>{plano}</strong> termina em breve. Depois disso, a cobrança inicia automaticamente.</p>",
    text: "Seu trial do {plano} termina em breve. Depois disso, a cobrança inicia automaticamente.",
  },
  subscription_cancelled: {
    subject: "Sua assinatura foi cancelada",
    html: "<p>Sua assinatura foi cancelada e seu acesso ao plano foi encerrado.</p>",
    text: "Sua assinatura foi cancelada e seu acesso ao plano foi encerrado.",
  },
  reset_senha: {
    subject: "Redefina sua senha — MEDIA Rate",
    html: "<p>Seu código de redefinição de senha: <strong>{token}</strong></p>",
    text: "Seu código de redefinição de senha: {token}",
  },
};

type Lang = "pt" | "en" | "es";

interface VerificacaoCopy {
  subject: string;
  title: string;
  body: string;
  button: string;
  codeLabel: string;
  expire: string;
  ignore: string;
}

const VERIFICACAO: Record<Lang, VerificacaoCopy> = {
  pt: {
    subject: "Verifique seu email — MEDIA Rate",
    title: "Confirme seu email",
    body: "Clique no botão abaixo para ativar sua conta MEDIA Rate.",
    button: "Verificar meu email",
    codeLabel: "ou use o código",
    expire: "O link expira em 1 hora.",
    ignore: "Se você não solicitou esta verificação, ignore este email.",
  },
  en: {
    subject: "Verify your email — MEDIA Rate",
    title: "Confirm your email",
    body: "Click the button below to activate your MEDIA Rate account.",
    button: "Verify my email",
    codeLabel: "or use the code",
    expire: "The link expires in 1 hour.",
    ignore: "If you did not request this verification, you can ignore this email.",
  },
  es: {
    subject: "Verifica tu email — MEDIA Rate",
    title: "Confirma tu email",
    body: "Haz clic en el botón de abajo para activar tu cuenta de MEDIA Rate.",
    button: "Verificar mi email",
    codeLabel: "o usa el código",
    expire: "El enlace expira en 1 hora.",
    ignore: "Si no solicitaste esta verificación, ignora este email.",
  },
};

/** Escapa caracteres HTML — impede injeção de markup via variável. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

@Injectable()
export class MailTemplateService {
  render(
    tipo: MailTipo,
    vars: Record<string, string>,
  ): { subject: string; html: string; text: string } {
    if (tipo === "verificacao_email") {
      return this.renderVerificacao(vars);
    }
    const template = TEMPLATES[tipo as Exclude<MailTipo, "verificacao_email">];
    if (!template) {
      throw new Error(`Template de email desconhecido: ${tipo}`);
    }
    const substituir = (s: string, escapar: boolean) =>
      s.replace(/\{(\w+)\}/g, (_m, chave: string) => {
        const valor = vars[chave] ?? "";
        return escapar ? escapeHtml(valor) : valor;
      });
    return {
      subject: substituir(template.subject, false),
      html: substituir(template.html, true),
      text: substituir(template.text, false),
    };
  }

  /** T376: email de verificação com link clicável (código só como fallback). */
  private renderVerificacao(vars: Record<string, string>): Template {
    const lang: Lang = vars.lang === "en" || vars.lang === "es" ? vars.lang : "pt";
    const copy = VERIFICACAO[lang];
    const link = vars.link ?? "";
    const token = vars.token ?? "";

    const html = [
      `<p style="font-size:16px;color:#111827">${escapeHtml(copy.title)}</p>`,
      `<p style="font-size:14px;color:#374151">${escapeHtml(copy.body)}</p>`,
      `<p style="margin:24px 0"><a href="${escapeHtml(link)}" style="display:inline-block;background-color:#E11D48;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">${escapeHtml(copy.button)}</a></p>`,
      `<p style="font-size:13px;color:#6B7280">${escapeHtml(copy.codeLabel)}: <strong>${escapeHtml(token)}</strong></p>`,
      `<p style="font-size:12px;color:#9CA3AF">${escapeHtml(copy.expire)}</p>`,
      `<p style="font-size:12px;color:#9CA3AF">${escapeHtml(copy.ignore)}</p>`,
    ].join("");

    const text = [
      copy.title,
      "",
      copy.body,
      "",
      `${copy.button}: ${link}`,
      "",
      `${copy.codeLabel}: ${token}`,
      "",
      copy.expire,
      copy.ignore,
    ].join("\n");

    return { subject: copy.subject, html, text };
  }
}
