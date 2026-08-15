import { Injectable } from "@nestjs/common";
import type { MailTipo } from "./mailer.service.js";

/**
 * T341 — renderização de templates de email transacional.
 *
 * Templates hardcoded (sem lógica arbitrária) e variáveis escapadas no HTML
 * para impedir template/HTML injection. Sujeito/plain-text usam os valores
 * crus (variáveis controladas: enum de plano e datas ISO).
 */
interface Template {
  subject: string;
  html: string;
  text: string;
}

const TEMPLATES: Record<MailTipo, Template> = {
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
    const template = TEMPLATES[tipo];
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
}
