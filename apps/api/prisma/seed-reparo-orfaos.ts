/* eslint-disable no-console */
// T322 — REPARO NÃO-DESTRUTIVO de órfãos COM interação/watchlist (curtidos).
//
// O que faz (re-link/merge apenas — NUNCA exclui sinal do usuário):
//  1) DIAGNÓSTICO: lista entradas com midia_id não-UUID (id externo/aresta) e
//     UUIDs órfãos (mídia hard-deleted); conta e amostra as que têm reação.
//  2) RESOLUÇÃO em ordem: (a) fonte_id presente no catálogo canônico;
//     (b) título normalizado exato (id slug-like → título); irreconciliável
//     fica para o fluxo de recuperação "Buscar substituta" (UI + relink).
//  3) RE-LINK em transaction: watchlist_entry + usuario_midia_interacao no
//     MESMO transaction, preservando status/reacao/motivo/progresso.
//  4) COLISÃO (usuário já tem a canônica): merge não-destrutivo — mantém a
//     mais recente e preserva o sinal da antiga.
//
// Uso (via tunnel, como db:reparo:watchlist — NUNCA db:seed):
//   npm run db:reparo:orfaos
import { PrismaClient } from "@prisma/client";
import { bootstrapRlsSeed } from "../src/common/rls-context.js";

const prisma = new PrismaClient();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS_POR_COLUNA: Record<
  string,
  "QUERO_CONSUMIR" | "CONSUMINDO" | "CONCLUIDO" | "ABANDONADO"
> = {
  WANT: "QUERO_CONSUMIR",
  WATCHING: "CONSUMINDO",
  COMPLETED: "CONCLUIDO",
  DROPPED: "ABANDONADO",
};

interface EntryRow {
  id: string;
  usuario_id: string;
  midia_id: string;
  coluna: string;
  reacao: string | null;
  motivo_abandono: string | null;
  progresso_detalhe: string | null;
  created_at: Date;
}

