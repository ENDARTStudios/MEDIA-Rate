/**
 * Arte SVG em camadas dos 5 ícones do hero (addendum §2.1).
 *
 * Diretrizes de produção aplicadas:
 * - Fonte de luz superior-esquerda (45°): gradiente 135deg claro→escuro
 *   com ~15% de variação de luminosidade por camada.
 * - Camadas com translateZ diferenciado (base atrás, destaque à frente) —
 *   o tilt do cursor (HeroMediaIcon) usa preserve-3d para dar profundidade.
 * - Sombra projetada suave sob o ícone ("chão" visual).
 * - Paleta: accent da categoria com 2 tons derivados (claro/escuro).
 *
 * Cada camada relevante para a coreografia Anime.js expõe data-part:
 * boca/flash (claquete), tela/scanline (TV), botao/stick (controle),
 * capa/paginas/linha (livro), particula (revista).
 */
import type { CSSProperties } from "react";

export type AnimationVariant = "clapperboard" | "tv" | "controller" | "book" | "magazine";

const VIEWBOX = "0 0 120 120";

/** Camada com translateZ (profundidade no tilt). */
function Layer({ depth, style, ...rest }: React.SVGProps<SVGGElement> & { depth: number }) {
  const layerStyle: CSSProperties = {
    transform: `translateZ(${depth}px)`,
    transformStyle: "preserve-3d",
    ...style,
  };
  return <g style={layerStyle} {...rest} />;
}

function Shadow() {
  return (
    <ellipse
      cx="60"
      cy="104"
      rx="38"
      ry="6"
      fill="#000"
      opacity="0.25"
      filter="url(#heroIconBlur)"
    />
  );
}

function BevelGradient({ id, light, dark }: { id: string; light: string; dark: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor={light} />
      <stop offset="100%" stopColor={dark} />
    </linearGradient>
  );
}

/** Claquete — indigo #818CF8. */
export function ClapperboardArt({ id }: { id: string }) {
  return (
    <svg viewBox={VIEWBOX} role="img" aria-hidden="true" className="hero-icon-svg h-full w-full">
      <defs>
        <BevelGradient id={`${id}-corpo`} light="#A5B4FC" dark="#6366F1" />
        <BevelGradient id={`${id}-boca`} light="#C7D2FE" dark="#818CF8" />
        <filter id="heroIconBlur" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <Layer depth={0}>
        <Shadow />
      </Layer>
      {/* Corpo (parte inferior) */}
      <Layer depth={14}>
        <rect x="24" y="58" width="72" height="34" rx="5" fill={`url(#${id}-corpo)`} />
        <rect x="24" y="58" width="72" height="6" rx="3" fill="#C7D2FE" opacity="0.5" />
      </Layer>
      {/* Boca (parte superior articulada) — anima na claquete */}
      <Layer depth={26} data-part="boca" style={{ transformOrigin: "60px 58px" }}>
        <rect x="24" y="34" width="72" height="26" rx="5" fill={`url(#${id}-boca)`} />
        <g fill="#0F172A" opacity="0.85">
          <rect x="32" y="44" width="8" height="4" rx="1" />
          <rect x="46" y="44" width="8" height="4" rx="1" />
          <rect x="60" y="44" width="8" height="4" rx="1" />
          <rect x="74" y="44" width="8" height="4" rx="1" />
        </g>
      </Layer>
      {/* Flash de impacto — aparece no "clack" */}
      <Layer depth={40} data-part="flash" style={{ opacity: 0 }}>
        <rect x="20" y="30" width="80" height="66" rx="6" fill="#FFFFFF" />
      </Layer>
    </svg>
  );
}

/** TV — azul #38BDF8. */
export function TvArt({ id }: { id: string }) {
  return (
    <svg viewBox={VIEWBOX} role="img" aria-hidden="true" className="hero-icon-svg h-full w-full">
      <defs>
        <BevelGradient id={`${id}-frame`} light="#7DD3FC" dark="#0284C7" />
        <BevelGradient id={`${id}-tela`} light="#0C4A6E" dark="#082F49" />
      </defs>
      <Layer depth={0}>
        <Shadow />
      </Layer>
      {/* Pé da TV */}
      <Layer depth={8}>
        <rect x="52" y="82" width="16" height="8" rx="2" fill={`url(#${id}-frame)`} />
        <rect x="42" y="90" width="36" height="5" rx="2.5" fill={`url(#${id}-frame)`} />
      </Layer>
      {/* Moldura */}
      <Layer depth={18}>
        <rect x="22" y="26" width="76" height="58" rx="8" fill={`url(#${id}-frame)`} />
        <rect x="22" y="26" width="76" height="8" rx="4" fill="#BAE6FD" opacity="0.55" />
      </Layer>
      {/* Tela */}
      <Layer depth={28} data-part="tela">
        <rect x="29" y="33" width="62" height="44" rx="4" fill={`url(#${id}-tela)`} />
        {/* Scanline — anima ao "ligar" */}
        <g clipPath={`url(#${id}-clip)`} data-part="scanline" style={{ opacity: 0.9 }}>
          <rect x="29" y="33" width="62" height="9" fill="#7DD3FC" opacity="0.55" />
        </g>
        <clipPath id={`${id}-clip`}>
          <rect x="29" y="33" width="62" height="44" rx="4" />
        </clipPath>
      </Layer>
    </svg>
  );
}

