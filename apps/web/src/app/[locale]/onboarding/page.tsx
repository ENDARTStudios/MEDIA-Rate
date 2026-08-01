"use client";

import { useTranslations } from "next-intl";

export default function OnboardingPage() {
  const t = useTranslations("onboarding");

  return (
    <div className="max-w-2xl mx-auto py-16 px-4 text-center">
      <h1 className="text-4xl font-heading font-bold text-[#EDE7DC] mb-4">{t("h1")}</h1>
      <p className="text-[#9CA3AF] mb-8">{t("lead")}</p>
      <div className="space-y-4 text-left bg-[#11111E] border border-[rgba(129,140,248,0.08)] rounded-md p-6">
        <p>🔍 <strong>{t("step1")}</strong> — {t("step1d")}</p>
        <p>📊 <strong>{t("step2")}</strong> — {t("step2d")}</p>
        <p>📝 <strong>{t("step3")}</strong> — {t("step3d")}</p>
        <p>⌘K <strong>{t("step4")}</strong> — {t("step4d")}</p>
      </div>
    </div>
  );
}
