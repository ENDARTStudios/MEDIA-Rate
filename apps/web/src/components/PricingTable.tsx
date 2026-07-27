"use client";

import { useTranslations } from "next-intl";

const FEATURES = [
  "catalogo", "mediascore", "watchlist", "recommendations", "unlimitedRecs", "scoreExplanations", "collections",
  "tasteProfile", "assistant", "marathon", "insights", "profileCompare",
];

export function PricingTable() {
  const t = useTranslations("pricing");

  const plans = { free: "Free", plus: "Plus", premium: "Premium" };
  const check = (plan: string, feat: string) => {
    if (plan === "free") return ["catalogo", "mediascore", "watchlist", "recommendations"].includes(feat);
    if (plan === "plus") return !["assistant", "marathon", "insights", "profileCompare"].includes(feat);
    return true;
  };

  return (
    <div className="mb-20 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-border/30">
            <th scope="col" className="text-left py-3 pr-4 text-[#9CA3AF] font-medium">{t("features")}</th>
            {Object.entries(plans).map(([k, v]) => (
              <th key={k} scope="col" className={`py-3 px-4 text-center font-medium ${k === "plus" ? "text-[#818CF8]" : "text-[#9CA3AF]"}`}>{v}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FEATURES.map((feat) => (
            <tr key={feat} className="border-b border-surface-border/10">
              <td className="py-3 pr-4 text-[#EDE7DC]">{t(`feature_${feat}`)}</td>
              {Object.keys(plans).map((plan) => (
                <td key={plan} className={`py-3 px-4 text-center ${plan === "plus" ? "text-[#818CF8]" : "text-[#6B7280]"}`}>
                  {check(plan, feat) ? "✓" : "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
