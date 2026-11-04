#!/usr/bin/env node
/**
 * Biblioteca compartilhada dos quadros do **conceito v2**.
 *
 * Existe para os geradores das frentes (público/obra, conta/admin) desenharem com os
 * MESMOS tokens, a MESMA grade e as MESMAS primitivas — sem isso, dois geradores viram
 * dois produtos diferentes.
 *
 * Regras embutidas:
 *  - grade de 12 colunas (M=120, COL=84, VAO=24) — nada de coordenada "no olho";
 *  - nenhuma cor fora dos tokens do `00-FUNDAMENTOS.md`;
 *  - `rotulo()` sempre uppercase com tracking 0.08em (rótulo de seção, não texto);
 *  - `quadro()` cria a página e devolve o nome para os `texto/rect` usarem como pai;
 *  - `icone()` usa `lucide-react` (dependência real do app) renderizado para SVG, então
 *    não depende de `lucide-static` (que nunca foi declarado no package.json).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// ── tokens (espelham docs/02-architecture-design/conceito-v2/00-FUNDAMENTOS.md) ──
export const C = {
  mesa0: "#08080C",
  mesa1: "#0E0E14",
  mesa2: "#14141C",
  papel: "#F4F1EA",
  tintaPapel: "#14141C",
  tinta1: "#F2F0EB",
  tinta2: "#A8A49C",
  tinta3: "#6E6A64",
  regra1: "#26262E",
  regra2: "#34343E",
  acento: "#E8543F",
  acentoHover: "#F26B57",
  acentoTinta: "#1A0E0B",
  faixa9: "#2FD3A0",
  faixa8: "#3FA9F5",
  faixa7: "#8B8CF0",
  faixa6: "#E8B44A",
  faixa5: "#E8853F",
  faixa0: "#E05A55",
  aviso: "#E8B44A",
  erro: "#E05A55",
  sucesso: "#2FD3A0",
};

export const HEAD = "Space Grotesk";
export const BODY = "Inter";

// ── grade ────────────────────────────────────────────────────────────────────
export const M = 120;
export const CONTEUDO = 1200;
export const DIREITA = 1320;
export const COL = 78; // (1200 - 11*24) / 12 = 78 — era 84 e estourava a direita (col(11)+COL = 1392 > 1320)
export const VAO = 24;
/** x da coluna i (0..11). */
export const col = (i) => M + i * (COL + VAO);
/** largura de n colunas contíguas. */
export const largura = (n) => n * COL + (n - 1) * VAO;

// ── paleta das faixas, na ordem canônica ─────────────────────────────────────
export const FAIXAS = [
  { rotulo: "9 a 10", nome: "Excepcional", cor: C.faixa9 },
  { rotulo: "8", nome: "Muito bom", cor: C.faixa8 },
  { rotulo: "7", nome: "Bom", cor: C.faixa7 },
  { rotulo: "6", nome: "Razoável", cor: C.faixa6 },
  { rotulo: "5", nome: "Fraco", cor: C.faixa5 },
  { rotulo: "abaixo", nome: "Evite", cor: C.faixa0 },
];

// ── primitivas de desenho ────────────────────────────────────────────────────
export function criarComandos() {
  const passos = [];
  const cmd = (id, params) => passos.push({ command: id, params });

  function rect(name, x, y, w, h, cor, pai, raio = 0, extra = {}) {
    cmd("shape.rectangle", { x, y, width: w, height: h, props: { name } });
    const props = { fill: cor, ...extra };
    if (raio) props.cornerRadius = raio;
    cmd("node.set", { name, ...props });
  }

  function texto(name, txt, x, y, tamanho, cor, pai, opts = {}) {
    cmd("text.create", {
      text: txt,
      x,
      y,
      width: opts.largura,
      props: {
        name,
        fontSize: tamanho,
        fontFamily: opts.fonte ?? BODY,
        ...(opts.peso ? { fontWeight: opts.peso } : {}),
      },
    });
    cmd("node.set", { name, fill: cor });
  }

  /** Rótulo de seção: uppercase, tracking largo, corpo pequeno. É a assinatura do v2. */
  function rotulo(name, txt, x, y, cor = C.tinta3) {
    texto(name, txt.toUpperCase(), x, y, 11, cor, null, {
      peso: 600,
      fonte: BODY,
      largura: 400,
    });
    cmd("node.set", { name, letterSpacing: 0.08 * 11 });
  }

  /** Hairline de largura total (coluna 1 → 12). */
  function regra(name, x, y, w = CONTEUDO, cor = C.regra1) {
    rect(name, x, y, w, 1, cor);
  }

  /** Ícone Lucide real, com traço resolvido no SVG. */
  function icone(Componente, name, cor, cx, cy, tamanho, traco = 1.6) {
    const bruto = renderToStaticMarkup(
      createElement(Componente, { size: tamanho, strokeWidth: traco, color: cor }),
    )
      .replace(/currentColor/g, cor)
      .replace(/stroke-width="[\d.]+"/, `stroke-width="${traco}"`);
    const caminho = `${process.cwd()}/.v2-${name.replace(/[^a-z0-9]/gi, "-")}.svg`;
    writeFileSync(caminho, bruto, "utf8");
    cmd("file.import", { path: caminho, x: cx, y: cy, center: true });
    cmd("node.set", { name: `${name}.svg`, width: tamanho, height: tamanho });
  }

  /** Cria página + frame e devolve o nome do frame (usar como pai). */
  function quadro(nome, altura, larguraFrame = 1440, fundo = C.mesa0) {
    cmd("page.add", { name: nome });
    cmd("page.setBackground", { color: fundo });
    cmd("frame.create", { x: 0, y: 0, width: larguraFrame, height: altura, name: nome });
    cmd("node.set", { name: nome, fill: fundo });
    return nome;
  }

  return { passos, cmd, rect, texto, rotulo, regra, icone, quadro };
}

/** Grava o `.jsonl` e diz quantos comandos saíram. */
export function salvar(passos, caminho) {
  const dir = caminho.slice(0, caminho.lastIndexOf("/"));
  mkdirSync(dir, { recursive: true });
  writeFileSync(caminho, `${passos.map((p) => JSON.stringify(p)).join("\n")}\n`, "utf8");
  return passos.length;
}
