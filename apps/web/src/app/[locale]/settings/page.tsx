"use client";

import { useTranslations } from "next-intl";
import { useAuthStore } from "@/stores/use-auth-store";
import { useRouter, usePathname } from "next/navigation";
import { Link } from "@/lib/navigation";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Button } from "@/components/ui/button";
import { ScoreDial } from "@/components/ui/score-dial";
import { Lock } from "lucide-react";
import { LgpdControls } from "@/components/settings/LgpdControls";

const NEXT_TIER: Record<string, { plan: "PLUS" | "PREMIUM"; score: number } | null> = {
  FREE: { plan: "PLUS", score: 7.9 },
  PLUS: { plan: "PREMIUM", score: 9.4 },
  PREMIUM: null,
};

export default function SettingsPage() {
  const ts = useTranslations("settings");
  const tp = useTranslations("pricing");
  const tn = useTranslations("nav");
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const currentLocale = pathname.split("/")[1] ?? "pt-BR";
  const locales = ["pt-BR", "en-US", "es-ES"];

  const nextTier = user?.plan ? (NEXT_TIER[user.plan] ?? null) : null;

  return (
    <ProtectedPage>
      <div className="max-w-3xl mx-auto py-16 px-4">
        <h1 className="text-3xl font-heading font-bold text-[#F5F5F7] mb-8">{ts("title")}</h1>

        <div className="space-y-6">
          <div className="bg-[#12121C] rounded-lg p-6 border border-[#2A2A3D]">
            <h2 className="text-lg font-heading font-semibold text-[#F5F5F7] mb-4">Plano</h2>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#A0A0B8]">Plano atual</span>
              <span className="rounded-full bg-[#1B1B2C] px-3 py-1 text-sm font-semibold text-[#F5F5F7] border border-[#2A2A3D]">
                {user?.plan ?? "FREE"}
              </span>
            </div>

            {nextTier && (
              <div className="mt-5 flex items-center gap-5 rounded-lg border border-dashed border-[#2A2A3D] bg-[#1B1B2C]/40 p-5">
                {/* ScoreDial "bloqueado" do próximo plano (Parte 3.6) */}
                <div className="relative shrink-0">
                  <div className="blur-[4px]" aria-hidden="true">
                    <ScoreDial score={nextTier.score} size="sm" />
                  </div>
                  <span
                    className="absolute inset-0 flex items-center justify-center"
                    aria-label="Recursos bloqueados"
                  >
                    <Lock className="h-5 w-5 text-[#A0A0B8]" />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#F5F5F7]">
                    {tp(nextTier.plan.toLowerCase())}
                  </p>
                  <p className="mt-1 text-xs text-[#A0A0B8]">
                    Desbloqueie recomendações ilimitadas, watchlist completa e mais com o{" "}
                    {tp(nextTier.plan.toLowerCase())}.
                  </p>
                  <Link
                    href="/pricing"
                    className="mt-3 inline-block rounded-md bg-[#818CF8] px-4 py-2 text-xs font-semibold text-[#0F172A] hover:brightness-110 transition-all"
                  >
                    {tp("upgrade")}
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="bg-[#12121C] rounded-lg p-6 border border-[#2A2A3D]">
            <h2 className="text-lg font-heading font-semibold text-[#F5F5F7] mb-4">
              {ts("account")}
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[#A0A0B8]">{ts("name")}</span>
                <span className="text-[#F5F5F7]">{user?.name ?? "—"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A0A0B8]">{ts("email")}</span>
                <span className="text-[#F5F5F7]">{user?.email ?? "—"}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#12121C] rounded-lg p-6 border border-[#2A2A3D]">
            <h2 className="text-lg font-heading font-semibold text-[#F5F5F7] mb-4">
              {ts("language")}
            </h2>
            <p className="text-sm text-[#A0A0B8] mb-3">{ts("languageHint")}</p>
            <div className="flex gap-2">
              {locales.map((loc) => (
                <Button
                  key={loc}
                  variant={currentLocale === loc ? "default" : "outline"}
                  size="sm"
                  onClick={() => router.push(`/${loc}/settings`)}
                >
                  {loc}
                </Button>
              ))}
            </div>
          </div>

          <div className="bg-[#12121C] rounded-lg p-6 border border-[#2A2A3D]">
            <h2 className="text-lg font-heading font-semibold text-[#F5F5F7] mb-4">
              {ts("lgpd")}
            </h2>
            <p className="text-sm text-[#A0A0B8] mb-4">{ts("lgpdHint")}</p>
            <LgpdControls />
          </div>

          <div className="bg-[#12121C] rounded-lg p-6 border border-[#2A2A3D]">
            <h2 className="text-lg font-heading font-semibold text-[#F5F5F7] mb-4">
              {ts("session")}
            </h2>
            <Button
              variant="destructive"
              onClick={() => {
                logout();
                router.push("/");
              }}
            >
              {tn("logout") ?? ts("session")}
            </Button>
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
