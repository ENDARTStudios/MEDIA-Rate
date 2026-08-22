"use client";

/**
 * MediaUnlockGrid (Parte 3.7, T193) — comparação por mídia desbloqueada:
 * grade de ícones de categoria (Parte 2.3) mostrando o que cada plano
 * libera. T408: os 6 tipos estão vivos no catálogo para TODOS os planos
 * (livros/HQs/mangás foram destravados na F13/T383b) — sem "Soon".
 */
import { useTranslations } from "next-intl";
import { CATEGORY_TOKENS } from "@/lib/design-tokens";
import type { MediaType } from "@/lib/types";

const MEDIAS: MediaType[] = ["movie", "series", "game", "book", "comic", "manga"];

export function MediaUnlockGrid() {
  const t = useTranslations("pricing");
  const planos: ("free" | "plus" | "premium")[] = ["free", "plus", "premium"];

  return (
    <div className="overflow-x-auto" data-testid="media-unlock-grid">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="text-left text-xs font-semibold uppercase tracking-wider text-[#A0A0B8] py-3 pr-4">
              {t("media")}
            </th>
            {planos.map((p) => (
              <th key={p} className="py-3 px-3 text-center text-xs font-semibold text-[#F5F5F7]">
                {t(p)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MEDIAS.map((media) => {
            const token = CATEGORY_TOKENS[media];
            const Icon = token.icon;
            return (
              <tr key={media} className="border-t border-[#2A2A3D]">
                <td className="py-3 pr-4">
                  <span className="flex items-center gap-2 text-[#EDE7DC]">
                    <Icon className="h-4 w-4" style={{ color: token.color }} aria-hidden="true" />
                    {t(`media_${media}`)}
                  </span>
                </td>
                {planos.map((plano) => (
                  <td key={plano} className="py-3 px-3 text-center">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: token.color }}
                      aria-label={t("unlocked")}
                      title={t("unlocked")}
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