/** Controle — verde #34D399. */
export function ControllerArt({ id }: { id: string }) {
  const buttons: { x: number; y: number }[] = [
    { x: 78, y: 42 },
    { x: 90, y: 50 },
    { x: 78, y: 58 },
    { x: 66, y: 50 },
  ];
  return (
    <svg viewBox={VIEWBOX} role="img" aria-hidden="true" className="hero-icon-svg h-full w-full">
      <defs>
        <BevelGradient id={`${id}-corpo`} light="#6EE7B7" dark="#059669" />
        <BevelGradient id={`${id}-botao`} light="#A7F3D0" dark="#34D399" />
      </defs>
      <Layer depth={0}>
        <Shadow />
      </Layer>
      {/* Corpo */}
      <Layer depth={16}>
        <path
          d="M34 38 h30 a22 22 0 0 1 26 0 l6 22 a12 12 0 0 1 -18 9 l-8 -7 h-22 l-8 7 a12 12 0 0 1 -18 -9 z"
          fill={`url(#${id}-corpo)`}
        />
        <path
          d="M34 38 h30 a22 22 0 0 1 26 0 l3 10 a22 22 0 0 0 -32 0 z"
          fill="#D1FAE5"
          opacity="0.4"
        />
      </Layer>
      {/* D-pad */}
      <Layer depth={22}>
        <rect x="38" y="52" width="8" height="16" rx="2" fill={`url(#${id}-botao)`} />
        <rect x="32" y="58" width="20" height="8" rx="2" fill={`url(#${id}-botao)`} />
      </Layer>
      {/* Botões de face — acendem em sequência */}
      {buttons.map((b, i) => (
        <Layer key={i} depth={26} data-part="botao">
          <circle cx={b.x} cy={b.y} r="4.5" fill={`url(#${id}-botao)`} />
        </Layer>
      ))}
      {/* Analógico esquerdo — gira na coreografia */}
      <Layer depth={28} data-part="stick">
        <circle cx="60" cy="58" r="7" fill="#064E3B" opacity="0.9" />
        <circle cx="60" cy="58" r="4" fill={`url(#${id}-botao)`} />
      </Layer>
    </svg>
  );
}

/** Livro — âmbar #FBBF24. */
export function BookArt({ id }: { id: string }) {
  return (
    <svg viewBox={VIEWBOX} role="img" aria-hidden="true" className="hero-icon-svg h-full w-full">
      <defs>
        <BevelGradient id={`${id}-capa`} light="#FCD34D" dark="#D97706" />
        <BevelGradient id={`${id}-paginas`} light="#FEF3C7" dark="#FDE68A" />
      </defs>
      <Layer depth={0}>
        <Shadow />
      </Layer>
      {/* Páginas (atrás da capa) */}
      <Layer depth={10} data-part="paginas" style={{ opacity: 0 }}>
        <rect x="34" y="24" width="56" height="66" rx="4" fill={`url(#${id}-paginas)`} />
        <g stroke="#B45309" strokeWidth="1.5" opacity="0.5">
          <line data-part="linha" x1="42" y1="38" x2="82" y2="38" opacity="0" />
          <line data-part="linha" x1="42" y1="48" x2="76" y2="48" opacity="0" />
          <line data-part="linha" x1="42" y1="58" x2="80" y2="58" opacity="0" />
        </g>
      </Layer>
      {/* Capa — gira em rotateY a partir da lombada */}
      <Layer depth={22} data-part="capa" style={{ transformOrigin: "36px 57px" }}>
        <rect x="30" y="24" width="60" height="66" rx="4" fill={`url(#${id}-capa)`} />
        <rect x="30" y="24" width="6" height="66" rx="3" fill="#92400E" />
        <rect x="46" y="34" width="30" height="5" rx="2.5" fill="#78350F" opacity="0.7" />
        <rect x="46" y="46" width="24" height="3" rx="1.5" fill="#78350F" opacity="0.4" />
      </Layer>
    </svg>
  );
}

/** Revista/painel de HQ — gradiente diagonal pink+violet. */
export function MagazineArt({ id }: { id: string }) {
  const particulas: { x: number; y: number }[] = [
    { x: 44, y: 42 },
    { x: 64, y: 36 },
    { x: 76, y: 52 },
    { x: 58, y: 68 },
    { x: 40, y: 64 },
    { x: 70, y: 74 },
    { x: 84, y: 66 },
    { x: 50, y: 50 },
  ];
  return (
    <svg viewBox={VIEWBOX} role="img" aria-hidden="true" className="hero-icon-svg h-full w-full">
      <defs>
        <linearGradient id={`${id}-painel`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F472B6" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
        <BevelGradient id={`${id}-fundo`} light="#C4B5FD" dark="#8B5CF6" />
      </defs>
      <Layer depth={0}>
        <Shadow />
      </Layer>
      {/* Fundo do painel */}
      <Layer depth={12}>
        <rect x="26" y="30" width="68" height="52" rx="6" fill={`url(#${id}-fundo)`} />
        <rect x="26" y="30" width="68" height="8" rx="4" fill="#DDD6FE" opacity="0.5" />
      </Layer>
      {/* Meio-tom (dots) — explodem na coreografia */}
      {particulas.map((p, i) => (
        <Layer key={i} depth={22} data-part="particula">
          <circle cx={p.x} cy={p.y} r="3" fill={`url(#${id}-painel)`} />
        </Layer>
      ))}
      {/* Balão de fala */}
      <Layer depth={26}>
        <rect x="38" y="44" width="44" height="22" rx="10" fill="#FDF4FF" />
        <path d="M50 66 l-4 8 l8 -7 z" fill="#FDF4FF" />
      </Layer>
    </svg>
  );
}
