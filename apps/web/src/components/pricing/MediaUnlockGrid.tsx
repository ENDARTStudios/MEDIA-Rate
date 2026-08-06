"use client";

/**
 * MediaUnlockGrid (Parte 3.7, T193) — comparação por mídia desbloqueada:
 * grade de ícones de categoria (Parte 2.3) mostrando o que cada plano
 * libera. Bloqueado = cadeado + blur (ScoreDial-style). Sem dados
 * fabricados: categorias em roadmap mostram "em breve".
 */
import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_TOKENS } from "@/lib/design-tokens";
import type { MediaType } from "@/lib/types";

const MEDIAS: MediaType[] = ["movie", "series", "game", "book", "comic", "anime"];

/** O que cada plano libera (Free: filme+série; Plus: +game; Premium: tudo). */
const PLANO_LIBERA: Record<"free" | "plus" | "premium", Set<MediaType>> = {
  free: new Set(["movie", "series"]),
  plus: new Set(["movie", "series", "game"]),
  premium: new Set(MEDIAS),
};

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
                {planos.map((plano) => {
                  const libera = PLANO_LIBERA[plano].has(media);
                  const emBreve = media === "book" || media === "comic" || media === "anime";
                  return (
                    <td key={plano} className="py-3 px-3 text-center">
                      {libera ? (
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: token.color }}
                          aria-label={t("unlocked")}
                          title={t("unlocked")}
                        />
                      ) : emBreve ? (
                        <span className="text-[10px] text-[#80809B]">{t("comingSoonShort")}</span>
                      ) : (
                        <span
                          className="inline-flex items-center justify-center"
                          title={t("locked")}
                          aria-label={t("locked")}
                        >
                          <Lock className="h-3.5 w-3.5 text-[#6B6B85]" />
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
