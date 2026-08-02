"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function PricingFAQ() {
  const t = useTranslations("pricingFaq");

  const FAQ_KEYS = ["faq1", "faq2", "faq3", "faq4", "faq5", "faq6"];

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-display font-bold text-gray-100 mb-8 text-center">
        {t("title")}
      </h2>
      <div className="space-y-3">
        {FAQ_KEYS.map((key) => (
          <FAQItem key={key} question={t(key + "Q")} answer={t(key + "A")} />
        ))}
      </div>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-surface-border/30 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium text-gray-200 hover:bg-surface-elevated/50 transition-colors"
      >
        {question}
        <svg
          className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-5 pb-4 text-sm text-gray-400 leading-relaxed">{answer}</div>}
    </div>
  );
}
