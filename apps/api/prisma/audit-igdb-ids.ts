/**
 * audit-igdb-ids.ts (T276/D-265) — auditoria EXAUSTIVA dos fonte_id IGDB.
 *
 * Para CADA game do seed, consulta o IGDB por slug (e, em fallback, por
 * nome) e compara com o id curado do seed E com o fonte_id gravado no banco.
 * Reporta divergências, órfãos e a reconciliação de contagem (seed vs banco).
 *
 * Uso (Console Railway / local com env):
 *   npm run db:audit:igdb                 # somente auditoria (read-only)
 *   npm run db:audit:igdb -- --apply-db   # corrige fonte_id + merge órfãos
 *
 * Regras (D-268):
 * - Correção derivada do lookup (sem lista manual).
 * - Merge NÃO-destrutivo: reponta relações e isola o órfão (deleted_at);
 *   exclusão dura só com `--hard-delete-orphans` (aprovação explícita).
 * - Rate limit com delay + retry; nenhum segredo em logs (D-257).
 * - Exit code 0 = zero divergências; 1 = encontrou (útil no CI/manual).
 */
/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import { GAMES_CURADOS } from "./seed-games.js";
import {
  buscarIdPorSlug,
  buscarCandidatosPorNome,
  melhorCandidato,
  nomeConfere,
  normalizarTitulo,
  resetTokenTwitch,
} from "./igdb-http.js";

const DELAY_MS = 300;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type StatusAuditoria = "OK" | "DIVERGENCIA" | "NAO_ENCONTRADO" | "IGDB_INDISPONIVEL";

export interface LinhaAuditoria {
  nome: string;
  slug: string;
  idCurado: number;
  idIgdb: number | null;
  status: StatusAuditoria;
  nomeIgdb: string | null;
  slugIgdb: string | null;
}

export interface Orfao {
  id: string;
  titulo: string;
  fonte_id: string;
}

export interface ResultadoReconciliacao {
  totalSeed: number;
  totalBanco: number;
  orfaos: Orfao[];
  faltando: { nome: string; slug: string; idIgdb: number | null }[];
}

/**
 * Reconciliação pura: comparar as mídias IGDB do banco com a lista do seed.
 * Órfão = registro no banco cujo fonte_id não pertence aos ids curados nem
 * aos resolvidos do seed (ex.: antigo Elden Ring id 121956).
 */
export function reconciliarBanco(
  banco: { id: string; titulo: string; fonte_id: string }[],
  linhas: LinhaAuditoria[],
): ResultadoReconciliacao {
  const idsEsperados = new Set<string>();
  for (const l of linhas) {
    if (l.idIgdb != null) idsEsperados.add(String(l.idIgdb));
    idsEsperados.add(String(l.idCurado));
  }
  const orfaos = banco.filter((m) => !idsEsperados.has(m.fonte_id));
  const noBanco = new Set(banco.map((m) => m.fonte_id));
  const faltando = linhas
    .filter((l) => !(l.idIgdb != null && noBanco.has(String(l.idIgdb))))
    .map((l) => ({ nome: l.nome, slug: l.slug, idIgdb: l.idIgdb }));
  return { totalSeed: linhas.length, totalBanco: banco.length, orfaos, faltando };
}

/**
 * Merge NÃO-destrutivo: reponta todas as relações do registro órfão para o
 * canônico e isola o órfão (deleted_at + score null). Não exclui nada.
 * Colunas únicas compostas: remove antes os conflitos no destino.
 */
