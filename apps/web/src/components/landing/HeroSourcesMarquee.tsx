import styles from "./hero-proof.module.css";

/**
 * Faixa das fontes de avaliação agregadas pelo MEDIA Score™.
 *
 * - Lista DIRIGIDA POR DADOS: recebe `FONTES_ATIVAS` (fonte única de verdade,
 *   D-209/T191). Antes o hero mostrava 6 nomes fixos enquanto o rótulo dizia
 *   "11 fontes" — número que também divergia do contador real (14).
 * - Server Component + CSS puro: nenhuma hidratação, nenhum JS no caminho do
 *   LCP. A segunda cópia existe só para o loop contínuo e sai da árvore de
 *   acessibilidade (`aria-hidden`).
 * - `prefers-reduced-motion`: lista estática, sem loop (CSS module).
 */
export function HeroSourcesMarquee({ names }: { names: string[] }) {
  if (names.length === 0) return null;

  return (
    <div className={styles.marquee} data-testid="hero-sources-marquee">
      <div className={styles.track}>
        {(["primary", "duplicate"] as const).map((copy) => (
          <ul
            key={copy}
            className={styles.group}
            data-copy={copy}
            role="list"
            aria-hidden={copy === "duplicate" ? true : undefined}
          >
            {names.map((name) => (
              <li key={name} className={styles.chip} data-source-chip>
                {name}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
