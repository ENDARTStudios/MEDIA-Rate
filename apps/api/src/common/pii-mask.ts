/**
 * T049/D-543 — mascaramento de PII para logs (LGPD).
 *
 * Motivo: o `redact` do Pino cobre PROPRIEDADES (`password`, `token`, ...), mas
 * NÃO cobre PII interpolada em strings de mensagem
 * (`logger.log(\`... ${email}\`)`). Estas funções são aplicadas **antes** de
 * logar. Não alteram nenhum comportamento funcional (auth, lockout, sessão) —
 * apenas o texto enviado ao logger.
 */

/** Mascara um e-mail preservando só o TLD: `usuario@example.invalid` → `u***@***.invalid`. */
export function mascararEmail(email: unknown): string {
  if (typeof email !== "string" || !email.includes("@")) return "***";
  const [local, dominio] = email.split("@");
  const prefixo = local && local.length > 0 ? `${local[0]}***` : "***";
  const partes = (dominio ?? "").split(".");
  const tld = partes.length > 1 ? partes[partes.length - 1] : "";
  return tld ? `${prefixo}@***.${tld}` : `${prefixo}@***`;
}

/** Mascara um IP preservando só o prefixo de rede: `203.0.113.45` → `203.0.x.x`. */
export function mascararIp(ip: unknown): string {
  if (typeof ip !== "string" || ip.length === 0) return "unknown";
  if (ip.includes(":")) {
    const grupos = ip.split(":").filter((g) => g.length > 0);
    return grupos.length >= 2 ? `${grupos[0]}:${grupos[1]}:*` : "unknown";
  }
  const octetos = ip.split(".");
  return octetos.length === 4 ? `${octetos[0]}.${octetos[1]}.x.x` : "unknown";
}

/**
 * Mascara um IP para um valor **válido** em coluna `inet` (§ rede):
 * IPv4 → `203.0.113.0/24`; IPv6 → `/48`. Retorna `undefined` se inválido.
 *
 * Nota: `203.0.x.x` NÃO é inet válido — por isso coarsenamos para a rede.
 */
export function mascararIpInet(ip: unknown): string | undefined {
  if (typeof ip !== "string" || ip.length === 0) return undefined;
  if (ip.includes(":")) {
    const g = ip.split(":").filter((x) => x.length > 0);
    return g.length >= 3 ? `${g[0]}:${g[1]}:${g[2]}::/48` : undefined;
  }
  const o = ip.split(".");
  return o.length === 4 ? `${o[0]}.${o[1]}.${o[2]}.0/24` : undefined;
}

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RE_IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;
const CHAVE_EMAIL = /e-?mail/i;
const CHAVE_IP = /(^|[_-])ip([_-]|$)|ip[_-]?(origem|criacao|aceite|address)/i;
const CHAVES_REDIGIR =
  /(senha|password|passwd|secret|token|cookie|authorization|csrf|api[_-]?key|database[_-]?url|connection|comentario|comentário|telefone|cpf|endereco|endereço|nascimento|user[_-]?agent)/i;

/**
 * Sanitiza recursivamente um payload para armazenamento (LGPD).
 * - Chaves de e-mail → `mascararEmail`; de IP → `mascararIp`.
 * - Chaves sensíveis (senha/token/cookie/authorization/csrf/secret/… ) → `[Redacted]`.
 * - Valores que parecem e-mail/IP (qualquer chave) → mascarados.
 */
export function sanitizarPii<T>(valor: T, profundidade = 0): T {
  if (valor === null || valor === undefined) return valor;
  if (profundidade > 6) return "[Redacted]" as unknown as T;
  if (Array.isArray(valor)) {
    return valor.map((v) => sanitizarPii(v, profundidade + 1)) as unknown as T;
  }
  if (typeof valor === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
      out[k] = sanitizarCampo(k, v, profundidade);
    }
    return out as unknown as T;
  }
  if (typeof valor === "string") return sanitizarString(valor) as unknown as T;
  return valor;
}

function sanitizarCampo(chave: string, v: unknown, profundidade: number): unknown {
  if (v === null || v === undefined) return v;
  if (typeof v === "string" && CHAVE_EMAIL.test(chave)) return mascararEmail(v);
  if (typeof v === "string" && CHAVE_IP.test(chave)) return mascararIp(v);
  if (CHAVES_REDIGIR.test(chave)) return "[Redacted]";
  return sanitizarPii(v, profundidade + 1);
}

function sanitizarString(s: string): string {
  if (RE_EMAIL.test(s)) return mascararEmail(s);
  if (RE_IPV4.test(s)) return mascararIp(s);
  return s;
}