export async function mesclarDuplicados(
  prisma: PrismaClient,
  deId: string,
  paraId: string,
): Promise<{ movidos: number; isolado: boolean }> {
  // avaliacao_fonte (midia_id, fonte)
  const af = await prisma.avaliacaoFonte.findMany({
    where: { midia_id: deId },
    select: { fonte: true },
  });
  if (af.length > 0) {
    await prisma.avaliacaoFonte.deleteMany({
      where: { midia_id: paraId, fonte: { in: af.map((a) => a.fonte) } },
    });
    await prisma.avaliacaoFonte.updateMany({
      where: { midia_id: deId },
      data: { midia_id: paraId },
    });
  }
  // usuario_midia_interacao (usuario_id, midia_id)
  const ints = await prisma.usuarioMidiaInteracao.findMany({
    where: { midia_id: deId },
    select: { usuario_id: true },
  });
  if (ints.length > 0) {
    await prisma.usuarioMidiaInteracao.deleteMany({
      where: { midia_id: paraId, usuario_id: { in: ints.map((i) => i.usuario_id) } },
    });
    await prisma.usuarioMidiaInteracao.updateMany({
      where: { midia_id: deId },
      data: { midia_id: paraId },
    });
  }
  // watchlist_entry (usuario_id, midia_id) — VarChar sem FK
  const wl = await prisma.watchlistEntry.findMany({
    where: { midia_id: deId },
    select: { usuario_id: true },
  });
  if (wl.length > 0) {
    await prisma.watchlistEntry.deleteMany({
      where: { midia_id: paraId, usuario_id: { in: wl.map((w) => w.usuario_id) } },
    });
    await prisma.watchlistEntry.updateMany({
      where: { midia_id: deId },
      data: { midia_id: paraId },
    });
  }
  // lista_item (lista_id, midia_id) — VarChar sem FK
  const itens = await prisma.listaItem.findMany({
    where: { midia_id: deId },
    select: { lista_id: true },
  });
  if (itens.length > 0) {
    await prisma.listaItem.deleteMany({
      where: { midia_id: paraId, lista_id: { in: itens.map((i) => i.lista_id) } },
    });
    await prisma.listaItem.updateMany({
      where: { midia_id: deId },
      data: { midia_id: paraId },
    });
  }
  // midia_genero (midia_id, genero_id)
  const gens = await prisma.midiaGenero.findMany({
    where: { midia_id: deId },
    select: { genero_id: true },
  });
  if (gens.length > 0) {
    await prisma.midiaGenero.deleteMany({
      where: { midia_id: paraId, genero_id: { in: gens.map((g) => g.genero_id) } },
    });
    await prisma.midiaGenero.updateMany({
      where: { midia_id: deId },
      data: { midia_id: paraId },
    });
  }
  // midia_streaming (midia_id, service_id)
  const strs = await prisma.midiaStreaming.findMany({
    where: { midia_id: deId },
    select: { service_id: true },
  });
  if (strs.length > 0) {
    await prisma.midiaStreaming.deleteMany({
      where: { midia_id: paraId, service_id: { in: strs.map((s) => s.service_id) } },
    });
    await prisma.midiaStreaming.updateMany({
      where: { midia_id: deId },
      data: { midia_id: paraId },
    });
  }
  // midia_franquia (midia_id, franquia_id)
  const franq = await prisma.midiaFranquia.findMany({
    where: { midia_id: deId },
    select: { franquia_id: true },
  });
  if (franq.length > 0) {
    await prisma.midiaFranquia.deleteMany({
      where: { midia_id: paraId, franquia_id: { in: franq.map((f) => f.franquia_id) } },
    });
    await prisma.midiaFranquia.updateMany({
      where: { midia_id: deId },
      data: { midia_id: paraId },
    });
  }
  // media_score (midia_id único) — o canônico não pode ter score duplicado
  await prisma.mediaScore.deleteMany({ where: { midia_id: paraId } });
  await prisma.mediaScore.updateMany({ where: { midia_id: deId }, data: { midia_id: paraId } });
  // media_score_view / notificacao (sem unique em midia_id)
  await prisma.mediaScoreView.updateMany({ where: { midia_id: deId }, data: { midia_id: paraId } });
  await prisma.notificacao.updateMany({ where: { midia_id: deId }, data: { midia_id: paraId } });
  // relacao_obra (origem_id / destino_id)
  await prisma.relacaoObra.updateMany({ where: { origem_id: deId }, data: { origem_id: paraId } });
  await prisma.relacaoObra.updateMany({
    where: { destino_id: deId },
    data: { destino_id: paraId },
  });

  const movidos =
    af.length + ints.length + wl.length + itens.length + gens.length + strs.length + franq.length;
  // Isola o órfão (flag deleted_at — preservado, nunca excluído aqui).
  await prisma.midia.update({
    where: { id: deId },
    data: { deleted_at: new Date(), score: null },
  });
  return { movidos, isolado: true };
}

