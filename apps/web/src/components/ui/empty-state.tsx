"use client";

import * as React from "react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

function SearchIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#9CA3AF"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function EmptyState({
  icon,
  title = "Nada por aqui ainda",
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center text-center py-16 px-4 ${className}`}>
      <div className="text-[#9CA3AF] mb-4">{icon ?? <SearchIcon />}</div>
      <h3 className="text-lg font-heading text-[#EDE7DC] mb-2">{title}</h3>
      {description && <p className="text-sm text-[#9CA3AF] mb-6 max-w-md">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
