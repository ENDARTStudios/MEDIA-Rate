"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
};

function WarningIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#F97316"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function ErrorState({
  title,
  description,
  onRetry,
  className = "",
}: ErrorStateProps) {
  const t = useTranslations("error");
  const resolvedTitle = title ?? t("title");
  const resolvedDescription = description ?? t("description");

  return (
    <div className={`flex flex-col items-center text-center py-16 px-4 ${className}`}>
      <div className="text-[#F97316] mb-4">
        <WarningIcon />
      </div>
      <h3 className="text-lg font-heading text-[#EDE7DC] mb-2">
        {resolvedTitle}
      </h3>
      <p className="text-sm text-[#9CA3AF] mb-6 max-w-md">
        {resolvedDescription}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-[#818CF8] text-[#0F172A] px-6 py-2 rounded-lg font-medium text-sm hover:brightness-110 transition-all focus:ring-2 focus:ring-[#818CF8] focus:outline-none"
        >
          {t("retry")}
        </button>
      )}
    </div>
  );
}
