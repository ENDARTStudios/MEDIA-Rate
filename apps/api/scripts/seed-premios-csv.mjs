#!/usr/bin/env node
/**
 * T167 — ingestão do CSV de prêmios curado manualmente
 * (scripts/curadoria/premios.csv; separador ";" — títulos não contêm ";").
 *
 * Matching por (titulo EXATO, tipo) contra o catálogo ativo — linha sem
 * correspondência vai para o relatório e é pulada. Idempotente: linha já
 * existente (midia + organizacao + nome + categoria + ano) não duplica.
 * DRY_RUN=1 default; HTTP irrelevante (leitura local + DB).
 */
import { readFileSync } from "node:fs";

/** Parse do CSV curado (header obrigatório; ; como separador). */
export function parsearCsv(conteudo) {
  const linhas = String(conteudo)
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.startsWith("#"));
  const cabecalho = linhas.shift();
  if (!cabecalho || !cabecalho.startsWith("titulo;tipo;organizacao")) {
    throw new Error("CSV sem o cabeçalho esperado (titulo;tipo;organizacao;...)");
  }
  return linhas.map((l) => {
    const [titulo, tipo, organizacao, nome, categoria, ano, venceu] = l.split(";");
    return {
      titulo: (titulo ?? "").trim(),
      tipo: (tipo ?? "").trim(),
      organizacao: (organizacao ?? "").trim(),
      nome: (nome ?? "").trim(),
      categoria: (categoria ?? "").trim(),
      ano: Number.parseInt(ano, 10),
      venceu: String(venceu).trim().toLowerCase() === "true",
    };
  });
}

/**
 * Planner puro: casa linhas com o catálogo e monta o plano.
 * - match por (titulo, tipo): 0 → ausentes, >1 → ambiguos (pulados);
 * - existentes (midia+organizacao+nome+categoria+ano) não entram no plano.
 */
export function construirPlano(linhas, midias, existentes) {
  const indice = new Map();
  for (const m of midias) {
    const chave = `${m.titulo}::${m.tipo}`;
    if (indice.has(chave)) indice.get(chave).push(m);
    else indice.set(chave, [m]);
  }
  const chavesExistentes = new Set(
    (existentes ?? []).map(
      (p) => `${p.midia_id}::${p.organizacao}::${p.nome}::${p.categoria}::${p.ano}`,
    ),
  );
  const plano = [];
  const ausentes = [];
  const ambiguos = [];
  for (const l of linhas) {
    const hits = indice.get(`${l.titulo}::${l.tipo}`) ?? [];
    if (hits.length === 0) {
      ausentes.push(l);
      continue;
    }
    if (hits.length > 1) {
      ambiguos.push(l);
      continue;
    }
    const chave = `${hits[0].id}::${l.organizacao}::${l.nome}::${l.categoria}::${l.ano}`;
    if (chavesExistentes.has(chave)) continue;
    plano.push({ midiaId: hits[0].id, ...l });
  }
  return { plano, ausentes, ambiguos };
}

function saida(msg) {
  process.stdout.write(`${msg}\n`);
}

async function main() {
  const dryRun = process.env.DRY_RUN !== "0";
  const csvPath = new URL("./curadoria/premios.csv", import.meta.url);
  const linhas = parsearCsv(readFileSync(csvPath, "utf-8"));
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const midias = await prisma.midia.findMany({
      where: { deleted_at: null },
      select: { id: true, titulo: true, tipo: true },
    });
    const existentes = await prisma.premio.findMany({
      select: { midia_id: true, organizacao: true, nome: true, categoria: true, ano: true },
    });
    const { plano, ausentes, ambiguos } = construirPlano(linhas, midias, existentes);
    saida(
      `PLANO: ${plano.length} prêmios novos (${ausentes.length} ausentes, ${ambiguos.length} ambiguos, ${linhas.length - plano.length - ausentes.length - ambiguos.length} já existentes)`,
    );
    for (const a of ausentes) saida(`  AUSENTE [${a.tipo}] ${a.titulo}`);
    for (const a of ambiguos) saida(`  AMBIGUO [${a.tipo}] ${a.titulo}`);
    if (dryRun) {
      saida("DRY_RUN — nada foi escrito (DRY_RUN=0 aplica).");
    } else {
      for (const p of plano) {
        await prisma.premio.create({
          data: {
            midia_id: p.midiaId,
            nome: p.nome,
            categoria: p.categoria,
            ano: p.ano,
            venceu: p.venceu,
            organizacao: p.organizacao,
          },
        });
      }
      saida(`APLICADO ${plano.length} prêmios.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

const isMain =
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, "/")}`).href;
if (isMain) {
  main().catch((e) => {
    process.stderr.write(`ERRO ${e && e.stack ? e.stack : String(e)}\n`);
    process.exit(1);
  });
}
