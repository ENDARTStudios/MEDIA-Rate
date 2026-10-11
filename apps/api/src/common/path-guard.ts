/**
 * T192 (CodeQL js/path-injection) — guard de caminho para filesystem local.
 *
 * Política (ver docs/08-security/SECURITY_CODEQL_RUNTIME.md):
 * - cada segmento é validado ANTES de compor o caminho: rejeita vazio,
 *   segmentos de navegação (`.`, `..`, qualquer `..` embutido), separadores
 *   (`/` e `\`), caminho absoluto/drive (ex.: `C:`), caracteres de controle
 *   (inclui NUL) e formas codificadas (double-encoding é decodificado até 2
 *   níveis e revalidado);
 * - o caminho final é resolvido e CONFINADO na base permitida
 *   (`resolve` + `startsWith(base + sep)`) — qualquer escape é bloqueado;
 * - erros são sanitizados: a mensagem contém apenas o motivo, nunca o valor.
 */

import * as path from "node:path";

export type MotivoCaminhoBloqueado =
  | "segmento_vazio"
  | "caractere_controle"
  | "separador_ou_absoluto"
  | "dot_segment"
  | "escape_da_base";

export class CaminhoBloqueadoError extends Error {
  constructor(readonly motivo: MotivoCaminhoBloqueado) {
    super(`Caminho bloqueado (motivo=${motivo})`);
    this.name = "CaminhoBloqueadoError";
  }
}

/** NUL + control chars C0 + DEL (sem regex de controle — no-control-regex). */
function temCaractereControle(seg: string): boolean {
  for (const ch of seg) {
    const codigo = ch.codePointAt(0) ?? 0;
    if (codigo <= 0x1f || codigo === 0x7f) return true;
  }
  return false;
}

function validarSegmentoBruto(seg: string): void {
  if (!seg) throw new CaminhoBloqueadoError("segmento_vazio");
  if (temCaractereControle(seg)) throw new CaminhoBloqueadoError("caractere_controle");
  if (/[\\/]/.test(seg)) throw new CaminhoBloqueadoError("separador_ou_absoluto");
  if (/^[a-zA-Z]:/.test(seg) || seg.startsWith("~")) {
    throw new CaminhoBloqueadoError("separador_ou_absoluto");
  }
  if (seg === "." || seg.includes("..")) throw new CaminhoBloqueadoError("dot_segment");
}

/** Formas decodificadas de um segmento (até 2 níveis; para pegar double-encoding). */
function variantesDecodificadas(seg: string): string[] {
  const variantes: string[] = [];
  let atual = seg;
  for (let i = 0; i < 3; i += 1) {
    let proximo: string;
    try {
      proximo = decodeURIComponent(atual);
    } catch {
      break; // % inválido → trata só o valor bruto
    }
    if (proximo === atual) break;
    variantes.push(proximo);
    atual = proximo;
  }
  return variantes;
}

/** Valida um segmento de caminho e devolve o valor original (nunca o decodificado). */
export function segmentoSeguro(segmentoBruto: string): string {
  const seg = String(segmentoBruto);
  validarSegmentoBruto(seg);
  for (const decodificado of variantesDecodificadas(seg)) {
    validarSegmentoBruto(decodificado);
  }
  return seg;
}

/** Garante que `caminho` resolvido está contido em `baseAbs` (ou é a própria base). */
export function garantirContencao(baseAbs: string, caminho: string): string {
  const base = path.resolve(baseAbs);
  const alvo = path.resolve(caminho);
  if (alvo !== base && !alvo.startsWith(base + path.sep)) {
    throw new CaminhoBloqueadoError("escape_da_base");
  }
  return alvo;
}

/** Compõe `base/seg1/seg2/...` com cada segmento validado e contenção garantida. */
export function caminhoContidoNaBase(baseAbs: string, ...segmentos: string[]): string {
  const limpos = segmentos.map((s) => segmentoSeguro(s));
  const base = path.resolve(baseAbs);
  const alvo = path.resolve(base, ...limpos);
  return garantirContencao(base, alvo);
}
