/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { OpenLibraryAdapter } from "../src/modules/media-score/adapters/openlibrary.adapter.js";
import { AmazonAdapter } from "../src/modules/media-score/adapters/amazon.adapter.js";
import { AnimePlanetAdapter } from "../src/modules/media-score/adapters/animeplanet.adapter.js";
import { GoodreadsAdapter } from "../src/modules/media-score/adapters/goodreads.adapter.js";
import { ComicBookRoundupAdapter } from "../src/modules/media-score/adapters/comicbookroundup.adapter.js";
import { LibraryThingAdapter } from "../src/modules/media-score/adapters/librarything.adapter.js";
import { SkoobAdapter } from "../src/modules/media-score/adapters/skoob.adapter.js";
import { BackfillService } from "../src/modules/admin/backfill.service.js";

/**
 * T-DADOS-14A — o OpenLibrary (API aberta, sem scraping) foi liberado do gate
 * de preparação por decisão do Operador. Os 6 scrapers do mesmo grupo
 * continuam exigindo MEDIA_PREPARACAO_ENABLED=true.
 */

describe("T-DADOS-14A — gate de preparação", () => {
  const envOriginal = process.env.MEDIA_PREPARACAO_ENABLED;

  beforeEach(() => {
    delete process.env.MEDIA_PREPARACAO_ENABLED;
  });

  afterEach(() => {
    if (envOriginal === undefined) delete process.env.MEDIA_PREPARACAO_ENABLED;
    else process.env.MEDIA_PREPARACAO_ENABLED = envOriginal;
  });

  it("OpenLibrary ativo SEM a env (API aberta; nenhuma preparação necessária)", () => {
    expect(process.env.MEDIA_PREPARACAO_ENABLED).toBeUndefined();
    expect(new OpenLibraryAdapter().ativo()).toBe(true);
    // Continua atendendo LIVRO.
    expect(new OpenLibraryAdapter().atendeTipo("LIVRO")).toBe(true);
  });

  it("os 6 scrapers do grupo continuam gateados SEM a env", () => {
    const gateados = [
      new AmazonAdapter(),
      new AnimePlanetAdapter(),
      new GoodreadsAdapter(),
      new ComicBookRoundupAdapter(),
      new LibraryThingAdapter(),
      new SkoobAdapter(),
    ];
    expect(gateados.map((a) => a.id)).toEqual([
      "amazon",
      "animeplanet",
      "goodreads",
      "comicbookroundup",
      "librarything",
      "skoob",
    ]);
    for (const adapter of gateados) {
      expect(adapter.ativo()).toBe(false);
    }
  });

  it("fila avaliacaoLivros conta pendências quando o adapter está ativo", async () => {
    const prisma = {
      $queryRawUnsafe: vi.fn(async (sql: string) => {
        if (/pg_database_size/.test(sql)) return [{ bytes: 100000000n }];
        // T-DADOS-14B: orçamento do Google Books (não interfere nesta fila).
        if (/sinopse_livro_em::date = CURRENT_DATE/i.test(sql)) return [{ usados: 0 }];
        if (/sinopse_livros/.test(sql)) {
          return [{ sem_elenco: 0, avaliacao_livros: 600, sinopse_livros: 0 }];
        }
        return [];
      }),
    };
    const coleta = { adaptadores: [new OpenLibraryAdapter()] };
    const svc = new BackfillService(
      prisma as any,
      { recalcularEPersistir: vi.fn() } as any,
      coleta as any,
    );
    await expect(svc.contarPendentes()).resolves.toMatchObject({ avaliacaoLivros: 600 });
    expect(
      (prisma.$queryRawUnsafe as any).mock.calls.some(([sql]: [string]) =>
        /avaliacoes_atualizadas_em IS NULL/.test(sql),
      ),
    ).toBe(true);
  });
});
