/**
 * T196-C — guarda de URL de imagem de *display* (CodeQL #88
 * `js/incomplete-url-substring-sanitization`).
 *
 * Motivo: `normalizar-imagem.ts` decidia transformar a URL com
 * `url.includes("images.igdb.com")` + `url.replace(...)`. Substring **nunca** é
 * allowlist: `images.igdb.com.evil.com`, `evil.com/?u=images.igdb.com/t_thumb`,
 * userinfo, porta arbitrária, `javascript:`/`data:`/`file:` e URLs relativas
 * passavam como "IGDB" e sofriam a transformação — inclusive fora do pathname.
 *
 * Política (fail-closed): transforma **apenas** URL absoluta **https**, sem
 * userinfo, sem porta explícita, cujo `hostname` **parseado** (`new URL`) seja
 * exatamente (case-insensitive) um host da allowlist explícita. A troca
 * `t_thumb` → `t_cover_big` acontece **somente no pathname** (nunca em
 * host/query/hash) e apenas na primeira ocorrência (contrato anterior
 * preservado). Qualquer outra entrada volta **intacta** — sem lançar erro no
 * request path e sem tocar rede.
 *
 * Nota: https-only é consistente com o `url-guard.ts` (T191) e com a origem
 * real do dado (a ingestão do IGDB usa https); se algum dado legado em http
 * aparecer, ele apenas deixa de ter o upgrade de tamanho (cosmético).
 */

export const HOSTS_IMAGEM_PERMITIDOS: ReadonlySet<string> = new Set(["images.igdb.com"]);

const T_THUMB = "t_thumb";
const T_COVER_BIG = "t_cover_big";

/** URL absoluta https, sem userinfo/porta explícita, com hostname da allowlist (exato). */
export function hostDeImagemPermitido(url: unknown): boolean {
  if (typeof url !== "string" || url.length === 0) return false;
  let alvo: URL;
  try {
    alvo = new URL(url);
  } catch {
    return false;
  }
  if (alvo.protocol !== "https:") return false;
  if (alvo.username !== "" || alvo.password !== "") return false;
  if (alvo.port !== "") return false;
  return HOSTS_IMAGEM_PERMITIDOS.has(alvo.hostname.toLowerCase());
}

/** Devolve a URL com o pathname normalizado para capa, ou a própria string intacta. */
export function normalizarUrlImagem(url: string): string {
  if (!hostDeImagemPermitido(url)) return url;
  const alvo = new URL(url);
  if (!alvo.pathname.includes(T_THUMB)) return url;
  alvo.pathname = alvo.pathname.replace(T_THUMB, T_COVER_BIG);
  return alvo.toString();
}
