"use client";

/**
 * Origem da produção (Addendum 2 §5) — bandeira SVG + entidade produtora.
 *
 * UAT-48: a bandeira é SVG vetorial (`country-flag-icons`, MIT), não emoji —
 * emoji de bandeira não renderiza no Windows e a marca não pode depender da
 * fonte do sistema. Imports por país (tree-shakeados); país fora do mapa
 * mostra o código ISO honesto em vez de bandeira errada.
 *
 * Rótulo por mídia: "Estúdio" (filme/série), "Desenvolvida por X · Publicada
 * por Y" (game), "Editora" (livro/HQ/mangá). Clicável quando entityId existe
 * → catálogo da mesma mídia filtrado pela produtora (sem cross-media).
 */
import type { ComponentType } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import type { MediaType } from "@/lib/types";

import BR from "country-flag-icons/react/3x2/BR";
import US from "country-flag-icons/react/3x2/US";
import GB from "country-flag-icons/react/3x2/GB";
import JP from "country-flag-icons/react/3x2/JP";
import KR from "country-flag-icons/react/3x2/KR";
import FR from "country-flag-icons/react/3x2/FR";
import DE from "country-flag-icons/react/3x2/DE";
import CA from "country-flag-icons/react/3x2/CA";
import ES from "country-flag-icons/react/3x2/ES";
import IT from "country-flag-icons/react/3x2/IT";
import MX from "country-flag-icons/react/3x2/MX";
import AR from "country-flag-icons/react/3x2/AR";
import PT from "country-flag-icons/react/3x2/PT";
import CN from "country-flag-icons/react/3x2/CN";
import SE from "country-flag-icons/react/3x2/SE";
import PL from "country-flag-icons/react/3x2/PL";
import AU from "country-flag-icons/react/3x2/AU";
import NL from "country-flag-icons/react/3x2/NL";
import BE from "country-flag-icons/react/3x2/BE";
import CH from "country-flag-icons/react/3x2/CH";
import AT from "country-flag-icons/react/3x2/AT";
import RU from "country-flag-icons/react/3x2/RU";
import IN from "country-flag-icons/react/3x2/IN";
import ID from "country-flag-icons/react/3x2/ID";
import TH from "country-flag-icons/react/3x2/TH";
import TW from "country-flag-icons/react/3x2/TW";
import HK from "country-flag-icons/react/3x2/HK";
import DK from "country-flag-icons/react/3x2/DK";
import NO from "country-flag-icons/react/3x2/NO";
import FI from "country-flag-icons/react/3x2/FI";
import IE from "country-flag-icons/react/3x2/IE";
import CZ from "country-flag-icons/react/3x2/CZ";
import GR from "country-flag-icons/react/3x2/GR";
import TR from "country-flag-icons/react/3x2/TR";
import IL from "country-flag-icons/react/3x2/IL";
import EG from "country-flag-icons/react/3x2/EG";
import NG from "country-flag-icons/react/3x2/NG";
import ZA from "country-flag-icons/react/3x2/ZA";
import CO from "country-flag-icons/react/3x2/CO";
import CL from "country-flag-icons/react/3x2/CL";
import PE from "country-flag-icons/react/3x2/PE";
import UY from "country-flag-icons/react/3x2/UY";
import NZ from "country-flag-icons/react/3x2/NZ";
import IS from "country-flag-icons/react/3x2/IS";
import HU from "country-flag-icons/react/3x2/HU";
import RO from "country-flag-icons/react/3x2/RO";
import UA from "country-flag-icons/react/3x2/UA";
import VN from "country-flag-icons/react/3x2/VN";
import MY from "country-flag-icons/react/3x2/MY";
import SG from "country-flag-icons/react/3x2/SG";
import PH from "country-flag-icons/react/3x2/PH";
import SA from "country-flag-icons/react/3x2/SA";
import AE from "country-flag-icons/react/3x2/AE";
import QA from "country-flag-icons/react/3x2/QA";
import IR from "country-flag-icons/react/3x2/IR";
import HR from "country-flag-icons/react/3x2/HR";
import RS from "country-flag-icons/react/3x2/RS";
import BG from "country-flag-icons/react/3x2/BG";
import SK from "country-flag-icons/react/3x2/SK";
import SI from "country-flag-icons/react/3x2/SI";
import LT from "country-flag-icons/react/3x2/LT";
import LV from "country-flag-icons/react/3x2/LV";
import EE from "country-flag-icons/react/3x2/EE";
import JM from "country-flag-icons/react/3x2/JM";
import CU from "country-flag-icons/react/3x2/CU";
import BO from "country-flag-icons/react/3x2/BO";
import EC from "country-flag-icons/react/3x2/EC";
import PY from "country-flag-icons/react/3x2/PY";
import VE from "country-flag-icons/react/3x2/VE";

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

