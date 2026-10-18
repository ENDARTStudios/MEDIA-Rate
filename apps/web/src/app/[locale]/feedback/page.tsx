"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";

/** Canal real de contato (o mesmo e-mail do rodapé). */
const CONTATO = "endart.studios+contato@gmail.com";

/**
 * D-582.3 (T211) — a página era 100% pt-BR, usava EMOJI como nota (D-065),
 * "enviava" apenas trocando um estado local (nada saía do browser) e citava um
 * Discord e um `feedback@mediarate.app` que não existem em nenhum outro ponto do
 * repo. Agora: i18n nos 3 locales, ícone Lucide, e o envio é **honesto** — abre o
 * cliente de e-mail do usuário com nota + comentário já preenchidos (mailto).
 */
export default function FeedbackPage() {
  const t = useTranslations("feedback");
  const [nota, setNota] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");

  const assunto = encodeURIComponent(t("mailSubject"));
  const corpo = encodeURIComponent(
    `${t("mailRating")}: ${nota ?? "-"}/5\n\n${comentario}\n\n${t("mailContext")}`,
  );
  const mailto = `mailto:${CONTATO}?subject=${assunto}&body=${corpo}`;

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="mb-4 font-heading text-3xl font-bold tracking-tight text-fg-primary sm:text-4xl">
        {t("h1")}
      </h1>
      <p className="mb-8 text-fg-secondary">{t("lead")}</p>

      <fieldset className="mb-6">
        <legend className="mb-3 text-sm font-medium text-fg-primary">{t("ratingLabel")}</legend>
        <div className="flex gap-2" role="radiogroup" aria-label={t("ratingLabel")}>
          {[1, 2, 3, 4, 5].map((n) => {
            const ativo = nota !== null && n <= nota;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={nota === n}
                aria-label={t("ratingOption", { nota: n })}
                onClick={() => setNota(n)}
                className="rounded-md p-1.5 transition-colors hover:bg-surface-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-indigo"
              >
                <Star
                  className={`h-7 w-7 ${ativo ? "text-accent-amber" : "text-fg-muted"}`}
                  fill={ativo ? "currentColor" : "none"}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      </fieldset>

      <label
        htmlFor="feedback-comentario"
        className="mb-2 block text-sm font-medium text-fg-primary"
      >
        {t("commentLabel")}
      </label>
      <textarea
        id="feedback-comentario"
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        rows={5}
        placeholder={t("commentPlaceholder")}
        className="mb-6 w-full rounded-lg border border-surface-border bg-surface-bg px-3 py-2.5 text-base text-fg-primary placeholder:text-fg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-indigo sm:text-sm"
      />

      <a
        href={mailto}
        className="inline-flex w-full items-center justify-center rounded-lg bg-brand px-8 py-3.5 text-sm font-semibold text-brand-foreground transition-colors hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-indigo"
      >
        {t("sendButton")}
      </a>
      <p className="mt-4 text-xs text-fg-muted">{t("mailHint")}</p>
    </div>
  );
}
