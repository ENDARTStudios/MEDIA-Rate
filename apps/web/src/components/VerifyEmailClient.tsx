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
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md items-center justify-center px-4 py-16">
      <div className="w-full rounded-xl border border-[#2A2A3D] bg-[#11111E] p-8 text-center">
        {status === "loading" && (
          <div role="status" aria-live="polite">
            <svg
              className="mx-auto mb-4 h-10 w-10 animate-spin text-[#818CF8]"
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
            <p className="text-sm text-[#A0A0B8]">{t("verifyTitle")}</p>
          </div>
        )}

        {status === "success" && (
          <div role="status" aria-live="polite">
            <svg
              className="mx-auto mb-4 h-12 w-12 text-[#34D399]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <h1 className="mb-2 font-heading text-2xl font-bold text-[#F5F5F7]">
              {t("verifySuccess")}
            </h1>
            <Link
              href="/login"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#E11D48] px-8 py-3 text-sm font-semibold text-white transition-all hover:brightness-110"
            >
              {t("verifySuccessCta")}
            </Link>
          </div>
        )}

        {status === "error" && (
          <div role="alert" aria-live="polite">
            <svg
              className="mx-auto mb-4 h-12 w-12 text-[#F87171]"
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
            <h1 className="mb-3 font-heading text-xl font-bold text-[#F5F5F7]">
              {t("verifyError")}
            </h1>

            {resendState === "sent" ? (
              <p className="text-sm text-[#34D399]">{t("verifyResendSent")}</p>
            ) : (
              <form onSubmit={handleResend} className="mt-4 space-y-3">
                <p className="text-sm text-[#A0A0B8]">{t("verifyResendHint")}</p>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  required
                  aria-label={t("emailLabel")}
                  className="w-full rounded-lg border border-[#2A2A3D] bg-[#0D0D1A] px-4 py-2.5 text-sm text-[#F5F5F7] placeholder-[#6B6B85] outline-none focus:border-[#818CF8]"
                />
                <button
                  type="submit"
                  disabled={resendState === "sending"}
                  className="w-full rounded-lg bg-[#818CF8] px-6 py-2.5 text-sm font-semibold text-[#0F172A] transition-all hover:brightness-110 disabled:opacity-60"
                >
                  {resendState === "sending" ? "..." : t("verifyResendButton")}
                </button>
                {resendState === "error" && (
                  <p className="text-xs text-[#F87171]">{t("verifyResendError")}</p>
                )}
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
