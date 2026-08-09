"use client";

/**
 * Origem da produção (Addendum 2 §5) — bandeira + entidade produtora.
 *
 * Rótulo por mídia: "Estúdio" (filme/série), "Desenvolvida por X · Publicada
 * por Y" (game), "Editora" (livro/HQ/mangá). Clicável quando entityId existe
 * → catálogo da mesma mídia filtrado pela produtora (sem cross-media).
 */
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import type { MediaType } from "@/lib/types";

export interface OriginBadgeProps {
  countryCode?: string | null;
  /** Rótulo do papel (ex.: "Estúdio", "Editora", "Desenvolvedora"). */
  roleLabel: string;
  /** Entidade produtora (opcional — sem dado, exibe apenas o país). */
  entityName?: string;
  entityId?: string;
  /** Publisher (games) — "Desenvolvido por X · Publicado por Y". */
  publisherName?: string;
  mediaType: MediaType;
  className?: string;
}

const TYPE_PARAM: Record<MediaType, string> = {
  movie: "movie",
  series: "series",
  game: "game",
  book: "book",
  comic: "comic",
  manga: "manga",
};

const COUNTRY_FLAGS: Record<string, string> = {
  BR: "🇧🇷",
  US: "🇺🇸",
  GB: "🇬🇧",
  JP: "🇯🇵",
  KR: "🇰🇷",
  FR: "🇫🇷",
  DE: "🇩🇪",
  CA: "🇨🇦",
  ES: "🇪🇸",
  IT: "🇮🇹",
  MX: "🇲🇽",
  AR: "🇦🇷",
  PT: "🇵🇹",
  CN: "🇨🇳",
  SE: "🇸🇪",
  PL: "🇵🇱",
};

const COUNTRY_NAMES: Record<string, string> = {
  BR: "Brasil",
  US: "Estados Unidos",
  GB: "Reino Unido",
  JP: "Japão",
  KR: "Coreia do Sul",
  FR: "França",
  DE: "Alemanha",
  CA: "Canadá",
  ES: "Espanha",
  IT: "Itália",
  MX: "México",
  AR: "Argentina",
  PT: "Portugal",
  CN: "China",
  SE: "Suécia",
  PL: "Polônia",
};

export function OriginBadge({
  countryCode,
  roleLabel,
  entityName,
  entityId,
  publisherName,
  mediaType,
  className,
}: OriginBadgeProps) {
  const t = useTranslations("metadados");
  const flag = countryCode ? (COUNTRY_FLAGS[countryCode.toUpperCase()] ?? "🏳️") : null;
  const countryName = countryCode
    ? (COUNTRY_NAMES[countryCode.toUpperCase()] ?? countryCode)
    : null;

  const conteudo = (
    <>
      {flag && <span aria-hidden="true">{flag}</span>}
      {entityName ? (
        <span className="text-[#A0A0B8]">
          {roleLabel}: <span className="font-medium text-[#F5F5F7]">{entityName}</span>
          {publisherName && (
            <span className="text-[#A0A0B8]">
              {" "}
              · {t("publishedBy")}: {publisherName}
            </span>
          )}
        </span>
      ) : (
        <span className="text-[#A0A0B8]">
          {roleLabel}: <span className="font-medium text-[#F5F5F7]">{countryName ?? "—"}</span>
        </span>
      )}
    </>
  );

  if (entityId) {
    return (
      <Link
        href={`/catalog?type=${TYPE_PARAM[mediaType]}&produtora=${entityId}`}
        className={className}
        aria-label={t("moreFrom", { entity: entityName ?? countryName ?? "—" })}
      >
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2A2A3D] bg-[#12121C] px-3 py-1 text-xs transition-colors hover:border-[#3A3A52]">
          {conteudo}
        </span>
      </Link>
    );
  }

  return (
    <span className={className} data-testid="origin-badge">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2A2A3D] bg-[#12121C] px-3 py-1 text-xs">
        {conteudo}
      </span>
    </span>
  );
}
