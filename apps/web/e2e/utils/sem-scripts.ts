/**
 * T196-b (#93/#98) — remove blocos `<script>` do HTML SSR por varredura
 * determinística de tokens, **sem regex de tag** e **sem `replace` de multichar**.
 *
 * Contexto: o gate i18n-leak (D-266/T271) analisa o HTML **sem** os scripts,
 * porque o flight payload do RSC carrega o dicionário de mensagens (chaves como
 * `continueWithGoogle` aparecem ali como dados de hidratação, não como texto
 * visível). O restante do HTML — tags e atributos — é preservado, porque o gate
 * também confere links (`href`), `og:locale` e `aria-label`.
 *
 * Contrato:
 * - remove cada bloco `<script ...>…</script>` (case-insensitive, com ou sem atributos);
 * - remove `<script/>` / `<script … />` autofechado;
 * - script **sem fechamento** ⇒ descarta dali para frente (fail-safe: nenhum
 *   conteúdo de script entra na análise de vazamento);
 * - tag cujo nome apenas começa com "script" (ex.: `<scriptt>`) é preservada;
 * - HTML sem script volta idêntico; entrada vazia → "".
 */

const ABERTURA = "<script";
const FECHAMENTO = "</script";

/** Depois de `<script` só pode vir `>`, `/` ou espaço para ser uma tag. */
function ehFronteiraDeTag(caractere: string | undefined): boolean {
  return (
    caractere === ">" || caractere === "/" || (caractere !== undefined && caractere.trim() === "")
  );
}

function acharAbertura(lower: string, de: number): number {
  let i = de;
  for (;;) {
    const pos = lower.indexOf(ABERTURA, i);
    if (pos < 0) return -1;
    if (ehFronteiraDeTag(lower[pos + ABERTURA.length])) return pos;
    i = pos + ABERTURA.length;
  }
}

export function semScripts(html: string): string {
  if (typeof html !== "string" || html.length === 0) return "";
  const lower = html.toLowerCase();
  const partes: string[] = [];
  let cursor = 0;
  for (;;) {
    const abre = acharAbertura(lower, cursor);
    if (abre < 0) break;
    partes.push(html.slice(cursor, abre));
    const fimAbre = html.indexOf(">", abre);
    if (fimAbre < 0) return partes.join(""); // abertura sem '>' — nada depois é confiável
    if (html[fimAbre - 1] === "/") {
      cursor = fimAbre + 1; // <script … /> autofechado
      continue;
    }
    const fecha = lower.indexOf(FECHAMENTO, fimAbre + 1);
    if (fecha < 0) return partes.join(""); // sem fechamento — fail-safe
    const fimFecha = html.indexOf(">", fecha);
    if (fimFecha < 0) return partes.join("");
    cursor = fimFecha + 1;
  }
  partes.push(html.slice(cursor));
  return partes.join("");
}
