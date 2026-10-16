"use client";

import * as React from "react";

type InputProps = {
  label?: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-[#A0A0B8] mb-1">{label}</label>}
      <input
        className="w-full bg-[#12121C] border border-[#1C1C2E] rounded-md text-[#F5F5F7] placeholder:text-[#A0A0B8] px-3 py-2 focus:border-[#818CF8] focus:ring-2 focus:ring-[#818CF8] focus:ring-offset-0 focus:outline-none transition-colors"
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
