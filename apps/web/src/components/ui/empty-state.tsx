"use client";

import * as React from "react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  /**
   * D-620: **obrigatório**. Antes havia um default em português ("Nada por aqui ainda"), e
   * qualquer tela que omitisse a prop mostrava português para quem usa EN/ES — como é um
   * primitivo compartilhado, o vazamento se espalhava sem ninguém notar. Com o tipo exigindo
   * o texto, quem omite não compila; o gate `i18n:source` cobre o resto.
   */
  title: string;
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
      stroke="#A0A0B8"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function EmptyState({ icon, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center text-center py-16 px-4 ${className}`}>
      <div className="text-fg-secondary mb-4">{icon ?? <SearchIcon />}</div>
      <h3 className="text-lg font-heading text-fg-primary mb-2">{title}</h3>
      {description && <p className="text-sm text-fg-secondary mb-6 max-w-md">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
