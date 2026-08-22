/* eslint-disable */
// seed-fix-bg3-poster.ts (T407) — o pôster de Baldur's Gate 3 apontava para
// uma imagem Wikipedia REMOVIDA (404 no _next/image). Re-busca a capa no
// IGDB (fonte canônica de games) e ATUALIZA a mídia (update forçado, não
// só-null). Idempotente: se a nova URL for igual, nada muda.
import { PrismaClient } from "@prisma/client";
import { bootstrapRlsSeed } from "../src/common/rls-context.js";
import { postApigql, obterTokenTwitch } from "./igdb-http.js";

// (não importa de seed-posters.js: aquele módulo executa main() no import.)
function urlSegura(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const u = raw.startsWith("//") ? `https:${raw}` : raw;
  if (!/^https:\/\//.test(u)) return null;
  return u;
}

const prisma = new PrismaClient();
const BG3_IGDB_ID = "119171";

interface IgdbGame {
  id?: number;
  cover?: number | { id?: number };
}

interface IgdbCover {
  id?: number;
  url?: string;
}

async function capaIgdb(gameId: string): Promise<string | null> {
  const token = await obterTokenTwitch();
  if (!token) return null;
  const headers = {
    "client-id": process.env.TWITCH_CLIENT_ID ?? "",
    authorization: `Bearer ${token}`,
  };
  const games = await postApigql<IgdbGame[]>(
    "https://api.igdb.com/v4/games",
    `fields cover; where id = ${gameId};`,
    headers,
  );
  const cover = games?.[0]?.cover;
  const coverId = typeof cover === "number" ? cover : cover?.id;
  if (!coverId) return null;
  const covers = await postApigql<IgdbCover[]>(
    "https://api.igdb.com/v4/covers",
    `fields url; where id = ${coverId};`,
    headers,
  );
  const coverObj = covers?.find((c) => c.id === coverId) ?? covers?.[0];
  return urlSegura(coverObj?.url?.replace("t_thumb", "t_cover_big"));
}

async function main(): Promise<void> {
  await bootstrapRlsSeed(prisma);
  const midia = await prisma.midia.findFirst({
    where: { fonte: "igdb", fonte_id: BG3_IGDB_ID, deleted_at: null },
    select: { id: true, titulo: true, imagem_url: true },
  });
  if (!midia) {
    console.warn("[bg3-poster] midia BG3 nao encontrada (fonte igdb id 119171)");
    return;
  }
  console.log(`[bg3-poster] atual=${midia.imagem_url ?? "null"}`);

  const nova = await capaIgdb(BG3_IGDB_ID);
  if (!nova) {
    console.error("[bg3-poster] IGDB nao devolveu capa (token/credenciais?)");
    process.exitCode = 1;
    return;
  }
  console.log(`[bg3-poster] nova=${nova}`);

  await prisma.midia.update({
    where: { id: midia.id },
    data: { imagem_url: nova },
  });
  console.log(`[bg3-poster] atualizado: ${midia.titulo}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
