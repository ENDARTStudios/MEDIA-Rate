"use client";

import * as React from "react";

type InputProps = {
  label?: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-fg-secondary mb-1">{label}</label>}
      <input
        className="w-full bg-surface-card border border-surface-elevated rounded-md text-fg-primary placeholder:text-fg-secondary px-3 py-2 focus:border-accent-indigo focus:ring-2 focus:ring-accent-indigo focus:ring-offset-0 focus:outline-none transition-colors"
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
