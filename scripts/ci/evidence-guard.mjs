/* eslint-disable no-undef */ // módulo Node puro (sem deps)
/**
 * T061/D-548 — guarda anti-produção e parsing de args do `evidence-local`.
 *
 * Puro e determinístico (sem efeitos colaterais, sem rede, sem segredos) para
 * ser testável isoladamente. Regra: **somente** host local (localhost/loopback);
 * qualquer marcador de produção/provider é recusado.
 */

/** Marcadores proibidos (host, provider ou rótulo de ambiente). */
const MARCADOR_PROD = /(^|[.\-_/])prod(uction)?([.\-_/]|$)|railway|mediarate\.app|neon\.tech|supabase|render\.com|fly\.io/i;

/** Hosts aceitos (loopback apenas). */
const HOSTS_LOCAIS = new Set(["localhost", "127.0.0.1", "::1"]);

/**
 * Valida que a URL de banco aponta para host LOCAL e não contém marcador de produção.
 * @returns {{ok: boolean, host?: string, motivo?: string}}
 */
export function validarDatabaseUrlLocal(url) {
  if (typeof url !== "string" || url.trim() === "") {
    return { ok: false, motivo: "vazio" };
  }
  if (MARCADOR_PROD.test(url)) {
    return { ok: false, motivo: "marcador de produção/provider detectado" };
  }
  let host;
  try {
    host = new URL(url).hostname.replace(/^\[|\]$/g, "");
  } catch {
    return { ok: false, motivo: "URL inválida" };
  }
  if (!HOSTS_LOCAIS.has(host)) {
    return { ok: false, motivo: `host não-local: ${host}` };
  }
  return { ok: true, host };
}

/**
 * Interpreta `--spec <arquivo>` e `--repeat <n>` (defaults: sem spec, 1 repetição).
 * @returns {{spec: string|null, repeat: number}}
 */
export function parseEvidenceArgs(argv) {
  let spec = null;
  let repeat = 1;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--spec") spec = argv[++i] ?? null;
    else if (a.startsWith("--spec=")) spec = a.slice("--spec=".length);
    else if (a === "--repeat") repeat = Number(argv[++i] ?? 1);
    else if (a.startsWith("--repeat=")) repeat = Number(a.slice("--repeat=".length));
  }
  if (!Number.isFinite(repeat) || repeat < 1) repeat = 1;
  return { spec, repeat };
}

/** Redige credenciais de uma URL para log (nunca imprime segredo). */
export function redigirUrl(url) {
  return String(url).replace(/:\/\/[^@/]*@/, "://***@");
}
