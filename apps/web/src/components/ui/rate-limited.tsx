"use client";

import { useState, useEffect } from "react";

interface RateLimitedProps {
  retryAfterSeconds: number;
  onRetry: () => void;
}

export function RateLimited({ retryAfterSeconds, onRetry }: RateLimitedProps) {
  const [remaining, setRemaining] = useState(retryAfterSeconds);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) { clearInterval(id); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [remaining]);

  const canRetry = remaining <= 0;

  return (
    <div className="flex flex-col items-center text-center py-12 px-4" data-testid="rate-limited">
      <div className="w-12 h-12 rounded-full bg-[#F59E0B]/10 flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-[#F59E0B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-heading text-[#EDE7DC] mb-2">Muitas requisições</h3>
      <p className="text-sm text-[#9CA3AF] mb-6 max-w-md">
        {canRetry
          ? "Você já pode tentar novamente."
          : `Tente novamente em ${remaining}s`}
      </p>
      <button
        onClick={onRetry}
        disabled={!canRetry}
        className="px-6 py-2 rounded-lg text-sm font-medium transition-colors bg-[#818CF8] text-[#0F172A] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
        data-testid="rate-limited-retry"
      >
        Tentar novamente
      </button>
    </div>
  );
}
