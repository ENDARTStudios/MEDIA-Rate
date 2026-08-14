/* eslint-disable no-console */
// T320/D-309 — REPARO IDEMPOTENTE: alinha coluna↔status da watchlist em
// produção (fonte única de verdade). NUNCA exclui entries/interações.
// Uso (via tunnel — NUNCA db:seed):
//   npm run db:reparo:status-coluna
import { PrismaClient, type StatusConsumo } from "@prisma/client";
import { bootstrapRlsSeed } from "../src/common/rls-context.js";

const prisma = new PrismaClient();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS_PARA_COLUNA: Record<StatusConsumo, "WANT" | "WATCHING" | "COMPLETED" | "DROPPED"> = {
  QUERO_CONSUMIR: "WANT",
  CONSUMINDO: "WATCHING",
  CONCLUIDO: "COMPLETED",
  ABANDONADO: "DROPPED",
};
const COLUNA_PARA_STATUS: Record<"WANT" | "WATCHING" | "COMPLETED" | "DROPPED", StatusConsumo> = {
  WANT: "QUERO_CONSUMIR",
  WATCHING: "CONSUMINDO",
  COMPLETED: "CONCLUIDO",
  DROPPED: "ABANDONADO",
};

interface EntryRow {
  id: string;
  usuario_id: string;
  midia_id: string;
  coluna: "WANT" | "WATCHING" | "COMPLETED" | "DROPPED";
}

async function main(): Promise<void> {
  await bootstrapRlsSeed(prisma);
  const entries = await prisma.$queryRawUnsafe<EntryRow[]>(
    `SELECT id, usuario_id, midia_id, coluna FROM watchlist_entry`,
  );
  console.log(`[t320-reparo] total entries=${entries.length}`);

  let alinhadasColuna = 0;
  let interacoesCriadas = 0;
  let puladas = 0;
  for (const e of entries) {
    if (!UUID_RE.test(e.midia_id)) {
      puladas++; // id externo/órfã — sem interação possível (fallback T310)
      continue;
    }
    const inter = await prisma.usuarioMidiaInteracao.findUnique({
      where: { usuario_id_midia_id: { usuario_id: e.usuario_id, midia_id: e.midia_id } },
      select: { status: true },
    });
    if (inter) {
      const colunaEsperada = STATUS_PARA_COLUNA[inter.status];
      if (colunaEsperada !== e.coluna) {
        await prisma.watchlistEntry.update({
          where: { id: e.id },
          data: { coluna: colunaEsperada },
        });
        alinhadasColuna++;
      }
    } else {
      // Sem interação: cria com o status derivado da coluna (fonte única).
      // Guarda contra órfãos (UUID que não existe em midia → FK violada).
      const midiaExiste = await prisma.midia.findUnique({
        where: { id: e.midia_id },
        select: { id: true },
      });
      if (!midiaExiste) {
        puladas++; // órfã — fallback UI (T310)
        continue;
      }
      await prisma.usuarioMidiaInteracao.create({
        data: {
          usuario_id: e.usuario_id,
          midia_id: e.midia_id,
          status: COLUNA_PARA_STATUS[e.coluna],
          atualizado_em: new Date(),
        },
      });
      interacoesCriadas++;
    }
  }

  console.log(`[t320-reparo] colunas alinhadas ao status: ${alinhadasColuna}`);
  console.log(`[t320-reparo] interações criadas (derivadas da coluna): ${interacoesCriadas}`);
  console.log(`[t320-reparo] entradas puladas (midia_id não-UUID, fallback UI): ${puladas}`);
  console.log("[t320-reparo] Concluído (nenhuma exclusão).");
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("[t320-reparo] erro fatal:", String(err).slice(0, 500));
  await prisma.$disconnect();
  process.exit(1);
});
