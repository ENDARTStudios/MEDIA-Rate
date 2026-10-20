import { colors } from "@/lib/design-tokens";

/**
 * Marca MEDIA Rate — o selo e o play.
 *
 * O símbolo é um losango de cantos suaves (o selo/nota) com um play no centro
 * (a mídia). O indigo carrega a estrutura; o rose marca a nota. O wordmark usa
 * o contraste de peso da Space Grotesk: MEDIA em 700 e RATE em 300 com
 * entreletra ampla — o assunto e a ação.
 *
 * Construção (ver `design-system/media-rate/logo/README.md`):
 * - símbolo = 1em do wordmark (≈ 1,42 × altura de caixa alta);
 * - RATE entra com 0,42em de respiro e +0,1em de entreletra;
 * - nada de sombra, gradiente ou terceira cor.
 *
 * Componente de servidor de propósito: a marca é estática (sem hidratação) e
 * mantém o header fora do JS do cliente. O desenho anterior (traço do losango
 * animado no mount) custava um chunk de animação para um efeito que só existia
 * no primeiro paint.
 */
const SIZES = {
  sm: { text: "text-[0.9375rem]", gap: "gap-[0.5em]" },
  md: { text: "text-lg", gap: "gap-[0.55em]" },
  lg: { text: "text-2xl", gap: "gap-[0.6em]" },
} as const;

/** Geometria do símbolo numa malha de 64 unidades (viewBox 0 0 64 64). */
const SYMBOL = {
  lozenge:
    "M28.832 3.168Q32 0 35.168 3.168L60.832 28.832Q64 32 60.832 35.168L35.168 60.832Q32 64 28.832 60.832L3.168 35.168Q0 32 3.168 28.832L28.832 3.168Z",
  play: "M51.584 32L24.704 44.288L24.704 19.712Z",
} as const;

interface LogoProps {
  variant?: "full" | "compact" | "inline";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Logo({ variant = "full", size = "md", className }: LogoProps) {
  const s = SIZES[size];
  const showSymbol = variant !== "inline";
  const showWordmark = variant !== "compact";

  return (
    <span
      className={`inline-flex items-center ${showSymbol && showWordmark ? s.gap : ""} ${s.text} ${className ?? ""}`}
      role="img"
      aria-label="MEDIA Rate"
    >
      {showSymbol && (
        <svg
          viewBox="0 0 64 64"
          className="h-[1em] w-[1em] shrink-0"
          aria-hidden="true"
          focusable="false"
        >
          <path d={SYMBOL.lozenge} fill={colors.accent.indigo} />
          <path d={SYMBOL.play} fill={colors.accent.brand} />
        </svg>
      )}

      {showWordmark && (
        <span className="font-heading leading-none whitespace-nowrap" aria-hidden="true">
          <span className="font-bold tracking-[-0.02em] text-fg-primary">MEDIA</span>
          <span className="ml-[0.42em] font-light tracking-[0.1em] text-fg-primary">RATE</span>
        </span>
      )}
    </span>
  );
}
