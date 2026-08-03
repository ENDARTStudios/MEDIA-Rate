import { Injectable, Logger } from "@nestjs/common";
import type { FonteAdapter, NotaColetada } from "./adapters/fonte-adapter.interface.js";
import { TvmazeAdapter } from "./adapters/tvmaze.adapter.js";
import { OmdbAdapter } from "./adapters/omdb.adapter.js";
import { TraktAdapter } from "./adapters/trakt.adapter.js";
import { LetterboxdAdapter } from "./adapters/letterboxd.adapter.js";
import { RottenTomatoesAdapter } from "./adapters/rottentomatoes.adapter.js";
import { MetacriticAdapter } from "./adapters/metacritic.adapter.js";
import { OpenCriticAdapter } from "./adapters/opencritic.adapter.js";
import { SteamAdapter } from "./adapters/steam.adapter.js";
import { SteamSpyAdapter } from "./adapters/steamspy.adapter.js";
import { ImdbDatasetAdapter } from "./adapters/imdb-dataset.adapter.js";
import { RogerEbertAdapter } from "./adapters/rogerebert.adapter.js";
import { OpenLibraryAdapter } from "./adapters/openlibrary.adapter.js";
import { GoogleBooksAdapter } from "./adapters/googlebooks.adapter.js";
import { GoodreadsAdapter } from "./adapters/goodreads.adapter.js";
import { SkoobAdapter } from "./adapters/skoob.adapter.js";
import { LibraryThingAdapter } from "./adapters/librarything.adapter.js";
import { AmazonAdapter } from "./adapters/amazon.adapter.js";
import { ComicVineAdapter } from "./adapters/comicvine.adapter.js";
import { ComicBookRoundupAdapter } from "./adapters/comicbookroundup.adapter.js";
import { JikanAdapter } from "./adapters/jikan.adapter.js";
import { AniListAdapter } from "./adapters/anilist.adapter.js";
import { KitsuAdapter } from "./adapters/kitsu.adapter.js";
import { MangaDexAdapter } from "./adapters/mangadex.adapter.js";
import { AnimePlanetAdapter } from "./adapters/animeplanet.adapter.js";
import { TmdbAdapter } from "./adapters/tmdb.adapter.js";
import { IgdbAdapter } from "./adapters/igdb.adapter.js";
import { RawgAdapter } from "./adapters/rawg.adapter.js";
import type { ConsultaMedia } from "./adapters/fonte-adapter.interface.js";

export interface ResultadoColeta {
  fonte: string;
  status: "ok" | "pulada" | "erro";
  nota?: NotaColetada;
  motivo?: string;
}

@Injectable()
export class ColetaService {
  private readonly logger = new Logger(ColetaService.name);
  readonly adaptadores: FonteAdapter[] = [
    new TmdbAdapter(),
    new TvmazeAdapter(),
    new OmdbAdapter(),
    new TraktAdapter(),
    new LetterboxdAdapter(),
    new RottenTomatoesAdapter(),
    new MetacriticAdapter(),
    new IgdbAdapter("igdb"),
    new IgdbAdapter("igdb_publico"),
    new RawgAdapter(),
    new OpenCriticAdapter(),
    new SteamAdapter(),
    new SteamSpyAdapter(),
    new ImdbDatasetAdapter(),
    new RogerEbertAdapter(),
    new OpenLibraryAdapter(),
    new GoogleBooksAdapter(),
    new GoodreadsAdapter(),
    new SkoobAdapter(),
    new LibraryThingAdapter(),
    new AmazonAdapter(),
    new ComicVineAdapter(),
    new ComicBookRoundupAdapter(),
    new JikanAdapter(),
    new AniListAdapter(),
    new KitsuAdapter(),
    new MangaDexAdapter(),
    new AnimePlanetAdapter(),
  ];

  /** Coleta paralela com tolerância total a falhas — nunca lança. */
  async coletarTudo(consulta: ConsultaMedia): Promise<ResultadoColeta[]> {
    const promessas = this.adaptadores
      .filter((a) => a.atendeTipo(consulta.tipo))
      .map(async (a): Promise<ResultadoColeta> => {
        if (!a.ativo()) return { fonte: a.id, status: "pulada", motivo: "inativa" };
        try {
          const notas = await a.coletar(consulta);
          const nota = notas[0];
          if (!nota) return { fonte: a.id, status: "pulada", motivo: "sem nota" };
          return { fonte: a.id, status: "ok", nota };
        } catch (err) {
          this.logger.warn(`Falha em ${a.id}: ${String(err)}`);
          return { fonte: a.id, status: "erro", motivo: String(err) };
        }
      });
    return Promise.all(promessas);
  }
}
