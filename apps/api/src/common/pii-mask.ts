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
