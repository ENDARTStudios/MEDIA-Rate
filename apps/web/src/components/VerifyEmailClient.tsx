"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/lib/navigation";
import { api } from "@/lib/http";

type Status = "loading" | "success" | "error";

/**
 * T376 (D-343) — página /verificar-email: consome o token do link clicável
 * enviado por email. Sucesso → CTA para /login; erro → reenvio por email.
 */
export function VerifyEmailClient() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [status, setStatus] = useState<Status>("loading");
  const [email, setEmail] = useState("");
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }
    let cancelled = false;
    api
      .get<{ ok: boolean }>(`/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`, {
        auth: false,
      })
      .then((r) => {
        if (!cancelled) setStatus(r.ok ? "success" : "error");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setResendState("sending");
    try {
      await api.post("/api/v1/auth/resend-verification", { email, locale }, { auth: false });
      setResendState("sent");
    } catch {
      setResendState("error");
    }
  }

  return (
    /* D-602/A7: o casco (cartao, h1 e explicacao) é renderizado pelo SERVIDOR na
       pagina — aqui fica só o desfecho, para o HTML inicial nunca ficar vazio. */
    <>
      <div className="contents">
        {status === "loading" && (
          <div role="status" aria-live="polite">
            <svg
              className="mx-auto mb-4 h-10 w-10 animate-spin text-accent-indigo"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <p className="text-sm text-fg-secondary">{t("verifyTitle")}</p>
          </div>
        )}

        {status === "success" && (
          <div role="status" aria-live="polite" className="contents">
            <svg
              className="mx-auto mb-4 h-12 w-12 text-accent-emerald"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <h2 className="mb-2 font-heading text-2xl font-bold text-fg-primary">
              {t("verifySuccess")}
            </h2>
            <Link
              href="/login"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand px-8 py-3 text-sm font-semibold text-brand-foreground transition-[filter] hover:brightness-110"
            >
              {t("verifySuccessCta")}
            </Link>
          </div>
        )}

        {status === "error" && (
          <div role="alert" aria-live="polite">
            <svg
              className="mx-auto mb-4 h-12 w-12 text-score-low"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="mb-3 font-heading text-xl font-bold text-fg-primary">
              {t("verifyError")}
            </h2>

            {resendState === "sent" ? (
              <p className="text-sm text-accent-emerald">{t("verifyResendSent")}</p>
            ) : (
              <form onSubmit={handleResend} className="mt-4 space-y-3">
                <p className="text-sm text-fg-secondary">{t("verifyResendHint")}</p>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  required
                  aria-label={t("emailLabel")}
                  className="w-full rounded-lg border border-surface-border bg-surface-bg px-4 py-2.5 text-sm text-fg-primary placeholder-fg-muted outline-none focus:border-accent-indigo"
                />
                <button
                  type="submit"
                  disabled={resendState === "sending"}
                  className="w-full rounded-lg bg-accent-indigo px-6 py-2.5 text-sm font-semibold text-accent-indigo-foreground transition-[filter] hover:brightness-110 disabled:opacity-60"
                >
                  {resendState === "sending" ? "..." : t("verifyResendButton")}
                </button>
                {resendState === "error" && (
                  <p className="text-xs text-score-low">{t("verifyResendError")}</p>
                )}
              </form>
            )}
          </div>
        )}
      </div>
    </>
  );
}
