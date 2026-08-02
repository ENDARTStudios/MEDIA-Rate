"use client";

interface ErrorStateProps {
  title?: string;
  description?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ title, description, message, onRetry }: ErrorStateProps) {
  const displayMessage = message || description || "Algo deu errado.";

  return (
    <div className="flex flex-col items-center text-center py-12 px-4" data-testid="error-state">
      <div className="w-12 h-12 rounded-full bg-[#EF4444]/10 flex items-center justify-center mb-4">
        <svg
          className="w-6 h-6 text-[#EF4444]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      {title && <h3 className="text-lg font-heading text-[#EDE7DC] mb-2">{title}</h3>}
      <p className="text-sm text-[#9CA3AF] mb-6 max-w-md">{displayMessage}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-2 rounded-lg text-sm font-medium transition-colors bg-[#818CF8] text-[#0F172A] hover:brightness-110"
          data-testid="error-state-retry"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
