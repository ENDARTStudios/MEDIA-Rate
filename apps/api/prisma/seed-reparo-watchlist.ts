/* eslint-disable no-console */
// T310 — REPARO NÃO-DESTRUTIVO da watchlist em produção.
//
// O que faz (upsert/re-link apenas — NUNCA exclui watchlist_entry de usuário):
//  1) Entradas com midia_id não-UUID (id externo TMDB/IGDB, ex.: '124364',
//     'g4') → procura a mídia canônica por fonte_id e RE-LIGA a entrada ao
//     UUID canônico (se o usuário ainda não tiver essa mídia — @@unique).
//  2) Conta e reporta por causa: re-linkadas, sem match (ficam p/ fallback UI),
//     colisões (usuário já tem o canônico), órfãs UUID inexistentes.
//
// Uso (via tunnel, como db:provision:test-users — NUNCA db:seed):
//   npm run db:reparo:watchlist
import { PrismaClient } from "@prisma/client";
import { bootstrapRlsSeed } from "../src/common/rls-context.js";

const prisma = new PrismaClient();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface EntryRow {
  id: string;
  usuario_id: string;
  midia_id: string;
}

async function main(): Promise<void> {
  await bootstrapRlsSeed(prisma);

  const entries = await prisma.$queryRawUnsafe<EntryRow[]>(
    `SELECT id, usuario_id, midia_id FROM watchlist_entry`,
  );
  console.log(`[t310-reparo] total entries=${entries.length}`);

  const naoUuid = entries.filter((e) => !UUID_RE.test(e.midia_id));
  const orfas = entries.filter((e) => UUID_RE.test(e.midia_id));

  // 1) Re-link por fonte_id das entradas não-UUID.
  const porFonte = new Map<string, { id: string }>();
  const idsExternos = [...new Set(naoUuid.map((e) => e.midia_id))];
  if (idsExternos.length > 0) {
    const inList = idsExternos.map((id) => `'${id}'`).join(",");
    const matches = await prisma.$queryRawUnsafe<{ fonte_id: string; id: string }[]>(
      `SELECT fonte_id, id FROM midia WHERE fonte_id IN (${inList}) AND deleted_at IS NULL`,
    );
    for (const m of matches) porFonte.set(m.fonte_id, m);
  }

  let relinkadas = 0;
  let colisoes = 0;
  let semMatch = 0;
  for (const e of naoUuid) {
    const canonica = porFonte.get(e.midia_id);
    if (!canonica) {
      semMatch++;
      continue;
    }
    // Colisão: usuário já tem o canônico na watchlist (@@unique).
    const existe = await prisma.watchlistEntry.findFirst({
      where: { usuario_id: e.usuario_id, midia_id: canonica.id },
      select: { id: true },
    });
    if (existe) {
      colisoes++;
      continue;
    }
    await prisma.watchlistEntry.update({
      where: { id: e.id },
      data: { midia_id: canonica.id },
    });
    relinkadas++;
  }

  // 2) Órfãs UUID: verifica quais não existem mais (só reporta — fallback UI).
  const uuidIds = [...new Set(orfas.map((e) => e.midia_id))];
  let orfasInexistentes = 0;
  if (uuidIds.length > 0) {
    const inList = uuidIds.map((id) => `'${id}'`).join(",");
    const existentes = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM midia WHERE id IN (${inList})`,
    );
    orfasInexistentes = uuidIds.length - existentes.length;
  }

  console.log(`[t310-reparo] re-linkadas (fonte_id -> canônica): ${relinkadas}`);
  console.log(`[t310-reparo] sem match (ficam p/ fallback UI): ${semMatch}`);
  console.log(`[t310-reparo] colisões (usuário já tem o canônico): ${colisoes}`);
  console.log(`[t310-reparo] órfãs UUID inexistentes (fallback UI): ${orfasInexistentes}`);
  console.log("[t310-reparo] Concluído (nenhuma entrada de usuário excluída).");
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("[t310-reparo] erro fatal:", String(err).slice(0, 500));
  await prisma.$disconnect();
  process.exit(1);
});
