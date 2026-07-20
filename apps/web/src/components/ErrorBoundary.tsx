"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
  children?: React.ReactNode;
}

/**
 * Error boundary de página (T5.6) — App Router error.tsx.
 *
 * - Acessível: role="alert", aria-live="assertive".
 * - Mensagem genérica em produção (não vaza stack).
 * - Botão "Tentar novamente" aciona reset().
 */
export function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  const t = useTranslations("common");

  useEffect(() => {
    // Loga erro para analytics (PostHog via backend T1.9).
    console.error("[ErrorBoundary]", error);
  }, [error]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="min-h-[50vh] flex items-center justify-center px-4"
    >
      <div className="max-w-md w-full text-center">
        <svg
          className="mx-auto h-12 w-12 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
          {t("error")}
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {error.digest ? `ID: ${error.digest}` : null}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 px-4 py-2 bg-primary-700 text-white rounded-md hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-700"
        >
          {t("retry")}
        </button>
      </div>
    </div>
  );
}