/**
 * Corrige um registro divergente: se o id certo já tem registro → merge;
 * senão atualiza fonte_id no próprio registro (relações preservadas).
 */
export async function corrigirRegistro(
  prisma: PrismaClient,
  linha: Pick<LinhaAuditoria, "nome" | "idCurado" | "idIgdb">,
): Promise<{ acao: "merge" | "update" | "ok" | "pulado" }> {
  if (linha.idIgdb == null || linha.idIgdb === linha.idCurado) return { acao: "ok" };
  const idErrado = String(linha.idCurado);
  const idCerto = String(linha.idIgdb);
  const errada = await prisma.midia.findUnique({
    where: { fonte_fonte_id: { fonte: "igdb", fonte_id: idErrado } },
    select: { id: true, titulo: true },
  });
  if (!errada) return { acao: "pulado" };
  const certa = await prisma.midia.findUnique({
    where: { fonte_fonte_id: { fonte: "igdb", fonte_id: idCerto } },
    select: { id: true, titulo: true },
  });
  if (certa && certa.id !== errada.id) {
    const merge = await mesclarDuplicados(prisma, errada.id, certa.id);
    console.log(
      `[audit] MERGE: "${linha.nome}" ${idErrado} → ${idCerto} (movidos=${merge.movidos}, órfão isolado)`,
    );
    return { acao: "merge" };
  }
  await prisma.midia.update({
    where: { id: errada.id },
    data: { fonte_id: idCerto },
  });
  console.log(`[audit] UPDATE: "${linha.nome}" fonte_id ${idErrado} → ${idCerto}`);
  return { acao: "update" };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const aplicar = args.includes("--apply-db");
  const hardDelete = args.includes("--hard-delete-orphans");
  resetTokenTwitch();

  const prisma = new PrismaClient();
  const linhas: LinhaAuditoria[] = [];
  let divergencias = 0;
  let naoEncontrados = 0;
  let indisponiveis = 0;

  console.log("[audit] Consultando IGDB por slug/nome para cada game do seed…");
  for (const g of GAMES_CURADOS) {
    let linha: LinhaAuditoria = {
      nome: g.nome,
      slug: g.slug,
      idCurado: g.igdbId,
      idIgdb: null,
      status: "IGDB_INDISPONIVEL",
      nomeIgdb: null,
      slugIgdb: null,
    };
    const porSlug = await buscarIdPorSlug(g.slug);
    await delay(DELAY_MS);
    if (porSlug) {
      linha = {
        ...linha,
        idIgdb: porSlug.id,
        status: porSlug.id === g.igdbId ? "OK" : "DIVERGENCIA",
        nomeIgdb: null,
        slugIgdb: porSlug.slug,
      };
    } else {
      const candidatos = await buscarCandidatosPorNome(g.nome);
      await delay(DELAY_MS);
      if (candidatos === null) {
        linha.status = "IGDB_INDISPONIVEL";
      } else {
        const melhor = melhorCandidato(g.nome, candidatos);
        // D-265: só considera encontrado com casamento ESTRITO; o melhor
        // candidato é reportado para o Operador conferir manualmente.
        if (melhor?.id && nomeConfere(g.nome, melhor)) {
          linha = {
            ...linha,
            idIgdb: melhor.id,
            status: melhor.id === g.igdbId ? "OK" : "DIVERGENCIA",
            nomeIgdb: melhor.name ?? null,
            slugIgdb: melhor.slug ?? null,
          };
        } else {
          linha.status = "NAO_ENCONTRADO";
          linha.nomeIgdb = melhor?.name ?? null;
        }
      }
    }
    linhas.push(linha);
    if (linha.status === "DIVERGENCIA") divergencias++;
    if (linha.status === "NAO_ENCONTRADO") naoEncontrados++;
    if (linha.status === "IGDB_INDISPONIVEL") indisponiveis++;
  }

  const banco = await prisma.midia.findMany({
    where: { fonte: "igdb", tipo: "GAME", deleted_at: null },
    select: { id: true, titulo: true, fonte_id: true },
    orderBy: { titulo: "asc" },
  });

  const rec = reconciliarBanco(banco, linhas);

  // ---------- Relatório ----------
  console.log("\n=== AUDITORIA IGDB (T276/D-265) ===");
  console.log("seed | id_curado | id_igdb | status | nome_igdb | slug_igdb");
  for (const l of linhas) {
    console.log(
      `${l.nome} | ${l.idCurado} | ${l.idIgdb ?? "-"} | ${l.status} | ${l.nomeIgdb ?? "-"} | ${l.slugIgdb ?? "-"}`,
    );
  }
  console.log("\n=== RECONCILIAÇÃO SEED x BANCO ===");
  console.log(`seed: ${rec.totalSeed} | banco: ${rec.totalBanco}`);
  console.log(
    `órfãos: ${rec.orfaos.length} — ${rec.orfaos.map((o) => `${o.titulo} (${o.fonte_id})`).join(", ") || "nenhum"}`,
  );
  console.log(
    `faltando no banco: ${rec.faltando.length} — ${rec.faltando.map((f) => f.nome).join(", ") || "nenhum"}`,
  );

  if (!aplicar) {
    console.log(
      `\n[audit] RESUMO: ${linhas.length} games | ${divergencias} divergências | ${naoEncontrados} não encontrados | ${indisponiveis} IGDB indisponível | ${rec.orfaos.length} órfãos`,
    );
    console.log("[audit] Read-only. Rode com --apply-db para corrigir fonte_id/merge.");
    await prisma.$disconnect();
    process.exit(divergencias > 0 || rec.orfaos.length > 0 ? 1 : 0);
  }

  // ---------- Apply: correções por divergência + merge de órfãos ----------
  console.log("\n=== APLICANDO CORREÇÕES (--apply-db) ===");
  for (const l of linhas) {
    if (l.idIgdb != null && l.idIgdb !== l.idCurado) {
      const res = await corrigirRegistro(prisma, l);
      if (res.acao === "pulado") {
        console.log(`[audit] pulado (sem registro errado): "${l.nome}"`);
      }
    }
  }

  // Órfãos: merge para o jogo correspondente do seed (por título); senão
  // isola com flag (soft-delete) — exclusão dura só com aprovação explícita.
  for (const orfao of rec.orfaos) {
    const jogo = GAMES_CURADOS.find(
      (g) => normalizarTitulo(g.nome) === normalizarTitulo(orfao.titulo),
    );
    const linha = jogo ? linhas.find((l) => l.nome === jogo.nome) : undefined;
    if (linha?.idIgdb) {
      const res = await corrigirRegistro(prisma, {
        nome: orfao.titulo,
        idCurado: Number(orfao.fonte_id),
        idIgdb: linha.idIgdb,
      });
      if (res.acao === "merge" || res.acao === "update") continue;
    }
    if (hardDelete) {
      await prisma.midia.delete({ where: { id: orfao.id } });
      console.log(
        `[audit] ÓRFÃO EXCLUÍDO (--hard-delete-orphans): "${orfao.titulo}" (${orfao.fonte_id})`,
      );
    } else {
      await prisma.midia.update({
        where: { id: orfao.id },
        data: { deleted_at: new Date(), score: null },
      });
      console.log(
        `[audit] ÓRFÃO isolado (soft-delete): "${orfao.titulo}" (${orfao.fonte_id}, id=${orfao.id})`,
      );
    }
  }

  const pós = await prisma.midia.findMany({
    where: { fonte: "igdb", tipo: "GAME", deleted_at: null },
    select: { fonte_id: true },
  });
  console.log(
    `\n[audit] PÓS-APLICAÇÃO: banco com ${pós.length} games IGDB ativos (seed=${rec.totalSeed}).`,
  );
  console.log("[audit] Re-rode sem --apply-db para confirmar zero divergências.");
  await prisma.$disconnect();
}

const isDirectRun =
  import.meta.url === new URL(process.argv[1] ?? "", "file:").href ||
  process.argv[1]?.endsWith("audit-igdb-ids.ts");

if (isDirectRun) {
  main().catch((err) => {
    console.error("[audit] erro fatal:", err);
    process.exit(1);
  });
}