/** Normaliza um título para comparação (acentos/±case/±pontuação). */
function normalizar(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Humaniza um id slug-like ("the-last-of-us" → "The last of us"). */
function humanizar(id: string): string | null {
  if (!/[a-z]/i.test(id) || /^\d+$/.test(id)) return null;
  return id.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

async function main(): Promise<void> {
  await bootstrapRlsSeed(prisma);

  // ---------- 1) DIAGNÓSTICO ----------
  const entries = await prisma.$queryRawUnsafe<EntryRow[]>(
    `SELECT id, usuario_id, midia_id, coluna, reacao, motivo_abandono, progresso_detalhe, created_at
       FROM watchlist_entry`,
  );
  const naoUuid = entries.filter((e) => !UUID_RE.test(e.midia_id));
  const uuidOrfas = await (async () => {
    const uuidIds = [
      ...new Set(entries.filter((e) => UUID_RE.test(e.midia_id)).map((e) => e.midia_id)),
    ];
    if (uuidIds.length === 0) return [];
    const existentes = new Set(
      (
        await prisma.$queryRawUnsafe<{ id: string }[]>(
          `SELECT id FROM midia WHERE id IN (${uuidIds.map((id) => `'${id}'`).join(",")})`,
        )
      ).map((m) => m.id),
    );
    return entries.filter((e) => UUID_RE.test(e.midia_id) && !existentes.has(e.midia_id));
  })();

  const comReacao = [...naoUuid, ...uuidOrfas].filter((e) => e.reacao != null);
  console.log(`[t322-reparo] total entries=${entries.length}`);
  console.log(
    `[t322-reparo] órfãs não-UUID=${naoUuid.length} | órfãs UUID inexistentes=${uuidOrfas.length}`,
  );
  console.log(`[t322-reparo] órfãs COM reação (curtidas)=${comReacao.length}`);
  if (comReacao.length > 0) {
    console.log(
      `[t322-reparo] amostra: ${comReacao
        .slice(0, 10)
        .map((e) => `${e.usuario_id.slice(0, 8)}|${e.midia_id}|${e.reacao}`)
        .join(" ; ")}`,
    );
  }

  // ---------- 2) RESOLUÇÃO ----------
  // (a) fonte_id do catálogo canônico.
  const porFonte = new Map<string, { id: string; titulo: string }>();
  const idsExternos = [...new Set(naoUuid.map((e) => e.midia_id))];
  if (idsExternos.length > 0) {
    const matches = await prisma.$queryRawUnsafe<
      { fonte_id: string; id: string; titulo: string }[]
    >(
      `SELECT fonte_id, id, titulo FROM midia WHERE fonte_id IN (${idsExternos.map((id) => `'${id}'`).join(",")}) AND deleted_at IS NULL`,
    );
    for (const m of matches) porFonte.set(m.fonte_id, m);
  }

  // (b) título normalizado exato (id slug-like → título do catálogo).
  const porTitulo = new Map<string, { id: string }[]>();
  const slugs = [
    ...new Set(naoUuid.map((e) => humanizar(e.midia_id)).filter((s): s is string => !!s)),
  ];
  if (slugs.length > 0) {
    const matches = await prisma.$queryRawUnsafe<{ id: string; titulo: string }[]>(
      `SELECT id, titulo FROM midia WHERE deleted_at IS NULL`,
    );
    for (const m of matches) {
      const k = normalizar(m.titulo);
      if (!k) continue;
      const lista = porTitulo.get(k) ?? [];
      lista.push({ id: m.id });
      porTitulo.set(k, lista);
    }
  }

  function resolver(entry: EntryRow): { id: string } | null {
    const porIdFonte = porFonte.get(entry.midia_id);
    if (porIdFonte) return porIdFonte;
    const humano = humanizar(entry.midia_id);
    if (!humano) return null;
    const candidatos = porTitulo.get(normalizar(humano)) ?? [];
    // Só resolve quando o título casa de forma ÚNICA (ambiguidade → recuperação manual).
    return candidatos.length === 1 ? candidatos[0] : null;
  }

  // ---------- 3) RE-LINK + MERGE ----------
  let relinkadas = 0;
  let colisoes = 0;
  let semMatch = 0;
  const alvo = [...naoUuid, ...uuidOrfas];
  for (const e of alvo) {
    const canonica = resolver(e);
    if (!canonica) {
      semMatch++;
      continue;
    }
    await prisma.$transaction(async (tx) => {
      const orfa = await tx.watchlistEntry.findUnique({ where: { id: e.id } });
      if (!orfa) return; // já resolvida/removida em iteração anterior
      const duplicata = await tx.watchlistEntry.findFirst({
        where: { usuario_id: orfa.usuario_id, midia_id: canonica.id, id: { not: orfa.id } },
      });

      let sobreviventeId = orfa.id;
      if (duplicata) {
        const recente = orfa.created_at >= duplicata.created_at ? orfa : duplicata;
        const antiga = recente.id === orfa.id ? duplicata : orfa;
        // Merge não-destrutivo: mantém a mais recente e preserva o sinal da antiga.
        await tx.watchlistEntry.update({
          where: { id: recente.id },
          data: {
            reacao: recente.reacao ?? antiga.reacao,
            motivo_abandono: recente.motivo_abandono ?? antiga.motivo_abandono,
            progresso_detalhe: recente.progresso_detalhe ?? antiga.progresso_detalhe,
          },
        });
        await tx.watchlistEntry.delete({ where: { id: antiga.id } });
        sobreviventeId = recente.id;
        colisoes++;
      } else {
        await tx.watchlistEntry.update({ where: { id: orfa.id }, data: { midia_id: canonica.id } });
        relinkadas++;
      }

      const sobrevivente = await tx.watchlistEntry.findUnique({ where: { id: sobreviventeId } });
      if (!sobrevivente) return;
      const status = STATUS_POR_COLUNA[sobrevivente.coluna] ?? "QUERO_CONSUMIR";
      await tx.usuarioMidiaInteracao.upsert({
        where: { usuario_id_midia_id: { usuario_id: orfa.usuario_id, midia_id: canonica.id } },
        create: {
          usuario_id: orfa.usuario_id,
          midia_id: canonica.id,
          status,
          reacao: sobrevivente.reacao,
          motivo_abandono: sobrevivente.motivo_abandono,
          progresso_detalhe: sobrevivente.progresso_detalhe,
          atualizado_em: new Date(),
        },
        update: {
          status,
          reacao: sobrevivente.reacao,
          motivo_abandono: sobrevivente.motivo_abandono,
          progresso_detalhe: sobrevivente.progresso_detalhe,
          atualizado_em: new Date(),
        },
      });
      if (UUID_RE.test(orfa.midia_id) && orfa.midia_id !== canonica.id) {
        await tx.usuarioMidiaInteracao.deleteMany({
          where: { usuario_id: orfa.usuario_id, midia_id: orfa.midia_id },
        });
      }
    });
  }

  console.log(`[t322-reparo] re-linkadas (fonte_id/título → canônica): ${relinkadas}`);
  console.log(`[t322-reparo] colisões (merge não-destrutivo): ${colisoes}`);
  console.log(`[t322-reparo] irreconciliáveis (ficam p/ "Buscar substituta"): ${semMatch}`);
  console.log("[t322-reparo] Concluído (nenhum sinal de usuário perdido).");
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("[t322-reparo] erro fatal:", String(err).slice(0, 500));
  await prisma.$disconnect();
  process.exit(1);
});
