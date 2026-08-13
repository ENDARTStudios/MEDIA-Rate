"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { getLastCorrelationId } from "@/lib/http";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  const t = useTranslations("common");
  const locale = useLocale();

  useEffect(() => {
    console.error("[ErrorBoundary]", error);
    // T293: reporta ao Sentry com locale + correlationId (liga UI → API).
    Sentry.captureException(error, {
      extra: {
        correlation_id: getLastCorrelationId() ?? undefined,
        digest: error.digest,
      },
      tags: { locale },
    });
  }, [error, locale]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="min-h-[50vh] flex items-center justify-center px-4"
    >
      <div className="max-w-md w-full text-center">
        <svg
          className="mx-auto h-16 w-16 text-red-500/80"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
        <h2 className="mt-6 text-xl font-semibold text-gray-100">{t("error")}</h2>
        {error.digest && <p className="mt-2 text-sm text-gray-500">ID: {error.digest}</p>}
        <div className="mt-6">
          <Button onClick={reset} size="lg">
            {t("retry")}
          </Button>
        </div>
      </div>
    </div>
  );
}
