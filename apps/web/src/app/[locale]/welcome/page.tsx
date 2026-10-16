"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import { Link } from "@/lib/navigation";
import { useAuthStore } from "@/stores/use-auth-store";

const STEPS = [
  { key: "step1Title", desc: "step1Desc", icon: "M12 4v16m8-8H4" },
  {
    key: "step2Title",
    desc: "step2Desc",
    icon: "M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z",
  },
  { key: "step3Title", desc: "step3Desc", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14v7m-3-3h6" },
];

/** Delay da entrada em CSS (`--enter-delay`, ver `globals.css` → `.enter-rise`). */
function delay(ms: number): CSSProperties {
  return { "--enter-delay": `${ms}ms` } as CSSProperties;
}

/**
 * T364 (D-336) — boas-vindas pós-cadastro, exibida UMA vez.
 * Flag client-side (localStorage) — trocar por welcome_seen no usuário
 * (PATCH /user/welcome-seen) quando a migration do backend entrar.
 *
 * D-587 (T211): a entrada era feita com `motion` e `initial={shouldReduce ? false
 * : { opacity: 0 }}`. Como o servidor não conhece `prefers-reduced-motion`, o HTML
 * servido divergia do primeiro render do cliente → **hydration mismatch** (e, sem
 * JS, o conteúdo ficava invisível: `initial` é o estado do HTML). Agora a entrada
 * é CSS (`.enter-rise`/`.enter-fade`), determinística entre servidor e cliente,
 * funcional sem JS e desligada para quem pediu movimento reduzido.
 */
export default function WelcomePage() {
  const t = useTranslations("welcome");
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("mr_welcome_seen")) {
      router.replace("/dashboard");
    } else {
      localStorage.setItem("mr_welcome_seen", "1");
    }
  }, [router]);

  const nome = user?.name?.split(" ")[0];

  return (
    <div className="relative min-h-[calc(100dvh-4rem)] px-4 py-16">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(225,29,72,0.08)_0%,transparent_55%)]"
        aria-hidden="true"
      />
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        {/* T211: o eyebrow acima do H1 era o mesmo padrão `hero-eyebrow-chip`
            removido da home em T209 (e o topo do "trio centralizado" proibido por
            D-065). O H1 com o nome do usuário já é o gancho desta tela. */}
        <h1
          className="enter-rise mb-8 font-heading text-4xl font-bold leading-tight text-[#F5F5F7] sm:text-5xl"
          style={delay(80)}
        >
          {nome ? t("titleWithName", { nome }) : t("title")}
        </h1>

        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={step.key}
              className="enter-rise rounded-xl border border-[rgba(129,140,248,0.12)] bg-[#12121C] p-6 text-left"
              style={delay(150 + i * 150)}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#818CF8]/15 text-[#818CF8]">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={step.icon}
                  />
                </svg>
              </div>
              <h2 className="mb-1 font-heading text-base font-semibold text-[#F5F5F7]">
                {t(step.key)}
              </h2>
              <p className="text-sm text-[#A0A0B8]">{t(step.desc)}</p>
            </div>
          ))}
        </div>

        <div className="enter-fade mt-10" style={delay(600)}>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-[#E11D48] px-8 py-3.5 text-sm font-semibold text-white transition-[filter] hover:brightness-110"
          >
            {t("cta")}
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
