/* eslint-disable no-console */
/**
 * Seed de origem da produção (Addendum 2 §5) — preenche `midia.pais_origem`
 * a partir do `origin_country` do TMDB (discover de séries), sem apagar
 * mídias. Filmes não têm country no discover — ficam null (⚠️ na UI).
 *
 * Uso: DATABASE_URL=... TMDB_API_KEY=... npx tsx prisma/seed-origem.ts
 */
import { PrismaClient } from "@prisma/client";
import { redigirErro, redigirTexto } from "../src/common/log-redactor.js";

const prisma = new PrismaClient();

const TMDB_BASE = "https://api.themoviedb.org/3";

interface TmdbItem {
  id: number;
  origin_country?: string[];
}

export async function fetchTmdb<T>(path: string): Promise<T> {
  const res = await fetch(`${TMDB_BASE}${path}`, {
    headers: { accept: "application/json" },
  });
  // T193: o path carrega `api_key=` na query — a mensagem de erro passa pelo
  // redator (defesa em profundidade; o catch de `executar` também redige).
  if (!res.ok) throw new Error(redigirTexto(`TMDB ${res.status}: ${path}`));
  return (await res.json()) as T;
}

export async function main(): Promise<void> {
  let atualizadas = 0;
  for (let pagina = 1; pagina <= 10; pagina++) {
    const data = await fetchTmdb<{ results: TmdbItem[] }>(
      `/discover/tv?sort_by=popularity.desc&with_original_language=en|ja|ko|es|pt|fr|de&page=${pagina}&api_key=${process.env.TMDB_API_KEY ?? ""}`,
    );
    for (const item of data.results) {
      const pais = item.origin_country?.[0];
      if (!pais) continue;
      const r = await prisma.midia.updateMany({
        where: { fonte: "tmdb_tv", fonte_id: String(item.id), pais_origem: null },
        data: { pais_origem: pais },
      });
      atualizadas += r.count;
    }
    if (data.results.length === 0) break;
  }
  console.log(`[seed:origem] ${atualizadas} séries com país de origem preenchido.`);
}

/**
 * Executa o seed com logging sanitizado (T193): erro sai como nome+mensagem
 * redigidos — nunca o objeto/stack completo com a chave da URL.
 */
export async function executar(): Promise<void> {
  try {
    await main();
  } catch (e) {
    console.error(`[seed:origem] falhou: ${redigirErro(e)}`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

const isDirectRun =
  import.meta.url === new URL(process.argv[1] ?? "", "file:").href ||
  process.argv[1]?.endsWith("seed-origem.ts");

if (isDirectRun) void executar();
