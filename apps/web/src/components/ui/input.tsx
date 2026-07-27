"use client";

import * as React from "react";

type InputProps = {
  label?: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-[#9CA3AF] mb-1">
          {label}
        </label>
      )}
      <input
        className="w-full bg-[#11111E] border border-[#1C1C2E] rounded-md text-[#EDE7DC] placeholder:text-[#6B7280] px-3 py-2 focus:border-[#818CF8] focus:ring-2 focus:ring-[#818CF8] focus:ring-offset-0 focus:outline-none transition-colors"
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