/** Bandeiras SVG por ISO 3166-1 alfa-2 (o que o catálogo de mídia usa). */
const COUNTRY_FLAGS: Record<string, ComponentType> = {
  BR,
  US,
  GB,
  JP,
  KR,
  FR,
  DE,
  CA,
  ES,
  IT,
  MX,
  AR,
  PT,
  CN,
  SE,
  PL,
  AU,
  NL,
  BE,
  CH,
  AT,
  RU,
  IN,
  ID,
  TH,
  TW,
  HK,
  DK,
  NO,
  FI,
  IE,
  CZ,
  GR,
  TR,
  IL,
  EG,
  NG,
  ZA,
  CO,
  CL,
  PE,
  UY,
  NZ,
  IS,
  HU,
  RO,
  UA,
  VN,
  MY,
  SG,
  PH,
  SA,
  AE,
  QA,
  IR,
  HR,
  RS,
  BG,
  SK,
  SI,
  LT,
  LV,
  EE,
  JM,
  CU,
  BO,
  EC,
  PY,
  VE,
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
  AU: "Austrália",
  NL: "Países Baixos",
  BE: "Bélgica",
  CH: "Suíça",
  AT: "Áustria",
  RU: "Rússia",
  IN: "Índia",
  ID: "Indonésia",
  TH: "Tailândia",
  TW: "Taiwan",
  HK: "Hong Kong",
  DK: "Dinamarca",
  NO: "Noruega",
  FI: "Finlândia",
  IE: "Irlanda",
  CZ: "Tchéquia",
  GR: "Grécia",
  TR: "Turquia",
  IL: "Israel",
  EG: "Egito",
  NG: "Nigéria",
  ZA: "África do Sul",
  CO: "Colômbia",
  CL: "Chile",
  PE: "Peru",
  UY: "Uruguai",
  NZ: "Nova Zelândia",
  IS: "Islândia",
  HU: "Hungria",
  RO: "Romênia",
  UA: "Ucrânia",
  VN: "Vietnã",
  MY: "Malásia",
  SG: "Singapura",
  PH: "Filipinas",
  SA: "Arábia Saudita",
  AE: "Emirados Árabes Unidos",
  QA: "Catar",
  IR: "Irã",
  HR: "Croácia",
  RS: "Sérvia",
  BG: "Bulgária",
  SK: "Eslováquia",
  SI: "Eslovênia",
  LT: "Lituânia",
  LV: "Letônia",
  EE: "Estônia",
  JM: "Jamaica",
  CU: "Cuba",
  BO: "Bolívia",
  EC: "Equador",
  PY: "Paraguai",
  VE: "Venezuela",
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
  const iso = countryCode?.toUpperCase() ?? null;
  const Flag = iso ? COUNTRY_FLAGS[iso] : null;
  const countryName = iso ? (COUNTRY_NAMES[iso] ?? iso) : null;

  const conteudo = (
    <>
      {iso && Flag && (
        <span
          aria-hidden="true"
          className="inline-flex h-3 w-[1.35rem] shrink-0 overflow-hidden rounded-[2px] align-[-2px]"
        >
          <Flag />
        </span>
      )}
      {iso && !Flag && (
        <span
          aria-hidden="true"
          className="shrink-0 rounded-[2px] border border-surface-border px-1 text-[9px] font-bold leading-4 text-fg-muted"
        >
          {iso}
        </span>
      )}
      {entityName ? (
        <span className="text-fg-secondary">
          {roleLabel}: <span className="font-medium text-fg-primary">{entityName}</span>
          {publisherName && (
            <span className="text-fg-secondary">
              {" "}
              · {t("publishedBy")}: {publisherName}
            </span>
          )}
        </span>
      ) : (
        <span className="text-fg-secondary">
          {roleLabel}: <span className="font-medium text-fg-primary">{countryName ?? "—"}</span>
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
        <span className="inline-flex items-center gap-1.5 rounded-full border border-surface-border bg-surface-card px-3 py-1 text-xs transition-colors hover:border-surface-border-hover">
          {conteudo}
        </span>
      </Link>
    );
  }

  return (
    <span className={className} data-testid="origin-badge">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-surface-border bg-surface-card px-3 py-1 text-xs">
        {conteudo}
      </span>
    </span>
  );
}
