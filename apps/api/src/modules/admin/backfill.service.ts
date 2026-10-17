/* eslint-disable @typescript-eslint/no-explicit-any -- payloads externos do TMDB
   (JSON sem tipo publicado) e linhas de $queryRawUnsafe; validados nos mappers
   puros (backfill-service.spec) antes de qualquer escrita. */
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { UA_BROWSER } from "../media-score/adapters/http.utils.js";
import { fetchJson, postJson } from "../media-score/adapters/http.utils.js";
import { estatisticas } from "../media-score/adapters/fonte-adapter.interface.js";
import { MediaScoreService } from "../media-score/media-score.service.js";
import { ColetaService } from "../media-score/coleta.service.js";
import type { ClassificacaoIndicativa } from "@prisma/client";

/**
 * D-576 — backfills pesados como jobs EM PROCESSO (padrão T4.7): paginação de
 * 25/batch, guard de disco (D-574), estado em memória por job e upserts
 * idempotentes. Disparado por rotas admin (POST) — imune a OOM de processos
 * externos e a redeploys (o limite por execução bounda o tempo; re-disparar
 * avança porque os alvos são filtrados por lacuna: sem elenco / sem país /
 * sem temporada).
 */

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p";
const PAUSA_MS = 220;
const MAX_TEMPORADAS_POR_RUN = 1500;
// T-DADOS-03: o IGDB devolve 429 em rajada (~22 requisições medidas em
// produção) — throttle obrigatório e uma única retentativa com espera longa.
const IGDB_URL = "https://api.igdb.com/v4/games";
const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const PAUSA_IGDB_MS = 300;
const ESPERA_429_MS = 1500;
// T-DADOS-07: OpenLibrary é API aberta e educada — throttle mínimo entre títulos.
const PAUSA_OPENLIBRARY_MS = 250;
// T-DADOS-10: OMDb é grátis e limitado (1k/dia) — throttle mínimo por título.
const PAUSA_OMDB_MS = 300;

export type BackfillTipo =
  | "metadados"
  | "continuidade"
  | "metadadosRicos"
  | "provedores"
  | "criticaIgdb"
  // T-DADOS-06: arestas SEQUENCIA_DE nas franquias incompletas (deriva do grafo).
  | "arestasFranquia"
  // T-DADOS-07: notas públicas de livros no OpenLibrary (por id do work).
  | "avaliacaoLivros"
  // T-DADOS-09: gêneros de games no IGDB (por id; 23 slugs do /v4/genres).
  | "generosGames"
  // T-DADOS-08: localização (sinopse/título en/es) e classificação do TMDB.
  | "localizacao"
  // T-DADOS-10: crítica (RT/Metacritic/IMDb) via OMDb por id IMDb.
  | "criticaOmdb";

interface BackfillEstado {
  executando: boolean;
  processados: number;
  ok: number;
  falhas: number;
  iniciadoEm: string | null;
  atual: string | null;
}

function estadoVazio(): BackfillEstado {
  return {
    executando: false,
    processados: 0,
    ok: 0,
    falhas: 0,
    iniciadoEm: null,
    atual: null,
  };
}

// ===========================================================================
// Mappers puros (portados dos scripts T164/T165 e testados)
// ===========================================================================

/**
 * T180: limites das colunas do schema (midia_elenco.nome 120,
 * .personagem 160; midia_produtora.nome 160). O TMDB devolve `character`
 * com até ~300 chars (créditos multi-papel: "A / B / C / ...") — sem
 * truncar, o upsert falha com P2000 e o título fica preso na fila.
 */
export function truncarCampo(valor: string | null | undefined, max: number): string | null {
  if (valor == null) return null;
  const s = String(valor).trim();
  if (!s) return null;
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

export const LIMITES = {
  elencoNome: 120,
  elencoPersonagem: 160,
  produtoraNome: 160,
  // T-DADOS-01: genero.nome/slug são VarChar(64) UNIQUE; franquia.slug VarChar(64)
  // UNIQUE; franquia.nome VarChar(120).
  generoNome: 64,
  generoSlug: 64,
  franquiaSlug: 64,
  franquiaNome: 120,
  // T-DADOS-02: streaming_service.nome/slug são VarChar(128) UNIQUE.
  provedorNome: 128,
  provedorSlug: 128,
} as const;

export function slugifyBasico(titulo: string): string {
  return String(titulo ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 240);
}

export function slugBaseFranquia(nome: string): string {
  return slugifyBasico(nome).replace(/-(colecao|collection)$/, "");
}

export interface ElencoItem {
  fonte: string;
  fonte_id: string;
  nome: string;
  personagem: string | null;
  ordem: number;
  foto_url: string | null;
}

export interface EmpresaItem {
  fonte_id: string;
  nome: string;
  papel: "PRODUTORA" | "ESTUDIO" | "NETWORK";
}

export interface MetadadosTmdb {
  elenco: ElencoItem[];
  produtoras: EmpresaItem[];
  backdrop_url: string | null;
  pais_origem: string | null;
  // T-DADOS-01 — mesmos campos do MESMO payload (nenhuma chamada extra).
  duracao_minutos: number | null;
  generos: GeneroItem[];
  colecao: ColecaoItem | null;
}

/** T-DADOS-01: gênero do `genres[]` do TMDB (payload já vem em pt-BR). */
export interface GeneroItem {
  tmdb_id: number;
  nome: string;
}

/** T-DADOS-01: coleção/franquia do `belongs_to_collection` (só FILME). */
export interface ColecaoItem {
  tmdb_id: number;
  nome: string;
}

/** Inteiro positivo ou null (runtime do TMDB chega 0/ausente para alguns títulos). */
function duracaoValida(valor: unknown): number | null {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * T-DADOS-01: `genres[]` → lista saneada (tmdb_id inteiro > 0, nome truncado em
 * 64 = VarChar(64) da coluna, sem duplicatas). Entrada inválida é ignorada.
 */
export function mapearGeneros(payload: any): GeneroItem[] {
  const saida: GeneroItem[] = [];
  const vistos = new Set<number>();
  for (const g of payload?.genres ?? []) {
    const tmdb_id = Number(g?.id);
    if (!Number.isInteger(tmdb_id) || tmdb_id <= 0 || vistos.has(tmdb_id)) continue;
    const nome = truncarCampo(g?.name, LIMITES.generoNome);
    if (!nome) continue;
    vistos.add(tmdb_id);
    saida.push({ tmdb_id, nome });
  }
  return saida;
}

/**
 * T-DADOS-01: `belongs_to_collection` → {tmdb_id, nome}. Exclusivo de FILME: a
 * rota /tv não devolve esse campo (por isso o guard de tipo explícito).
 */
export function mapearColecao(payload: any, tipo: "FILME" | "SERIE"): ColecaoItem | null {
  if (tipo !== "FILME") return null;
  const tmdb_id = Number(payload?.belongs_to_collection?.id);
  const nome = truncarCampo(payload?.belongs_to_collection?.name, LIMITES.franquiaNome);
  if (!Number.isInteger(tmdb_id) || tmdb_id <= 0 || !nome) return null;
  return { tmdb_id, nome };
}

/** Payload /movie|/tv com append_to_response=credits → metadados ricos. */
export function mapearMetadados(payload: any, tipo: "FILME" | "SERIE"): MetadadosTmdb {
  const cast: any[] =
    tipo === "SERIE"
      ? (payload.aggregate_credits?.cast ?? payload.credits?.cast ?? [])
      : (payload.credits?.cast ?? []);
  const elenco = cast.slice(0, 15).map((a, i) => ({
    fonte: "tmdb",
    fonte_id: String(a.id),
    nome: truncarCampo(String(a.name ?? ""), LIMITES.elencoNome) ?? "",
    personagem: truncarCampo(
      a.roles?.[0]?.character ?? a.character ?? null,
      LIMITES.elencoPersonagem,
    ),
    ordem: a.order ?? i,
    foto_url: a.profile_path ? `${IMG}/w185${a.profile_path}` : null,
  }));
  const empresas: EmpresaItem[] = [];
  const vistas = new Set<string>();
  for (const c of payload.production_companies ?? []) {
    if (!c?.name || vistas.has(String(c.id))) continue;
    vistas.add(String(c.id));
    empresas.push({
      fonte_id: String(c.id),
      nome: truncarCampo(c.name, LIMITES.produtoraNome) ?? "",
      papel: "PRODUTORA",
    });
  }
  for (const n of payload.networks ?? []) {
    if (!n?.name || vistas.has(String(n.id))) continue;
    vistas.add(String(n.id));
    empresas.push({
      fonte_id: String(n.id),
      nome: truncarCampo(n.name, LIMITES.produtoraNome) ?? "",
      papel: "NETWORK",
    });
  }
  return {
    elenco: elenco.filter((a) => a.nome),
    produtoras: empresas,
    backdrop_url: payload.backdrop_path ? `${IMG}/w1280${payload.backdrop_path}` : null,
    pais_origem:
      payload.production_countries?.[0]?.iso_3166_1 ?? payload.origin_country?.[0] ?? null,
    // T-DADOS-01 — duração/gêneros/coleção do mesmo payload (sem chamada extra).
    duracao_minutos:
      tipo === "SERIE"
        ? duracaoValida(payload.episode_run_time?.[0])
        : duracaoValida(payload.runtime),
    generos: mapearGeneros(payload),
    colecao: mapearColecao(payload, tipo),
  };
}

export interface ParteColecao {
  id: number;
  release_date: string | null;
}

/**
 * T-DADOS-01: partes de uma coleção TMDB na ordem de lançamento REAL
 * (`release_date` ISO crescente). Data vazia/ausente vai para o FIM (sort
 * estável preserva a ordem relativa de entrada) — nunca inventa posição.
 */
export function ordenarPartesColecao(partes: any[]): ParteColecao[] {
  return (partes ?? [])
    .map((p: any) => ({
      id: Number(p?.id),
      release_date: (p?.release_date ?? null) as string | null,
    }))
    .filter((p) => Number.isInteger(p.id) && p.id > 0)
    .sort((a, b) => {
      const da = a.release_date ?? "";
      const db = b.release_date ?? "";
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da < db ? -1 : da > db ? 1 : 0;
    });
}

/** T-DADOS-02: provedor de assinatura (flatrate) do JustWatch via TMDB. */
export interface ProvedorItem {
  tmdb_provider_id: number;
  nome: string;
}

/** T-DADOS-02: provedores BR + link de "onde assistir" do JustWatch. */
export interface ProvedoresMapa {
  provedores: ProvedorItem[];
  url_link: string | null;
}

/**
 * T-DADOS-02: `"watch/providers".results.BR` (append_to_response=watch/providers)
 * → provedores de ASSINATURA (`flatrate`) + o `link` de "onde assistir".
 *
 * Escopo deliberado: só `flatrate` (Netflix, Prime Video, Max, Crunchyroll…),
 * que é o conceito documentado em `StreamingService`. `free`/`ads`/`rent`/`buy`
 * ficam de fora — o schema ainda não distingue categoria de acesso (follow-up).
 * Região: BR apenas (o produto é pt-BR primário e `MidiaStreaming` não modela
 * região). Payload ausente/estranho → lista vazia e `url_link: null`, nunca lança.
 */
export function mapearProvedores(payload: any): ProvedoresMapa {
  const br = payload?.["watch/providers"]?.results?.BR;
  const provedores: ProvedorItem[] = [];
  const vistos = new Set<number>();
  for (const p of br?.flatrate ?? []) {
    const tmdb_provider_id = Number(p?.provider_id);
    if (
      !Number.isInteger(tmdb_provider_id) ||
      tmdb_provider_id <= 0 ||
      vistos.has(tmdb_provider_id)
    ) {
      continue;
    }
    const nome = truncarCampo(p?.provider_name, LIMITES.provedorNome);
    if (!nome) continue;
    vistos.add(tmdb_provider_id);
    provedores.push({ tmdb_provider_id, nome });
  }
  // Só https:// (o link do JustWatch é sempre https; qualquer outra coisa é lixo).
  const link = br?.link;
  const url_link = typeof link === "string" && link.startsWith("https://") ? link : null;
  return { provedores, url_link };
}

// ===========================================================================
// T-DADOS-08 — localização (en/es) e classificação indicativa/regional
// ===========================================================================

/** T-DADOS-08: traduções e certificados do MESMO payload do TMDB. */
export interface LocalizacaoTmdb {
  sinopse_en: string | null;
  sinopse_es: string | null;
  titulo_en: string | null;
  titulo_es: string | null;
  cert_br: string | null;
  cert_us: string | null;
}

/** String não-vazia após trim; qualquer outra coisa → null (nunca fabrica). */
function textoOuNulo(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const s = valor.trim();
  return s ? s : null;
}

/** Primeira certificação não-vazia de um `results[]` do TMDB para a região. */
function certificadoDoPais(results: any, iso: string): string | null {
  if (!Array.isArray(results)) return null;
  for (const item of results) {
    if (item?.iso_3166_1 !== iso) continue;
    // FILME: `release_dates[].certification`; SERIE: `rating`.
    for (const entrada of Array.isArray(item?.release_dates) ? item.release_dates : []) {
      const valor = textoOuNulo(entrada?.certification);
      if (valor) return valor;
    }
    const rating = textoOuNulo(item?.rating);
    if (rating) return rating;
  }
  return null;
}

/**
 * T-DADOS-08: payload de `/movie|/tv?append_to_response=translations,
 * release_dates|content_ratings` → sinopse/título en/es + certificados BR/US.
 *
 * Honesto por construção: só o que veio é gravado (`null` quando a tradução
 * existe sem `overview`, por exemplo); payload ausente/estranho devolve todos
 * os campos nulos e NUNCA lança. Título usa `data.title` (movie) / `data.name`
 * (tv) — a mesma regra da API do TMDB.
 */
export function mapearLocalizacao(payload: any, tipo: "FILME" | "SERIE"): LocalizacaoTmdb {
  const traducoes = Array.isArray(payload?.translations?.translations)
    ? payload.translations.translations
    : [];
  const dados = new Map<string, any>();
  for (const t of traducoes) {
    const locale = t?.iso_639_1;
    if ((locale === "en" || locale === "es") && !dados.has(locale)) {
      dados.set(locale, t?.data ?? {});
    }
  }
  const campo = tipo === "FILME" ? "title" : "name";
  const en = dados.get("en");
  const es = dados.get("es");

  const certFonte = tipo === "FILME" ? "release_dates" : "content_ratings";
  const results = payload?.[certFonte]?.results;
  return {
    sinopse_en: textoOuNulo(en?.overview),
    sinopse_es: textoOuNulo(es?.overview),
    titulo_en: textoOuNulo(en?.[campo]),
    titulo_es: textoOuNulo(es?.[campo]),
    cert_br: certificadoDoPais(results, "BR"),
    cert_us: certificadoDoPais(results, "US"),
  };
}

/**
 * T-DADOS-08: certificado do TMDB → enum brasileiro (DJCTQ). Normaliza
 * trim/uppercase e aceita prefixo numérico claro ("14 anos" → CATORZE), mas
 * SÓ quando o valor casa exatamente um dos enums: desconhecido → null (nunca
 * adivinha, ex.: "PG-13" não vira DOZE).
 */
export function classificacaoDeCertificado(cert: string | null): ClassificacaoIndicativa | null {
  const chave = String(cert ?? "")
    .trim()
    .toUpperCase();
  if (!chave) return null;
  const mapa: Record<string, ClassificacaoIndicativa> = {
    "L": "L",
    "LIVRE": "L",
    "0": "L",
    "10": "DEZ",
    "12": "DOZE",
    "14": "CATORZE",
    "16": "DEZESSEIS",
    "18": "DEZOITO",
  };
  if (mapa[chave]) return mapa[chave];
  const inicial = /^(\d+)/.exec(chave)?.[1];
  return inicial && mapa[inicial] ? mapa[inicial] : null;
}

export interface TemporadaLista {
  numero: number;
  titulo: string | null;
  ano: number | null;
  poster_url: string | null;
}

/** Temporadas exibidas (air_date), season > 0, ordenadas, cap 20. */
export function mapearListaTemporadas(tvPayload: any): TemporadaLista[] {
  return (tvPayload.seasons ?? [])
    .filter((s: any) => s.air_date && s.season_number > 0)
    .sort((a: any, b: any) => a.season_number - b.season_number)
    .slice(0, 20)
    .map((s: any) => ({
      numero: s.season_number as number,
      titulo: (s.name ?? null) as string | null,
      ano: Number.parseInt(String(s.air_date).slice(0, 4), 10) as number,
      poster_url: s.poster_path ? `${IMG}/w342${s.poster_path}` : null,
    }));
}

export interface EpisodioLista {
  numero: number;
  titulo: string;
  data_exibicao: Date | null;
  nota_publico: number | null;
}

/** Episódios com nota pública do TMDB; vote_average 0 → null (não fabrica). */
export function mapearEpisodios(seasonPayload: any): EpisodioLista[] {
  return (seasonPayload.episodes ?? []).map((e: any) => ({
    numero: e.episode_number as number,
    titulo: String(e.name ?? ""),
    data_exibicao: e.air_date ? new Date(`${e.air_date}T00:00:00Z`) : null,
    nota_publico: e.vote_average != null && e.vote_average > 0 ? (e.vote_average as number) : null,
  }));
}

export function arestasSequencia(filmes: { id: string; ano: number | null }[]) {
  const ordenados = [...filmes].filter((f) => f.ano).sort((a, b) => (a.ano ?? 0) - (b.ano ?? 0));
  const saida: { anteriorId: string; sequenciaId: string }[] = [];
  for (let i = 1; i < ordenados.length; i++) {
    const anterior = ordenados[i - 1];
    const atual = ordenados[i];
    if (!anterior || !atual) continue;
    saida.push({ anteriorId: anterior.id, sequenciaId: atual.id });
  }
  return saida;
}

/**
 * T-DADOS-06 — CTEs que definem a "franquia incompleta" (a fila nova). Fonte
 * única: usada tanto pelo alvo do `enriquecerArestasFranquia` quanto pela
 * contagem de `contarPendentes` (mudar a condição é mexer num lugar só).
 * `franquia_membros` conta os membros COM ano; `franquia_arestas` conta as
 * arestas SEQUENCIA_DE entre esses mesmos membros. Faltam arestas quando
 * `com_ano >= 2` e `existentes < com_ano - 1`.
 */
const SQL_FRANQUIAS_FALTANDO_ARESTA = `
  franquia_membros AS (
    SELECT mf.franquia_id, COUNT(*)::int AS com_ano
    FROM midia_franquia mf
    JOIN midia m ON m.id = mf.midia_id
    WHERE m.deleted_at IS NULL AND m.ano_lancamento IS NOT NULL
    GROUP BY mf.franquia_id
  ),
  franquia_arestas AS (
    SELECT mf1.franquia_id, COUNT(*)::int AS existentes
    FROM relacao_obra r
    JOIN midia_franquia mf1 ON mf1.midia_id = r.origem_id
    JOIN midia_franquia mf2 ON mf2.midia_id = r.destino_id
    JOIN midia mo ON mo.id = r.origem_id
    JOIN midia md ON md.id = r.destino_id
    WHERE r.tipo = 'SEQUENCIA_DE'
      AND mf1.franquia_id = mf2.franquia_id
      AND mo.deleted_at IS NULL AND md.deleted_at IS NULL
      AND mo.ano_lancamento IS NOT NULL AND md.ano_lancamento IS NOT NULL
    GROUP BY mf1.franquia_id
  )`;

/** WHERE + join que seleciona as franquias incompletas (ver CTEs acima). */
const SQL_SELECT_FRANQUIAS_INCOMPLETAS = `
  FROM franquia_membros fm
  LEFT JOIN franquia_arestas fa ON fa.franquia_id = fm.franquia_id
  WHERE fm.com_ano >= 2 AND COALESCE(fa.existentes, 0) < fm.com_ano - 1`;

// ===========================================================================
// T-DADOS-03 — crítica do IGDB (por id, não por busca textual)
// ===========================================================================

/** T-DADOS-03: crítica do IGDB (0–100) já saneada para `avaliacao_fonte`. */
export interface CriticaIgdb {
  rating: number;
  votos: number | null;
  url: string | null;
}

/**
 * T-DADOS-03: primeiro item da resposta do IGDB (`POST /v4/games`) →
 * `{ rating, votos, url }`. Só existe crítica quando `aggregated_rating` é
 * número finito > 0 (o IGDB devolve `null` para jogo sem nota da imprensa);
 * `aggregated_rating_count` só entra se for inteiro > 0 (senão null — nunca
 * fabrica volume); `url` deriva do `slug` quando presente. Nunca lança.
 */
export function mapearCriticaIgdb(jogo: any): CriticaIgdb | null {
  const item = Array.isArray(jogo) ? jogo[0] : jogo;
  const rating = Number(item?.aggregated_rating);
  if (!Number.isFinite(rating) || rating <= 0) return null;
  const votosBrutos = Number(item?.aggregated_rating_count);
  const votos = Number.isInteger(votosBrutos) && votosBrutos > 0 ? votosBrutos : null;
  const slug = typeof item?.slug === "string" ? item.slug.trim() : "";
  return { rating, votos, url: slug ? `https://www.igdb.com/games/${slug}` : null };
}

// ===========================================================================
// T-DADOS-09 — gêneros de games no IGDB (por id)
// ===========================================================================

/**
 * T-DADOS-09: mapa curado dos 23 slugs de `/v4/genres` do IGDB (todos em
 * inglês) para o nome canônico em pt-BR da tabela `genero`. É a decisão
 * editorial desta fatia: slug IGDB → nome existente/novo. A resolução reusa
 * linhas por `slugifyBasico(nome)` ("aventura", "musica", "rpg" já existem),
 * sem renomear nem alterar `tipo`/`midia_alvo` das linhas existentes.
 */
export const MAPA_GENEROS_IGDB: Readonly<Record<string, string>> = {
  "adventure": "Aventura",
  "music": "Música",
  "role-playing-rpg": "RPG",
  "sport": "Esporte",
  "fighting": "Luta",
  "shooter": "Tiro",
  "platform": "Plataforma",
  "puzzle": "Quebra-cabeça",
  "racing": "Corrida",
  "simulator": "Simulação",
  "strategy": "Estratégia",
  "real-time-strategy-rts": "Estratégia em Tempo Real",
  "turn-based-strategy-tbs": "Estratégia por Turnos",
  "tactical": "Tático",
  "hack-and-slash-beat-em-up": "Hack and Slash",
  "quiz-trivia": "Quiz",
  "pinball": "Pinball",
  "indie": "Indie",
  "arcade": "Arcade",
  "visual-novel": "Visual Novel",
  "card-and-board-game": "Cartas e Tabuleiro",
  "moba": "MOBA",
  "point-and-click": "Point and Click",
};

/**
 * T-DADOS-09: `genres[]` do jogo do IGDB → slugs do mapa curado. O `slug` do
 * item é preferido; sem ele, deriva de `name` via `slugifyBasico`. Slugs fora
 * do mapa são descartados, duplicatas removidas. Payload estranho/ausente
 * devolve `[]` e NUNCA lança.
 */
export function generosDoPayload(jogo: any): { slug: string }[] {
  const item = Array.isArray(jogo) ? jogo[0] : jogo;
  const brutos = Array.isArray(item?.genres) ? item.genres : [];
  const vistos = new Set<string>();
  const saida: { slug: string }[] = [];
  for (const g of brutos) {
    const slugItem = typeof g?.slug === "string" ? g.slug.trim().toLowerCase() : "";
    const slug = slugItem || slugifyBasico(typeof g?.name === "string" ? g.name : "").toLowerCase();
    if (!slug || !Object.prototype.hasOwnProperty.call(MAPA_GENEROS_IGDB, slug)) continue;
    if (vistos.has(slug)) continue;
    vistos.add(slug);
    saida.push({ slug });
  }
  return saida;
}

interface TokenTwitch {
  access_token?: string;
  expires_in?: number;
}

/**
 * Cache de token do IGDB em módulo — mesmo padrão (e mesmos campos) do
 * `igdb.adapter.ts` e do `prisma/igdb-http.ts`. O cache do adapter NÃO é
 * exportável, então é replicado aqui (como o igdb-http.ts já faz) em vez de
 * mexer no adapter nesta fatia.
 */
let igdbTokenCache: { token: string; expiraEm: number } | null = null;

/** Limpa o cache de token do IGDB (usado em testes). */
export function resetTokenTwitchIgdb(): void {
  igdbTokenCache = null;
}

/** Credenciais Twitch presentes (mesma checagem do adapter). */
export function credenciaisIgdb(): boolean {
  return Boolean(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET);
}

/** Token OAuth Twitch (client_credentials), cacheado até perto da expiração. */
async function obterTokenTwitch(): Promise<string> {
  if (igdbTokenCache && Date.now() < igdbTokenCache.expiraEm) return igdbTokenCache.token;
  const corpo = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID ?? "",
    client_secret: process.env.TWITCH_CLIENT_SECRET ?? "",
    grant_type: "client_credentials",
  }).toString();
  const resposta = await postJson<TokenTwitch>(TWITCH_TOKEN_URL, corpo, {
    headers: {
      "accept": "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
  });
  if (!resposta.access_token) return "";
  igdbTokenCache = {
    token: resposta.access_token,
    expiraEm: Date.now() + ((resposta.expires_in ?? 3600) - 60) * 1000,
  };
  return resposta.access_token;
}

// ===========================================================================
// T-DADOS-10 — crítica via OMDb (lookup exato por id IMDb)
// ===========================================================================

/**
 * OMDb grátis = 1.000 requisições/dia. O teto do job é 900 (margem de 10%
 * sob o limite) para o drain não queimar a cota na primeira hora e ficar em
 * 429 pelo resto do dia.
 */
export const ORCAMENTO_OMDB_DIARIO = 900;

/** Id IMDb válido (`tt` + 7+ dígitos) — o mesmo formato do endpoint ?i=. */
const ID_IMDB = /^tt[0-9]{7,}$/;

/** T-DADOS-10: quantas consultas OMDb ainda cabem hoje (nunca negativo). */
export function orcamentoOmdbRestante(hojeQueries: number): number {
  const usadas = Number.isFinite(hojeQueries) ? Math.max(0, Math.trunc(hojeQueries)) : 0;
  return Math.max(0, ORCAMENTO_OMDB_DIARIO - usadas);
}

/**
 * T-DADOS-10: extrai o id IMDb do payload do TMDB. Filme traz `imdb_id` no
 * topo; série traz `external_ids.imdb_id` (com append_to_response). Qualquer
 * outro shape/lixo devolve null (ausência honesta — não gasta cota do OMDb).
 */
export function imdbIdDoPayload(payload: any, tipo: string): string | null {
  const bruto =
    tipo === "FILME" ? payload?.imdb_id : tipo === "SERIE" ? payload?.external_ids?.imdb_id : null;
  if (typeof bruto !== "string") return null;
  const id = bruto.trim();
  return ID_IMDB.test(id) ? id : null;
}

// ===========================================================================
// Serviço
// ===========================================================================

@Injectable()
export class BackfillService {
  private readonly logger = new Logger(BackfillService.name);
  private estado: Record<BackfillTipo, BackfillEstado> = {
    metadados: estadoVazio(),
    continuidade: estadoVazio(),
    metadadosRicos: estadoVazio(),
    provedores: estadoVazio(),
    criticaIgdb: estadoVazio(),
    arestasFranquia: estadoVazio(),
    avaliacaoLivros: estadoVazio(),
    localizacao: estadoVazio(),
    generosGames: estadoVazio(),
    criticaOmdb: estadoVazio(),
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaScore: MediaScoreService,
    // T-DADOS-07: o job usa o ADAPTER real (mesma instância do job de score)
    // para que a correção do lookup por id valha também em produção.
    private readonly coleta: ColetaService,
  ) {}

  status(): Record<BackfillTipo, BackfillEstado> {
    return this.estado;
  }

  private async guardaDisco(): Promise<void> {
    const r = await this.prisma.$queryRawUnsafe<{ bytes: bigint }[]>(
      `SELECT pg_database_size(current_database())::bigint AS bytes`,
    );
    const usadosMb = Number(r[0]?.bytes ?? 0) / 1048576;
    const limiteMb = Number(process.env.DISCO_LIMITE_MB ?? 4250);
    if (usadosMb > limiteMb) {
      throw new BadRequestException(
        `Banco com ${Math.round(usadosMb)}MB acima do limite ${limiteMb}MB (D-574). Libere espaço antes de backfills.`,
      );
    }
  }

  private async pausa(ms: number): Promise<void> {
    await new Promise((r) => setTimeout(r, ms));
  }

  /**
   * T-DADOS-07: a fila de livros só existe quando a fonte está habilitada.
   * OpenLibrary compartilha o gate de plataforma `MEDIA_PREPARACAO_ENABLED`
   * (igual aos adapters de scraping). Sem isso o drain tentaria 800 títulos
   * por tique para sempre, todos falhando, e cairia no backoff de 6h com erro
   * repetido. Consulta o estado UMA vez (não por título).
   */
  private filaAvaliacaoLivrosAtiva(): boolean {
    const adapter = this.coleta.adaptadores.find((a) => a.id === "openlibrary");
    return Boolean(adapter?.ativo());
  }

  /** T-DADOS-10: a fila OMDb só existe quando a fonte pode rodar. */
  private filaCriticaOmdbAtiva(): boolean {
    const adapter = this.coleta.adaptadores.find((a) => a.id === "omdb");
    return Boolean(adapter?.ativo());
  }

  /**
   * T-DADOS-10: títulos distintos que já consumiram a cota do dia
   * (OMDb/RT/Metacritic). Cada título processado grava ao menos uma linha em
   * avaliacao_fonte com `coletado_em` de hoje.
   */
  private async queriesOmdbHoje(): Promise<number> {
    const r = await this.prisma.$queryRawUnsafe<{ usados: number | bigint }[]>(
      `SELECT COUNT(DISTINCT a.midia_id)::int AS usados
         FROM avaliacao_fonte a
        WHERE a.fonte IN ('omdb','rottentomatoes','metacritic')
          AND a.coletado_em::date = CURRENT_DATE`,
    );
    return Number(r[0]?.usados ?? 0);
  }

  private async tmdb(caminho: string, chave: string): Promise<any> {
    const url = `${TMDB_BASE}${caminho}${caminho.includes("?") ? "&" : "?"}api_key=${chave}&language=pt-BR`;
    await this.pausa(PAUSA_MS);
    return fetchJson<any>(url, {
      headers: { "User-Agent": UA_BROWSER, "Accept": "application/json" },
      timeoutMs: 20000,
    });
  }

  /**
   * T178: metadados ricos (elenco/produtoras/backdrop/país) para títulos TMDB
   * que AINDA NÃO têm elenco — retomável: re-executar avança.
   */
  async enriquecerMetadados(
    limite: number,
  ): Promise<{ processados: number; ok: number; falhas: number }> {
    const chave = process.env.TMDB_API_KEY;
    if (!chave) throw new BadRequestException("TMDB_API_KEY ausente no ambiente.");
    if (this.estado.metadados.executando) {
      throw new BadRequestException("Job metadados já em execução.");
    }
    await this.guardaDisco();
    this.estado.metadados = {
      executando: true,
      processados: 0,
      ok: 0,
      falhas: 0,
      iniciadoEm: new Date().toISOString(),
      atual: null,
    };
    const alvo = (await this.prisma.$queryRawUnsafe<
      { id: string; tipo: string; fonte_id: string; titulo: string }[]
    >(
      `SELECT m.id::text, m.tipo::text, m.fonte_id, m.titulo
       FROM midia m
       WHERE m.deleted_at IS NULL AND m.fonte IN ('tmdb','tmdb_tv')
         AND NOT EXISTS (SELECT 1 FROM midia_elenco e WHERE e.midia_id = m.id)
       ORDER BY m.id
       LIMIT ${Math.min(Math.max(Math.trunc(limite) || 2000, 1), 11000)}`,
    )) as any[];
    this.logger.log(`Backfill metadados: ${alvo.length} títulos alvo.`);
    for (const m of alvo) {
      const tipo = m.tipo === "SERIE" ? "SERIE" : "FILME";
      this.estado.metadados.processados++;
      this.estado.metadados.atual = m.titulo;
      try {
        const append = tipo === "SERIE" ? "credits,aggregate_credits" : "credits";
        const caminho = tipo === "SERIE" ? "tv" : "movie";
        const payload = await this.tmdb(
          `/${caminho}/${m.fonte_id}?append_to_response=${append}`,
          chave,
        );
        const mapa = mapearMetadados(payload, tipo as "FILME" | "SERIE");
        for (const a of mapa.elenco) {
          await this.prisma.midiaElenco.upsert({
            where: {
              midia_id_fonte_fonte_id: { midia_id: m.id, fonte: "tmdb", fonte_id: a.fonte_id },
            },
            create: {
              midia_id: m.id,
              fonte: "tmdb",
              fonte_id: a.fonte_id,
              nome: a.nome,
              personagem: a.personagem,
              ordem: a.ordem,
              foto_url: a.foto_url,
            },
            update: {
              nome: a.nome,
              personagem: a.personagem,
              ordem: a.ordem,
              foto_url: a.foto_url,
            },
          });
        }
        for (const emp of mapa.produtoras) {
          await this.prisma.midiaProdutora.upsert({
            where: {
              midia_id_fonte_fonte_id: { midia_id: m.id, fonte: "tmdb", fonte_id: emp.fonte_id },
            },
            create: {
              midia_id: m.id,
              fonte: "tmdb",
              fonte_id: emp.fonte_id,
              nome: emp.nome,
              papel: emp.papel,
            },
            update: { nome: emp.nome, papel: emp.papel },
          });
        }
        await this.prisma.midia.update({
          where: { id: m.id },
          data: {
            backdrop_url: mapa.backdrop_url,
            ...(mapa.pais_origem ? { pais_origem: mapa.pais_origem } : {}),
          },
        });
        this.estado.metadados.ok++;
      } catch (e) {
        this.estado.metadados.falhas++;
        this.logger.warn(`Backfill metadados falha [${m.titulo}]: ${String(e).slice(0, 120)}`);
      }
    }
    this.estado.metadados.executando = false;
    this.logger.log(
      `Backfill metadados fim: ok=${this.estado.metadados.ok} falhas=${this.estado.metadados.falhas}.`,
    );
    const r = {
      processados: alvo.length,
      ok: this.estado.metadados.ok,
      falhas: this.estado.metadados.falhas,
    };
    this.estado.metadados.atual = `fim: ok=${r.ok} falhas=${r.falhas}`;
    return r;
  }

  /**
   * T-DADOS-01 (D1): enriquecimento rico v2 — duração, gêneros e
   * coleção/franquia, tudo a partir do MESMO payload do job acima (nenhuma
   * chamada extra por título; só `/collection/{id}`, uma por coleção NOVA,
   * memoizada no lote). O alvo é o watermark `metadados_ricos_em IS NULL` —
   * por isso títulos que já têm elenco (e que o job antigo nunca revisita)
   * entram na fila. O watermark é gravado SEMPRE (mesmo sem runtime/coleção na
   * fonte), então a fila drena de verdade; em exceção o título volta depois.
   */
  async enriquecerMetadadosRicos(
    limite: number,
  ): Promise<{ processados: number; ok: number; falhas: number }> {
    const chave = process.env.TMDB_API_KEY;
    if (!chave) throw new BadRequestException("TMDB_API_KEY ausente no ambiente.");
    if (this.estado.metadadosRicos.executando) {
      throw new BadRequestException("Job metadados ricos já em execução.");
    }
    await this.guardaDisco();
    this.estado.metadadosRicos = {
      executando: true,
      processados: 0,
      ok: 0,
      falhas: 0,
      iniciadoEm: new Date().toISOString(),
      atual: null,
    };
    const alvo = (await this.prisma.$queryRawUnsafe<
      { id: string; tipo: string; fonte_id: string; titulo: string }[]
    >(
      `SELECT m.id::text, m.tipo::text, m.fonte_id, m.titulo
       FROM midia m
       WHERE m.deleted_at IS NULL AND m.fonte IN ('tmdb','tmdb_tv')
         AND m.metadados_ricos_em IS NULL
       ORDER BY m.id
       LIMIT ${Math.min(Math.max(Math.trunc(limite) || 2000, 1), 8000)}`,
    )) as any[];
    this.logger.log(`Backfill metadados ricos: ${alvo.length} títulos alvo.`);
    // T-DADOS-01: 1 chamada TMDB por coleção NOVA (não por título).
    const partesPorColecao = new Map<number, ParteColecao[]>();
    let generosVinculados = 0;
    let partesVinculadas = 0;
    for (const m of alvo) {
      const tipo = m.tipo === "SERIE" ? "SERIE" : "FILME";
      this.estado.metadadosRicos.processados++;
      this.estado.metadadosRicos.atual = m.titulo;
      try {
        const append = tipo === "SERIE" ? "credits,aggregate_credits" : "credits";
        const caminho = tipo === "SERIE" ? "tv" : "movie";
        const payload = await this.tmdb(
          `/${caminho}/${m.fonte_id}?append_to_response=${append}`,
          chave,
        );
        const mapa = mapearMetadados(payload, tipo);

        // Gêneros (tmdb_id → slug → create, com truncagem 64 e colisão tratada).
        for (const g of mapa.generos) {
          const genero = await this.resolverGenero(g.tmdb_id, g.nome);
          if (!genero) continue;
          await this.prisma.midiaGenero.upsert({
            where: { midia_id_genero_id: { midia_id: m.id, genero_id: genero.id } },
            create: { midia_id: m.id, genero_id: genero.id },
            update: {},
          });
          generosVinculados++;
        }

        // Coleção/franquia: 1 fetch de /collection por coleção nova (memoizado).
        if (mapa.colecao) {
          const slug = truncarCampo(slugBaseFranquia(mapa.colecao.nome), LIMITES.franquiaSlug);
          if (slug) {
            const franquia = await this.prisma.franquia.upsert({
              where: { slug },
              // Slug já existente com outro nome → mantém o existente.
              update: {},
              create: {
                nome: truncarCampo(mapa.colecao.nome, LIMITES.franquiaNome) ?? mapa.colecao.nome,
                slug,
              },
              select: { id: true },
            });
            let partes = partesPorColecao.get(mapa.colecao.tmdb_id);
            if (!partes) {
              const colecaoPayload = await this.tmdb(`/collection/${mapa.colecao.tmdb_id}`, chave);
              partes = ordenarPartesColecao(colecaoPayload?.parts ?? []);
              partesPorColecao.set(mapa.colecao.tmdb_id, partes);
            }
            for (const [indice, parte] of partes.entries()) {
              // Só entram partes que EXISTEM no catálogo (fonte tmdb).
              const existente = await this.prisma.midia.findFirst({
                where: { fonte: "tmdb", fonte_id: String(parte.id), deleted_at: null },
                select: { id: true },
              });
              if (!existente) continue;
              await this.prisma.midiaFranquia.upsert({
                where: {
                  midia_id_franquia_id: { midia_id: existente.id, franquia_id: franquia.id },
                },
                create: {
                  midia_id: existente.id,
                  franquia_id: franquia.id,
                  // 1-based na ordem de lançamento real vinda do TMDB.
                  ordem_lancamento: indice + 1,
                  ordem_cronologica: null, // não inferir — honesto
                },
                update: {}, // curadoria preservada
              });
              partesVinculadas++;
            }
          }
        }

        // Watermark SEMPRE gravado (mesmo sem runtime/coleção na fonte): sem
        // isso a fila travaria nos títulos em que o dado não existe.
        await this.prisma.midia.update({
          where: { id: m.id },
          data: {
            // Só sobrescreve quando a fonte devolve duração (nunca apaga dado).
            ...(mapa.duracao_minutos ? { duracao_minutos: mapa.duracao_minutos } : {}),
            metadados_ricos_em: new Date(),
          },
        });
        this.estado.metadadosRicos.ok++;
      } catch (e) {
        // Sem watermark: o título volta na próxima execução (retentável).
        this.estado.metadadosRicos.falhas++;
        this.logger.warn(
          `Backfill metadados ricos falha [${m.titulo}]: ${String(e).slice(0, 120)}`,
        );
      }
    }
    this.estado.metadadosRicos.executando = false;
    this.estado.metadadosRicos.atual = `fim: ok=${this.estado.metadadosRicos.ok} falhas=${this.estado.metadadosRicos.falhas}`;
    this.logger.log(
      `Backfill metadados ricos fim: ok=${this.estado.metadadosRicos.ok} falhas=${this.estado.metadadosRicos.falhas} gêneros=${generosVinculados} partes=${partesVinculadas} coleções=${partesPorColecao.size}.`,
    );
    return {
      processados: this.estado.metadadosRicos.processados,
      ok: this.estado.metadadosRicos.ok,
      falhas: this.estado.metadadosRicos.falhas,
    };
  }

  /**
   * T-DADOS-01: resolve (ou cria) o `genero` a partir do `genres[]` do TMDB na
   * ordem tmdb_id (seed do catálogo) → slug → create. Nunca propaga erro: se o
   * create colidir com unique (nome/slug/tmdb_id), refaz o lookup por slug e
   * segue; em último caso devolve null e o título continua sem aquele gênero.
   */
  private async resolverGenero(tmdbId: number, nome: string): Promise<{ id: number } | null> {
    const porTmdb = await this.prisma.genero.findUnique({
      where: { tmdb_id: tmdbId },
      select: { id: true },
    });
    if (porTmdb) return porTmdb;
    const slug = truncarCampo(slugifyBasico(nome), LIMITES.generoSlug);
    if (slug) {
      const porSlug = await this.prisma.genero.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (porSlug) return porSlug;
    }
    const nomeFinal = truncarCampo(nome, LIMITES.generoNome);
    const slugFinal = slug ?? truncarCampo(slugifyBasico(`genero-${tmdbId}`), LIMITES.generoSlug);
    if (!nomeFinal || !slugFinal) return null;
    try {
      return await this.prisma.genero.create({
        data: { nome: nomeFinal, slug: slugFinal, tmdb_id: tmdbId },
        select: { id: true },
      });
    } catch {
      const porSlugDepois = await this.prisma.genero.findUnique({
        where: { slug: slugFinal },
        select: { id: true },
      });
      if (porSlugDepois) return porSlugDepois;
      const porTmdbDepois = await this.prisma.genero.findUnique({
        where: { tmdb_id: tmdbId },
        select: { id: true },
      });
      return porTmdbDepois;
    }
  }

  /**
   * T-DADOS-02 (D2): coleta dos provedores de streaming (TMDB
   * `append_to_response=watch/providers` = JustWatch, região BR). Popula
   * `streaming_service` + `midia_streaming` — a ficha do produto ("Onde
   * assistir") nunca teve dado e passa a funcionar pelo caminho de leitura que
   * já existe. Alvo é o watermark `provedores_em IS NULL`; o watermark é
   * gravado SEMPRE (mesmo sem provedor no BR), então a fila drena de verdade;
   * em exceção o título volta depois. Escopo: só `flatrate` (limitação
   * documentada no mapper `mapearProvedores`).
   */
  async enriquecerProvedores(
    limite: number,
  ): Promise<{ processados: number; ok: number; falhas: number }> {
    const chave = process.env.TMDB_API_KEY;
    if (!chave) throw new BadRequestException("TMDB_API_KEY ausente no ambiente.");
    if (this.estado.provedores.executando) {
      throw new BadRequestException("Job provedores já em execução.");
    }
    await this.guardaDisco();
    this.estado.provedores = {
      executando: true,
      processados: 0,
      ok: 0,
      falhas: 0,
      iniciadoEm: new Date().toISOString(),
      atual: null,
    };
    const alvo = (await this.prisma.$queryRawUnsafe<
      { id: string; tipo: string; fonte: string; fonte_id: string; titulo: string }[]
    >(
      `SELECT m.id::text, m.tipo::text, m.fonte::text, m.fonte_id, m.titulo
       FROM midia m
       WHERE m.deleted_at IS NULL AND m.fonte IN ('tmdb','tmdb_tv')
         AND m.provedores_em IS NULL
       ORDER BY m.id
       LIMIT ${Math.min(Math.max(Math.trunc(limite) || 2000, 1), 8000)}`,
    )) as any[];
    this.logger.log(`Backfill provedores: ${alvo.length} títulos alvo.`);
    let vinculados = 0;
    let servicosCriados = 0;
    for (const m of alvo) {
      this.estado.provedores.processados++;
      this.estado.provedores.atual = m.titulo;
      try {
        // A rota depende da FONTE (não do tipo): tmdb_tv → /tv, tmdb → /movie.
        const caminho = m.fonte === "tmdb_tv" ? "tv" : "movie";
        const payload = await this.tmdb(
          `/${caminho}/${m.fonte_id}?append_to_response=watch/providers`,
          chave,
        );
        const mapa = mapearProvedores(payload);
        for (const p of mapa.provedores) {
          const service = await this.resolverStreamingService(p.tmdb_provider_id, p.nome);
          if (!service) continue;
          if (service.criado) servicosCriados++;
          await this.prisma.midiaStreaming.upsert({
            where: {
              midia_id_service_id: { midia_id: m.id, service_id: service.id },
            },
            create: { midia_id: m.id, service_id: service.id, url: mapa.url_link },
            // Coleta sem link não apaga a URL já gravada.
            update: { url: mapa.url_link ?? undefined },
          });
          vinculados++;
        }
        // Watermark SEMPRE gravado (mesmo sem provedor no BR): sem isso a fila
        // travaria nos títulos que não estão em nenhum streaming.
        await this.prisma.midia.update({
          where: { id: m.id },
          data: { provedores_em: new Date() },
        });
        this.estado.provedores.ok++;
      } catch (e) {
        // Sem watermark: o título volta na próxima execução (retentável).
        this.estado.provedores.falhas++;
        this.logger.warn(`Backfill provedores falha [${m.titulo}]: ${String(e).slice(0, 120)}`);
      }
    }
    this.estado.provedores.executando = false;
    this.estado.provedores.atual = `fim: ok=${this.estado.provedores.ok} falhas=${this.estado.provedores.falhas}`;
    this.logger.log(
      `Backfill provedores fim: ok=${this.estado.provedores.ok} falhas=${this.estado.provedores.falhas} vínculos=${vinculados} serviços novos=${servicosCriados}.`,
    );
    return {
      processados: this.estado.provedores.processados,
      ok: this.estado.provedores.ok,
      falhas: this.estado.provedores.falhas,
    };
  }

  /**
   * T-DADOS-08: localização en/es (sinopse/título) + classificação
   * indicativa/regional a partir do MESMO payload do TMDB
   * (`append_to_response=translations,release_dates|content_ratings`).
   *
   * Honestidade: grava só o que veio e nunca sobrescreve valor não-nulo já
   * existente (traduções e classificação lida no SELECT). `classificacao_regiao`
   * recebe o certificado cru (BR/US) quando existir. O watermark
   * `localizacao_em` é gravado SEMPRE ao fim do título, mesmo sem tradução —
   * sem isso a fila travaria nos títulos em que a fonte não tem o dado. Em
   * exceção o título volta na próxima execução (retentável).
   */
  async enriquecerLocalizacao(
    limite: number,
  ): Promise<{ processados: number; ok: number; falhas: number }> {
    const chave = process.env.TMDB_API_KEY;
    if (!chave) throw new BadRequestException("TMDB_API_KEY ausente no ambiente.");
    if (this.estado.localizacao.executando) {
      throw new BadRequestException("Job localização já em execução.");
    }
    await this.guardaDisco();
    this.estado.localizacao = {
      executando: true,
      processados: 0,
      ok: 0,
      falhas: 0,
      iniciadoEm: new Date().toISOString(),
      atual: null,
    };
    const alvo = (await this.prisma.$queryRawUnsafe<
      {
        id: string;
        tipo: string;
        fonte_id: string;
        titulo: string;
        sinopse_en: string | null;
        sinopse_es: string | null;
        titulo_en: string | null;
        titulo_es: string | null;
        classificacao_indicativa: string | null;
      }[]
    >(
      `SELECT m.id::text, m.tipo::text, m.fonte_id, m.titulo,
              m.sinopse_en, m.sinopse_es, m.titulo_en, m.titulo_es,
              m.classificacao_indicativa::text
       FROM midia m
       WHERE m.deleted_at IS NULL AND m.fonte IN ('tmdb','tmdb_tv')
         AND m.localizacao_em IS NULL
       ORDER BY m.id
       LIMIT ${Math.min(Math.max(Math.trunc(limite) || 2000, 1), 3000)}`,
    )) as any[];
    this.logger.log(`Backfill localização: ${alvo.length} títulos alvo.`);
    let semTraducao = 0;
    let comCertificado = 0;
    for (const m of alvo) {
      const tipo = m.tipo === "SERIE" ? "SERIE" : "FILME";
      this.estado.localizacao.processados++;
      this.estado.localizacao.atual = m.titulo;
      try {
        const caminho = tipo === "SERIE" ? "tv" : "movie";
        const append =
          tipo === "SERIE" ? "translations,content_ratings" : "translations,release_dates";
        const payload = await this.tmdb(
          `/${caminho}/${m.fonte_id}?append_to_response=${append}`,
          chave,
        );
        const mapa = mapearLocalizacao(payload, tipo);

        // Só escreve o que veio E só quando o valor atual é nulo (curadoria e
        // coletas anteriores nunca são apagadas/sobrescritas).
        const data: any = {};
        if (mapa.sinopse_en && !m.sinopse_en) data.sinopse_en = mapa.sinopse_en;
        if (mapa.sinopse_es && !m.sinopse_es) data.sinopse_es = mapa.sinopse_es;
        if (mapa.titulo_en && !m.titulo_en) data.titulo_en = mapa.titulo_en;
        if (mapa.titulo_es && !m.titulo_es) data.titulo_es = mapa.titulo_es;
        // DJCTQ é brasileiro: só a certificação BR vira classificacao_indicativa.
        if (!m.classificacao_indicativa) {
          const classificacao = classificacaoDeCertificado(mapa.cert_br);
          if (classificacao) data.classificacao_indicativa = classificacao;
        }

        const regionais: { regiao: "BR" | "US"; valor: string | null }[] = [
          { regiao: "BR", valor: mapa.cert_br },
          { regiao: "US", valor: mapa.cert_us },
        ];
        for (const { regiao, valor } of regionais) {
          if (!valor) continue;
          await this.prisma.classificacaoRegiao.upsert({
            where: { midia_id_regiao: { midia_id: m.id, regiao } },
            create: { midia_id: m.id, regiao, valor: valor.slice(0, 32), fonte: "tmdb" },
            update: { valor: valor.slice(0, 32), fonte: "tmdb" },
          });
        }

        // Watermark SEMPRE gravado (mesmo sem tradução/certificado).
        data.localizacao_em = new Date();
        await this.prisma.midia.update({ where: { id: m.id }, data });

        if (!mapa.sinopse_en && !mapa.sinopse_es) semTraducao++;
        if (mapa.cert_br || mapa.cert_us) comCertificado++;
        this.estado.localizacao.ok++;
      } catch (e) {
        // Sem watermark: o título volta na próxima execução (retentável).
        this.estado.localizacao.falhas++;
        this.logger.warn(`Backfill localização falha [${m.titulo}]: ${String(e).slice(0, 120)}`);
      }
    }
    this.estado.localizacao.executando = false;
    this.estado.localizacao.atual = `fim: ok=${this.estado.localizacao.ok} sem_traducao=${semTraducao} com_certificado=${comCertificado} falhas=${this.estado.localizacao.falhas}`;
    this.logger.log(
      `Backfill localização fim: ok=${this.estado.localizacao.ok} sem_traducao=${semTraducao} com_certificado=${comCertificado} falhas=${this.estado.localizacao.falhas}.`,
    );
    return {
      processados: this.estado.localizacao.processados,
      ok: this.estado.localizacao.ok,
      falhas: this.estado.localizacao.falhas,
    };
  }

  /**
   * T-DADOS-02: resolve (ou cria) o `streaming_service` a partir do provider do
   * JustWatch na ordem tmdb_provider_id → slug → create. Nunca propaga erro: se
   * o create colidir com unique (nome/slug/tmdb_provider_id), refaz o lookup e
   * segue; em último caso devolve null e o título continua sem aquele provedor.
   */
  private async resolverStreamingService(
    tmdbProviderId: number,
    nome: string,
  ): Promise<{ id: number; criado: boolean } | null> {
    const porTmdb = await this.prisma.streamingService.findUnique({
      where: { tmdb_provider_id: tmdbProviderId },
      select: { id: true },
    });
    if (porTmdb) return { id: porTmdb.id, criado: false };
    const slug = truncarCampo(slugifyBasico(nome), LIMITES.provedorSlug);
    if (slug) {
      const porSlug = await this.prisma.streamingService.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (porSlug) return { id: porSlug.id, criado: false };
    }
    const nomeFinal = truncarCampo(nome, LIMITES.provedorNome);
    const slugFinal =
      slug ?? truncarCampo(slugifyBasico(`provedor-${tmdbProviderId}`), LIMITES.provedorSlug);
    if (!nomeFinal || !slugFinal) return null;
    try {
      const novo = await this.prisma.streamingService.create({
        data: { nome: nomeFinal, slug: slugFinal, tmdb_provider_id: tmdbProviderId },
        select: { id: true },
      });
      return { id: novo.id, criado: true };
    } catch {
      const porSlugDepois = await this.prisma.streamingService.findUnique({
        where: { slug: slugFinal },
        select: { id: true },
      });
      if (porSlugDepois) return { id: porSlugDepois.id, criado: false };
      const porTmdbDepois = await this.prisma.streamingService.findUnique({
        where: { tmdb_provider_id: tmdbProviderId },
        select: { id: true },
      });
      return porTmdbDepois ? { id: porTmdbDepois.id, criado: false } : null;
    }
  }

  /**
   * T-DADOS-03 (D3): coleta DEDICADA da crítica de games no IGDB **por id**
   * (`POST /v4/games` com `where id = <fonte_id>`) e recálculo do MEDIA Score
   * do título.
   *
   * Por que existe: `media_score.score_critica` só existe em 183 de 16.667
   * títulos e, dos 4.996 games, só 50 têm `avaliacao_fonte.fonte='igdb'` — o
   * bucket Crítica (diferencial do produto) está vazio. O dado EXISTE na fonte
   * (sonda read-only: 9/9 games amostrados com `aggregated_rating` entre 91,5
   * e 100) e nunca foi coletado. A busca textual do `igdb.adapter.ts` (fora do
   * escopo desta fatia) devolve DLC/porta/expansão por relevância; aqui o
   * lookup é por id EXATO, então o alvo é o jogo base.
   *
   * Alvo: watermark `critica_igdb_em IS NULL` (retomável — não repete título).
   * Watermark gravado SEMPRE ao fim do título (com ou sem crítica), porque
   * jogo sem `aggregated_rating` não vira fila presa; exceção de rede/API não
   * marca (retenta na próxima rodada). Nunca lança por título.
   *
   * Throttle: o IGDB responde 429 em rajada (>~22 requisições medidas) — pausa
   * ≥300ms entre chamadas e uma retentativa com espera longa; se persistir, é
   * falha do título (sem watermark) e a rodada segue.
   */
  async enriquecerCriticaIgdb(limite: number): Promise<{
    processados: number;
    ok: number;
    semCritica: number;
    falhas: number;
  }> {
    if (!credenciaisIgdb()) {
      throw new BadRequestException("TWITCH_CLIENT_ID/TWITCH_CLIENT_SECRET ausentes no ambiente.");
    }
    if (this.estado.criticaIgdb.executando) {
      throw new BadRequestException("Job crítica IGDB já em execução.");
    }
    await this.guardaDisco();
    this.estado.criticaIgdb = {
      executando: true,
      processados: 0,
      ok: 0,
      falhas: 0,
      iniciadoEm: new Date().toISOString(),
      atual: null,
    };
    const alvo = (await this.prisma.$queryRawUnsafe<
      { id: string; fonte_id: string; titulo: string }[]
    >(
      `SELECT m.id::text, m.fonte_id, m.titulo
       FROM midia m
       WHERE m.deleted_at IS NULL AND m.tipo = 'GAME' AND m.fonte = 'igdb'
         AND m.critica_igdb_em IS NULL
       ORDER BY m.id
       LIMIT ${Math.min(Math.max(Math.trunc(limite) || 1000, 1), 5000)}`,
    )) as any[];
    this.logger.log(`Backfill critica IGDB: ${alvo.length} títulos alvo.`);
    let semCritica = 0;
    for (const m of alvo) {
      this.estado.criticaIgdb.processados++;
      this.estado.criticaIgdb.atual = m.titulo;
      try {
        const critica = mapearCriticaIgdb(await this.igdbPorId(m.fonte_id));
        if (!critica) {
          // Jogo existe mas não tem nota da imprensa no IGDB — ausência
          // honesta, não erro: marca o watermark e segue.
          semCritica++;
        } else {
          const stats = estatisticas("0-100");
          await this.prisma.avaliacaoFonte.upsert({
            where: { midia_id_fonte: { midia_id: m.id, fonte: "igdb" } },
            create: {
              midia_id: m.id,
              fonte: "igdb",
              rating: critica.rating,
              media_fonte: stats.media,
              desvio_fonte: stats.desvio,
              votos: critica.votos,
              url: critica.url,
            },
            update: {
              rating: critica.rating,
              media_fonte: stats.media,
              desvio_fonte: stats.desvio,
              votos: critica.votos,
              url: critica.url,
            },
          });
          // O bucket Crítica do MEDIA Score só reflete o dado depois do recálculo.
          await this.mediaScore.recalcularEPersistir(m.id);
          this.estado.criticaIgdb.ok++;
        }
        // Watermark SEMPRE (mesmo sem crítica): sem isso a fila travaria em
        // todo jogo que o IGDB não pontua.
        await this.prisma.midia.update({
          where: { id: m.id },
          data: { critica_igdb_em: new Date() },
        });
      } catch (e) {
        // Sem watermark: o título volta na próxima execução (retentável).
        this.estado.criticaIgdb.falhas++;
        this.logger.warn(`Backfill critica IGDB falha [${m.titulo}]: ${String(e).slice(0, 120)}`);
      }
    }
    this.estado.criticaIgdb.executando = false;
    this.estado.criticaIgdb.atual = `fim: ok=${this.estado.criticaIgdb.ok} sem critica=${semCritica} falhas=${this.estado.criticaIgdb.falhas}`;
    this.logger.log(
      `Backfill critica IGDB fim: ok=${this.estado.criticaIgdb.ok} sem critica=${semCritica} falhas=${this.estado.criticaIgdb.falhas}.`,
    );
    return {
      processados: this.estado.criticaIgdb.processados,
      ok: this.estado.criticaIgdb.ok,
      semCritica,
      falhas: this.estado.criticaIgdb.falhas,
    };
  }

  /**
   * T-DADOS-09: resolve (ou cria) o `genero` a partir do nome pt-BR curado.
   * Ordem: `slugifyBasico(nome)` (reusa "aventura"/"musica"/"rpg") → create →
   * (colisão de unique) lookup por slug e por nome. Nunca propaga erro: em
   * último caso devolve null e o título segue sem aquele gênero (a regra é não
   * deixar o título falhar por unique).
   */
  private async resolverGeneroIgdb(nome: string): Promise<{ id: number } | null> {
    const slugFinal = truncarCampo(slugifyBasico(nome), LIMITES.generoSlug);
    const nomeFinal = truncarCampo(nome, LIMITES.generoNome);
    if (!slugFinal || !nomeFinal) return null;
    const porSlug = await this.prisma.genero.findUnique({
      where: { slug: slugFinal },
      select: { id: true },
    });
    if (porSlug) return porSlug;
    try {
      return await this.prisma.genero.create({
        data: { nome: nomeFinal, slug: slugFinal },
        select: { id: true },
      });
    } catch {
      // Colisão de unique (nome ou slug já usados por outra linha): refaz o
      // lookup e segue — nunca falha o título por causa disso.
      const porSlugDepois = await this.prisma.genero.findUnique({
        where: { slug: slugFinal },
        select: { id: true },
      });
      if (porSlugDepois) return porSlugDepois;
      const porNomeDepois = await this.prisma.genero.findUnique({
        where: { nome: nomeFinal },
        select: { id: true },
      });
      return porNomeDepois;
    }
  }

  /**
   * T-DADOS-09: coleta DEDICADA dos gêneros de games no IGDB **por id**
   * (`POST /v4/games` com `where id = <fonte_id>`).
   *
   * Por que existe: 4.995 dos 4.996 GAME do catálogo não têm NENHUM gênero
   * (só 1 tem), e o IGDB tem a fonte legítima (`genres` — 23 slugs medidos).
   * O catálogo já filtra por gênero em `?genero=`, então é dado de produto.
   *
   * Alvo: watermark `generos_igdb_em IS NULL` (retomável). Watermark gravado
   * SEMPRE ao fim do título (mesmo sem gênero) para a fila drenar; erro de
   * rede/429 persistente não marca (retenta). Nunca lança por título.
   *
   * Reusa o mesmo throttle (≥300ms), retry único em 429 e cache de token do
   * `enriquecerCriticaIgdb`; apenas o `fields` da consulta muda.
   */
  async enriquecerGenerosGames(limite: number): Promise<{
    processados: number;
    ok: number;
    semGenero: number;
    vinculos: number;
    falhas: number;
  }> {
    if (!credenciaisIgdb()) {
      throw new BadRequestException("TWITCH_CLIENT_ID/TWITCH_CLIENT_SECRET ausentes no ambiente.");
    }
    if (this.estado.generosGames.executando) {
      throw new BadRequestException("Job gêneros de games IGDB já em execução.");
    }
    await this.guardaDisco();
    this.estado.generosGames = {
      executando: true,
      processados: 0,
      ok: 0,
      falhas: 0,
      iniciadoEm: new Date().toISOString(),
      atual: null,
    };
    const alvo = (await this.prisma.$queryRawUnsafe<
      { id: string; fonte_id: string; titulo: string }[]
    >(
      `SELECT m.id::text, m.fonte_id, m.titulo
       FROM midia m
       WHERE m.deleted_at IS NULL AND m.tipo = 'GAME' AND m.fonte = 'igdb'
         AND m.generos_igdb_em IS NULL
       ORDER BY m.id
       LIMIT ${Math.min(Math.max(Math.trunc(limite) || 1000, 1), 5000)}`,
    )) as any[];
    this.logger.log(`Backfill generos IGDB: ${alvo.length} títulos alvo.`);
    let semGenero = 0;
    let vinculos = 0;
    for (const m of alvo) {
      this.estado.generosGames.processados++;
      this.estado.generosGames.atual = m.titulo;
      try {
        const generos = generosDoPayload(
          await this.igdbPorId(m.fonte_id, "name, genres.name, genres.slug"),
        );
        let vinculosTitulo = 0;
        for (const { slug } of generos) {
          const genero = await this.resolverGeneroIgdb(MAPA_GENEROS_IGDB[slug] ?? slug);
          if (!genero) continue;
          await this.prisma.midiaGenero.upsert({
            where: { midia_id_genero_id: { midia_id: m.id, genero_id: genero.id } },
            create: { midia_id: m.id, genero_id: genero.id },
            update: {},
          });
          vinculosTitulo++;
        }
        vinculos += vinculosTitulo;
        if (generos.length === 0) {
          // Jogo existe mas o IGDB não devolve gênero — ausência honesta,
          // não erro: marca o watermark e segue.
          semGenero++;
        } else {
          this.estado.generosGames.ok++;
        }
        // Watermark SEMPRE (mesmo sem gênero): sem isso a fila travaria em
        // todo jogo sem `genres`.
        await this.prisma.midia.update({
          where: { id: m.id },
          data: { generos_igdb_em: new Date() },
        });
      } catch (e) {
        // Sem watermark: o título volta na próxima execução (retentável).
        this.estado.generosGames.falhas++;
        this.logger.warn(`Backfill generos IGDB falha [${m.titulo}]: ${String(e).slice(0, 120)}`);
      }
    }
    this.estado.generosGames.executando = false;
    this.estado.generosGames.atual = `fim: ok=${this.estado.generosGames.ok} sem_genero=${semGenero} vinculos=${vinculos} falhas=${this.estado.generosGames.falhas}`;
    this.logger.log(
      `Backfill generos IGDB fim: ok=${this.estado.generosGames.ok} sem_genero=${semGenero} vinculos=${vinculos} falhas=${this.estado.generosGames.falhas}.`,
    );
    return {
      processados: this.estado.generosGames.processados,
      ok: this.estado.generosGames.ok,
      semGenero,
      vinculos,
      falhas: this.estado.generosGames.falhas,
    };
  }

  /**
   * T-DADOS-07: avaliações públicas de LIVROS no OpenLibrary por id do work.
   *
   * Por que existe: dos 651 livros do catálogo, 600 nunca tiveram nota coletada
   * (`avaliacoes_atualizadas_em IS NULL`) e ficam fora dos rankings. A fonte
   * expõe `GET /works/<id>/ratings.json` → `{ summary: { average, count } }`
   * (escala 0–5) e o import já gravou o id exato em `fonte_id` (`OL…W`).
   *
   * Usa o ADAPTER real (`ColetaService`) para que a correção do lookup por id
   * valha em produção e não duplique HTTP. Watermark gravado SEMPRE ao fim do
   * título (com ou sem nota) para a fila drenar; falha de rede/inatividade não
   * marca (retenta na próxima rodada). Nunca lança por título.
   *
   * A fila aparece sozinha quando `MEDIA_PREPARACAO_ENABLED=true` (gate de
   * plataforma compartilhado com os demais adapters); antes disso é no-op por
   * desenho — `contarPendentes()` devolve 0 e o drain nem chama este job.
   */
  async enriquecerAvaliacaoLivros(limite: number): Promise<{
    processados: number;
    ok: number;
    semAvaliacao: number;
    falhas: number;
  }> {
    if (this.estado.avaliacaoLivros.executando) {
      throw new BadRequestException("Job avaliação de livros já em execução.");
    }
    await this.guardaDisco();
    this.estado.avaliacaoLivros = {
      executando: true,
      processados: 0,
      ok: 0,
      falhas: 0,
      iniciadoEm: new Date().toISOString(),
      atual: null,
    };
    const alvo = (await this.prisma.$queryRawUnsafe<
      { id: string; fonte_id: string; titulo: string }[]
    >(
      `SELECT m.id::text, m.fonte_id, m.titulo
       FROM midia m
       WHERE m.deleted_at IS NULL AND m.tipo = 'LIVRO' AND m.fonte = 'openlibrary'
         AND m.avaliacoes_atualizadas_em IS NULL
       ORDER BY m.id
       LIMIT ${Math.min(Math.max(Math.trunc(limite) || 1, 1), 800)}`,
    )) as any[];
    const adapter = this.coleta.adaptadores.find((a) => a.id === "openlibrary");
    this.logger.log(`Backfill avaliação de livros: ${alvo.length} títulos alvo.`);
    let semAvaliacao = 0;
    for (const m of alvo) {
      this.estado.avaliacaoLivros.processados++;
      this.estado.avaliacaoLivros.atual = m.titulo;
      try {
        if (!adapter || !adapter.ativo()) {
          throw new Error("Adapter openlibrary indisponível ou inativo.");
        }
        await this.pausa(PAUSA_OPENLIBRARY_MS);
        const notas = await adapter.coletar({
          tipo: "LIVRO",
          titulo: m.titulo,
          idsExternos: { openlibrary: m.fonte_id },
        });
        const nota = notas[0];
        if (!nota) {
          // Ausência honesta (obra sem nota): sai da fila pelo watermark.
          semAvaliacao++;
        } else {
          await this.prisma.avaliacaoFonte.upsert({
            where: { midia_id_fonte: { midia_id: m.id, fonte: "openlibrary" } },
            create: {
              midia_id: m.id,
              fonte: "openlibrary",
              rating: nota.rating,
              media_fonte: nota.media_fonte,
              desvio_fonte: nota.desvio_fonte,
              votos: nota.votos,
              url: nota.url,
            },
            update: {
              rating: nota.rating,
              media_fonte: nota.media_fonte,
              desvio_fonte: nota.desvio_fonte,
              votos: nota.votos,
              url: nota.url,
            },
          });
          await this.mediaScore.recalcularEPersistir(m.id);
          this.estado.avaliacaoLivros.ok++;
        }
        // Watermark SEMPRE (reusa a semântica D-410): sem isso a fila travaria
        // em todo livro sem nota na fonte.
        await this.prisma.midia.update({
          where: { id: m.id },
          data: { avaliacoes_atualizadas_em: new Date() },
        });
      } catch (e) {
        // Sem watermark: o título volta na próxima execução (retentável).
        this.estado.avaliacaoLivros.falhas++;
        this.logger.warn(
          `Backfill avaliação de livros falha [${m.titulo}]: ${String(e).slice(0, 120)}`,
        );
      }
    }
    this.estado.avaliacaoLivros.executando = false;
    this.estado.avaliacaoLivros.atual = `fim: ok=${this.estado.avaliacaoLivros.ok} sem avaliacao=${semAvaliacao} falhas=${this.estado.avaliacaoLivros.falhas}`;
    this.logger.log(
      `Backfill avaliação de livros fim: ok=${this.estado.avaliacaoLivros.ok} sem avaliacao=${semAvaliacao} falhas=${this.estado.avaliacaoLivros.falhas}.`,
    );
    return {
      processados: this.estado.avaliacaoLivros.processados,
      ok: this.estado.avaliacaoLivros.ok,
      semAvaliacao,
      falhas: this.estado.avaliacaoLivros.falhas,
    };
  }

  /**
   * T-DADOS-10: crítica de FILME/SERIE via OMDb **por id IMDb**.
   *
   * Por que existe: 10.998 títulos FILME+SERIE e só 148 têm qualquer crítica
   * externa (metacritic = 0 linhas). O TMDB expõe o `imdb_id` (filme:
   * `imdb_id`; série: `external_ids.imdb_id`) e o endpoint `?i=<id>` do OMDb
   * é EXATO e já traz `Ratings` (RT/Metacritic) sem `tomatoes=true`.
   *
   * Teto diário: a cota grátis é 1.000 req/dia; o job processa no máximo
   * `ORCAMENTO_OMDB_DIARIO` (900) títulos por dia, contando os títulos
   * distintos já consultados hoje em avaliacao_fonte (omdb/RT/MC). Sem
   * `imdb_id` não há requisição: marca o watermark e segue (ausência
   * honesta — não gasta cota).
   *
   * Watermark `critica_omdb_em` gravado SEMPRE ao fim do título (com ou sem
   * nota/imdb_id); exceção de rede/429 não marca (retenta amanhã). Nunca
   * lança por título.
   */
  async enriquecerCriticaOmdb(limite: number): Promise<{
    processados: number;
    ok: number;
    semImdb: number;
    semNota: number;
    falhas: number;
    queries: number;
  }> {
    const chave = process.env.TMDB_API_KEY;
    if (!chave) throw new BadRequestException("TMDB_API_KEY ausente no ambiente.");
    if (this.estado.criticaOmdb.executando) {
      throw new BadRequestException("Job crítica OMDb já em execução.");
    }
    await this.guardaDisco();
    this.estado.criticaOmdb = {
      ...estadoVazio(),
      executando: true,
      iniciadoEm: new Date().toISOString(),
    };

    const usadosHoje = await this.queriesOmdbHoje();
    const restante = orcamentoOmdbRestante(usadosHoje);
    if (restante <= 0) {
      this.estado.criticaOmdb.executando = false;
      this.estado.criticaOmdb.atual = "fim: cota diária atingida";
      this.logger.log(
        `Backfill crítica OMDb: cota diária atingida (${usadosHoje}/${ORCAMENTO_OMDB_DIARIO}) — nada processado.`,
      );
      return { processados: 0, ok: 0, semImdb: 0, semNota: 0, falhas: 0, queries: 0 };
    }

    const limiteEfetivo = Math.min(Math.max(Math.trunc(limite) || 1, 1), restante);
    const alvoBruto = (await this.prisma.$queryRawUnsafe<
      { id: string; tipo: string; fonte_id: string; titulo: string }[]
    >(
      `SELECT m.id::text, m.tipo::text, m.fonte_id, m.titulo
       FROM midia m
       WHERE m.deleted_at IS NULL AND m.fonte IN ('tmdb','tmdb_tv')
         AND m.tipo IN ('FILME','SERIE') AND m.critica_omdb_em IS NULL
       ORDER BY m.id
       LIMIT ${limiteEfetivo}`,
    )) as any[];
    // Defensivo: mesmo que o mock/driver devolva mais linhas que o LIMIT.
    const alvo = alvoBruto.slice(0, limiteEfetivo);
    const adapter = this.coleta.adaptadores.find((a) => a.id === "omdb");
    this.logger.log(
      `Backfill crítica OMDb: ${alvo.length} títulos alvo (usados hoje=${usadosHoje}, restante=${restante}).`,
    );
    let semImdb = 0;
    let semNota = 0;
    let queries = 0;
    for (const m of alvo) {
      this.estado.criticaOmdb.processados++;
      this.estado.criticaOmdb.atual = m.titulo;
      try {
        if (!adapter || !adapter.ativo()) {
          throw new Error("Adapter omdb indisponível ou inativo.");
        }
        const caminho = `/${m.tipo === "SERIE" ? "tv" : "movie"}/${encodeURIComponent(
          m.fonte_id,
        )}?append_to_response=external_ids`;
        const payload = await this.tmdb(caminho, chave);
        const imdbId = imdbIdDoPayload(payload, m.tipo);
        if (!imdbId) {
          // Ausência honesta: sem id não há consulta ao OMDb (não gasta cota).
          semImdb++;
        } else {
          await this.pausa(PAUSA_OMDB_MS);
          queries++;
          const notas = await adapter.coletar({
            tipo: m.tipo,
            titulo: m.titulo,
            idsExternos: { omdb: imdbId },
          });
          if (notas.length === 0) {
            semNota++;
          } else {
            for (const nota of notas) {
              // URL vazia no update preserva a anterior (Prisma omite undefined).
              const urlNova = nota.url && nota.url.trim() ? nota.url : undefined;
              await this.prisma.avaliacaoFonte.upsert({
                where: { midia_id_fonte: { midia_id: m.id, fonte: nota.fonte } },
                create: {
                  midia_id: m.id,
                  fonte: nota.fonte,
                  rating: nota.rating,
                  media_fonte: nota.media_fonte,
                  desvio_fonte: nota.desvio_fonte,
                  votos: nota.votos,
                  url: urlNova,
                },
                update: {
                  rating: nota.rating,
                  media_fonte: nota.media_fonte,
                  desvio_fonte: nota.desvio_fonte,
                  votos: nota.votos,
                  url: urlNova,
                },
              });
            }
            // O bucket Crítica do MEDIA Score só reflete o dado após o recálculo.
            await this.mediaScore.recalcularEPersistir(m.id);
            this.estado.criticaOmdb.ok++;
          }
        }
        // Watermark SEMPRE (mesmo sem id/nota): sem isso a fila travaria em
        // todo título que o OMDb não pontua.
        await this.prisma.midia.update({
          where: { id: m.id },
          data: { critica_omdb_em: new Date() },
        });
      } catch (e) {
        // Sem watermark: o título volta na próxima execução (retentável).
        this.estado.criticaOmdb.falhas++;
        this.logger.warn(`Backfill crítica OMDb falha [${m.titulo}]: ${String(e).slice(0, 120)}`);
      }
    }
    this.estado.criticaOmdb.executando = false;
    this.estado.criticaOmdb.atual = `fim: ok=${this.estado.criticaOmdb.ok} sem_imdb=${semImdb} sem_nota=${semNota} falhas=${this.estado.criticaOmdb.falhas} queries=${queries}`;
    this.logger.log(
      `Backfill crítica OMDb fim: ok=${this.estado.criticaOmdb.ok} sem_imdb=${semImdb} sem_nota=${semNota} falhas=${this.estado.criticaOmdb.falhas} queries=${queries}.`,
    );
    return {
      processados: this.estado.criticaOmdb.processados,
      ok: this.estado.criticaOmdb.ok,
      semImdb,
      semNota,
      falhas: this.estado.criticaOmdb.falhas,
      queries,
    };
  }

  /**
   * T-DADOS-03: `POST /v4/games` por id EXATO (`fonte_id` do jogo), com o
   * mesmo corpo/headers do `igdb.adapter.ts` — mas `where id = <id>` em vez de
   * `search "<titulo>"` (a busca por relevância devolve DLC/porta). Throttle
   * ≥300ms antes de cada chamada e retentativa única em HTTP 429; demais erros
   * propagam (quem chama conta como falha e não marca o watermark).
   */
  private async igdbPorId(
    fonteId: string,
    fields = "name, slug, aggregated_rating, aggregated_rating_count",
  ): Promise<any[]> {
    const id = Number(fonteId);
    // fonte_id não-inteiro não é consultável no IGDB (nenhum jogo) → sem dado.
    if (!Number.isInteger(id) || id <= 0) return [];
    const token = await obterTokenTwitch();
    if (!token) throw new Error("Token do IGDB indisponível (credenciais Twitch).");
    const corpo = `fields ${fields}; where id = ${id}; limit 1;`;
    const headers = {
      "client-id": process.env.TWITCH_CLIENT_ID ?? "",
      "authorization": `Bearer ${token}`,
      "accept": "application/json",
      "content-type": "text/plain",
    };
    for (let tentativa = 0; ; tentativa++) {
      await this.pausa(PAUSA_IGDB_MS);
      try {
        return await postJson<any[]>(IGDB_URL, corpo, { headers, timeoutMs: 20000 });
      } catch (e) {
        const status = (e as { status?: number } | null)?.status;
        const eh429 = status === 429 || String(e).includes("HTTP 429");
        if (eh429 && tentativa === 0) {
          this.logger.warn("Backfill IGDB: HTTP 429 — aguardando e repetindo uma vez.");
          await this.pausa(ESPERA_429_MS);
          continue;
        }
        throw e;
      }
    }
  }

  /**
   * T178: continuidade em escala — coleções de filmes (franquia + país) e
   * temporadas/episódios de séries que AINDA NÃO têm temporada — retomável.
   */
  async continuidade(limite: number): Promise<{ processados: number; ok: number; falhas: number }> {
    const chave = process.env.TMDB_API_KEY;
    if (!chave) throw new BadRequestException("TMDB_API_KEY ausente no ambiente.");
    if (this.estado.continuidade.executando) {
      throw new BadRequestException("Job continuidade já em execução.");
    }
    await this.guardaDisco();
    this.estado.continuidade = {
      executando: true,
      processados: 0,
      ok: 0,
      falhas: 0,
      iniciadoEm: new Date().toISOString(),
      atual: null,
    };

    // --- Séries sem temporada (o passo pesado vem primeiro) ---
    const series = (await this.prisma.$queryRawUnsafe<
      { id: string; fonte_id: string; titulo: string; pais_origem: string | null }[]
    >(
      `SELECT m.id::text, m.fonte_id, m.titulo, m.pais_origem::text
       FROM midia m
       WHERE m.deleted_at IS NULL AND m.fonte = 'tmdb_tv'
         AND NOT EXISTS (SELECT 1 FROM temporada t WHERE t.midia_id = m.id)
       ORDER BY m.id
       LIMIT ${Math.min(Math.max(Math.trunc(limite) || 2000, 1), 11000)}`,
    )) as any[];
    this.logger.log(`Backfill continuidade: ${series.length} séries sem temporada.`);
    let seasonsBuscadas = 0;
    for (const s of series) {
      this.estado.continuidade.processados++;
      this.estado.continuidade.atual = s.titulo;
      try {
        const tv = await this.tmdb(`/tv/${s.fonte_id}`, chave);
        if (!s.pais_origem) {
          const pais = tv.origin_country?.[0];
          if (pais) {
            await this.prisma.midia.update({ where: { id: s.id }, data: { pais_origem: pais } });
          }
        }
        const lista = mapearListaTemporadas(tv);
        if (lista.length === 0) {
          this.estado.continuidade.ok++;
          continue;
        }
        for (const t of lista) {
          if (seasonsBuscadas >= MAX_TEMPORADAS_POR_RUN) break;
          const temporada = await this.prisma.temporada.upsert({
            where: { midia_id_numero: { midia_id: s.id, numero: t.numero } },
            create: {
              midia_id: s.id,
              numero: t.numero,
              titulo: t.titulo,
              ano: t.ano,
              poster_url: t.poster_url,
            },
            update: { titulo: t.titulo, ano: t.ano, poster_url: t.poster_url },
          });
          const season = await this.tmdb(`/tv/${s.fonte_id}/season/${t.numero}`, chave);
          for (const e of mapearEpisodios(season)) {
            await this.prisma.episodio.upsert({
              where: { temporada_id_numero: { temporada_id: temporada.id, numero: e.numero } },
              create: {
                temporada_id: temporada.id,
                numero: e.numero,
                titulo: e.titulo,
                data_exibicao: e.data_exibicao,
                nota_publico: e.nota_publico,
              },
              update: {
                titulo: e.titulo,
                data_exibicao: e.data_exibicao,
                nota_publico: e.nota_publico,
              },
            });
          }
          seasonsBuscadas++;
        }
        this.estado.continuidade.ok++;
      } catch (e) {
        this.estado.continuidade.falhas++;
        this.logger.warn(`Backfill continuidade falha [${s.titulo}]: ${String(e).slice(0, 120)}`);
      }
    }

    // --- Filmes sem país/coleção ---
    const filmes = (await this.prisma.$queryRawUnsafe<
      { id: string; fonte_id: string; titulo: string; ano_lancamento: number | null }[]
    >(
      `SELECT m.id::text, m.fonte_id, m.titulo, m.ano_lancamento
       FROM midia m
       WHERE m.deleted_at IS NULL AND m.fonte = 'tmdb' AND m.tipo = 'FILME'
         AND m.pais_origem IS NULL
       ORDER BY m.id
       LIMIT ${Math.min(Math.max(Math.trunc(limite) || 2000, 1), 11000)}`,
    )) as any[];
    this.logger.log(`Backfill continuidade: ${filmes.length} filmes sem país.`);
    const porColecao = new Map<string, { id: string; ano: number | null }[]>();
    let filmesOk = 0;
    for (const f of filmes) {
      this.estado.continuidade.processados++;
      this.estado.continuidade.atual = f.titulo;
      try {
        const payload = await this.tmdb(`/movie/${f.fonte_id}`, chave);
        const pais = payload.production_countries?.[0]?.iso_3166_1 ?? null;
        if (pais) {
          await this.prisma.midia.update({ where: { id: f.id }, data: { pais_origem: pais } });
        }
        const colecao = payload.belongs_to_collection?.name;
        if (colecao) {
          const base = slugBaseFranquia(colecao);
          if (base) {
            let franquia = await this.prisma.franquia.findFirst({
              where: { OR: [{ slug: base }, { slug: { startsWith: `${base}-` } }] },
              select: { id: true },
            });
            if (!franquia) {
              franquia = await this.prisma.franquia.create({
                data: {
                  slug: base,
                  nome: colecao.replace(/:?\s*(Coleção|Collection)$/i, "").trim(),
                },
              });
            }
            await this.prisma.midiaFranquia.upsert({
              where: { midia_id_franquia_id: { midia_id: f.id, franquia_id: franquia.id } },
              create: {
                midia_id: f.id,
                franquia_id: franquia.id,
                ordem_lancamento: f.ano_lancamento ?? 9999,
                ordem_cronologica: null,
              },
              update: {}, // curadoria preservada
            });
            const lista = porColecao.get(franquia.id) ?? [];
            lista.push({ id: f.id, ano: f.ano_lancamento });
            porColecao.set(franquia.id, lista);
          }
        }
        filmesOk++;
      } catch (e) {
        this.estado.continuidade.falhas++;
        this.logger.warn(`Backfill continuidade filme [${f.titulo}]: ${String(e).slice(0, 120)}`);
      }
    }

    // arestas SEQUENCIA_DE entre consecutivos por coleção
    let arestas = 0;
    for (const [, lista] of porColecao) {
      for (const a of arestasSequencia(lista)) {
        const existe = await this.prisma.relacaoObra.findFirst({
          where: { origem_id: a.anteriorId, destino_id: a.sequenciaId },
          select: { id: true },
        });
        if (!existe) {
          await this.prisma.relacaoObra.create({
            data: {
              origem_id: a.anteriorId,
              destino_id: a.sequenciaId,
              tipo: "SEQUENCIA_DE",
              nota_editorial: "Sequência direta na coleção",
            },
          });
          arestas++;
        }
      }
    }

    this.estado.continuidade.executando = false;
    this.estado.continuidade.atual = `fim: séries=${this.estado.continuidade.ok} filmes=${filmesOk} arestas=${arestas}`;
    this.logger.log(
      `Backfill continuidade fim: séries ok=${this.estado.continuidade.ok} filmes ok=${filmesOk} arestas=${arestas} falhas=${this.estado.continuidade.falhas}.`,
    );
    return {
      processados: this.estado.continuidade.processados,
      ok: this.estado.continuidade.ok + filmesOk,
      falhas: this.estado.continuidade.falhas,
    };
  }

  /**
   * T-DADOS-06: fecha as arestas SEQUENCIA_DE que faltam nas franquias
   * incompletas. O job `continuidade` já sabe derivar essas arestas, mas o
   * gatilho dele (`seriesSemTemporada`/`filmesSemPais`) já está esgotado — ele
   * nunca re-roda. As franquias criadas depois (T-DADOS-01) ficaram sem aresta,
   * e nenhum outro gatilho as revisita.
   *
   * NÃO faz chamada externa nenhuma: a aresta é derivada do PRÓPRIO grafo
   * (`midia_franquia` + `midia.ano_lancamento`) com o mesmo helper
   * `arestasSequencia` e o MESMO shape de create do `continuidade`
   * (origem = mais antigo, `tipo: "SEQUENCIA_DE"`, mesma `nota_editorial`).
   *
   * Auto-esgotável SEM watermark: a fila é "franquia incompleta" —
   * `COUNT(membros com ano) >= 2` E
   * `COUNT(arestas SEQUENCIA_DE entre esses membros) < COUNT(membros com ano) - 1`.
   * Ao criar a aresta que falta a franquia sai da fila naturalmente; membro sem
   * `ano_lancamento` não gera aresta (ausência honesta) e franquia com só 1
   * membro com ano nunca entra na fila.
   *
   * Corrida de drain: `@@unique([origem_id, destino_id])` em `relacao_obra` —
   * `P2002` no create é contado como "já existia" (não como falha). Nunca lança
   * por franquia.
   */
  async enriquecerArestasFranquia(limite: number): Promise<{
    processados: number;
    ok: number;
    arestasCriadas: number;
    jaExistiam: number;
    falhas: number;
  }> {
    if (this.estado.arestasFranquia.executando) {
      throw new BadRequestException("Job arestas de franquia já em execução.");
    }
    await this.guardaDisco();
    this.estado.arestasFranquia = {
      executando: true,
      processados: 0,
      ok: 0,
      falhas: 0,
      iniciadoEm: new Date().toISOString(),
      atual: null,
    };
    const alvo = (await this.prisma.$queryRawUnsafe<{ franquia_id: string }[]>(
      `WITH ${SQL_FRANQUIAS_FALTANDO_ARESTA}
       SELECT fm.franquia_id::text AS franquia_id
       ${SQL_SELECT_FRANQUIAS_INCOMPLETAS}
       ORDER BY fm.franquia_id
       LIMIT ${Math.min(Math.max(Math.trunc(limite) || 2000, 1), 2000)}`,
    )) as any[];
    this.logger.log(`Backfill arestas de franquia: ${alvo.length} franquias alvo.`);
    let arestasCriadas = 0;
    let jaExistiam = 0;
    for (const f of alvo) {
      this.estado.arestasFranquia.processados++;
      this.estado.arestasFranquia.atual = f.franquia_id;
      try {
        const membros = (await this.prisma.$queryRawUnsafe<
          { id: string; ano_lancamento: number | null; titulo: string }[]
        >(
          `SELECT m.id::text AS id, m.ano_lancamento, m.titulo
           FROM midia_franquia mf
           JOIN midia m ON m.id = mf.midia_id
           WHERE mf.franquia_id = $1::uuid AND m.deleted_at IS NULL
           ORDER BY m.id`,
          f.franquia_id,
        )) as any[];
        for (const a of arestasSequencia(
          membros.map((m) => ({ id: m.id, ano: m.ano_lancamento })),
        )) {
          const existe = await this.prisma.relacaoObra.findFirst({
            where: { origem_id: a.anteriorId, destino_id: a.sequenciaId },
            select: { id: true },
          });
          if (existe) {
            jaExistiam++;
            continue;
          }
          try {
            await this.prisma.relacaoObra.create({
              data: {
                origem_id: a.anteriorId,
                destino_id: a.sequenciaId,
                tipo: "SEQUENCIA_DE",
                nota_editorial: "Sequência direta na coleção",
              },
            });
            arestasCriadas++;
          } catch (e) {
            // Corrida com outro drain: a unique (origem_id, destino_id) já
            // garantiu a aresta — não é falha.
            if ((e as { code?: string } | null)?.code === "P2002") {
              jaExistiam++;
              continue;
            }
            throw e;
          }
        }
        this.estado.arestasFranquia.ok++;
      } catch (e) {
        this.estado.arestasFranquia.falhas++;
        this.logger.warn(
          `Backfill arestas de franquia falha [${f.franquia_id}]: ${String(e).slice(0, 120)}`,
        );
      }
    }
    this.estado.arestasFranquia.executando = false;
    this.estado.arestasFranquia.atual = `fim: arestas=${arestasCriadas} ja_existiam=${jaExistiam} falhas=${this.estado.arestasFranquia.falhas}`;
    this.logger.log(
      `Backfill arestas de franquia fim: franquias=${this.estado.arestasFranquia.ok} arestas=${arestasCriadas} ja_existiam=${jaExistiam} falhas=${this.estado.arestasFranquia.falhas}.`,
    );
    return {
      processados: this.estado.arestasFranquia.processados,
      ok: this.estado.arestasFranquia.ok,
      arestasCriadas,
      jaExistiam,
      falhas: this.estado.arestasFranquia.falhas,
    };
  }

  /**
   * T179: contagem das filas pendentes — base do drain auto-reagendável e do
   * relatório. Zero em todas = backfills completos (nada a fazer).
   */
  async contarPendentes(): Promise<{
    semElenco: number;
    seriesSemTemporada: number;
    filmesSemPais: number;
    metadadosRicos: number;
    provedores: number;
    criticaIgdb: number;
    // T-DADOS-09: fila de gêneros de games (IGDB por id).
    generosGames: number;
    arestasFranquia: number;
    avaliacaoLivros: number;
    // T-DADOS-08: fila de localização (en/es) + classificação do TMDB.
    localizacao: number;
    // T-DADOS-10: fila da crítica de FILME/SERIE via OMDb (por id IMDb).
    criticaOmdb: number;
  }> {
    const r = await this.prisma.$queryRawUnsafe<
      {
        sem_elenco: number;
        sem_temp: number;
        sem_pais: number;
        ricos: number;
        provedores: number;
        critica_igdb: number;
        generos_games: number;
        arestas_franquia: number;
        avaliacao_livros: number;
        localizacao: number;
        critica_omdb: number;
      }[]
    >(`SELECT
        (SELECT COUNT(*)::int FROM midia m
          WHERE m.deleted_at IS NULL AND m.fonte IN ('tmdb','tmdb_tv')
            AND NOT EXISTS (SELECT 1 FROM midia_elenco e WHERE e.midia_id = m.id)) AS sem_elenco,
        (SELECT COUNT(*)::int FROM midia m
          WHERE m.deleted_at IS NULL AND m.fonte = 'tmdb_tv'
            AND NOT EXISTS (SELECT 1 FROM temporada t WHERE t.midia_id = m.id)) AS sem_temp,
        (SELECT COUNT(*)::int FROM midia m
          WHERE m.deleted_at IS NULL AND m.fonte = 'tmdb' AND m.tipo = 'FILME'
            AND m.pais_origem IS NULL) AS sem_pais,
        (SELECT COUNT(*)::int FROM midia m
          WHERE m.deleted_at IS NULL AND m.fonte IN ('tmdb','tmdb_tv')
            AND m.metadados_ricos_em IS NULL) AS ricos,
        (SELECT COUNT(*)::int FROM midia m
          WHERE m.deleted_at IS NULL AND m.fonte IN ('tmdb','tmdb_tv')
            AND m.provedores_em IS NULL) AS provedores,
        (SELECT COUNT(*)::int FROM midia m
          WHERE m.deleted_at IS NULL AND m.tipo = 'GAME' AND m.fonte = 'igdb'
            AND m.critica_igdb_em IS NULL) AS critica_igdb,
        (SELECT COUNT(*)::int FROM midia m
          WHERE m.deleted_at IS NULL AND m.tipo = 'GAME' AND m.fonte = 'igdb'
            AND m.generos_igdb_em IS NULL) AS generos_games,
        (SELECT COUNT(*)::int FROM midia m
          WHERE m.deleted_at IS NULL AND m.tipo = 'LIVRO' AND m.fonte = 'openlibrary'
            AND m.avaliacoes_atualizadas_em IS NULL) AS avaliacao_livros,
        (SELECT COUNT(*)::int FROM midia m
          WHERE m.deleted_at IS NULL AND m.fonte IN ('tmdb','tmdb_tv')
            AND m.localizacao_em IS NULL) AS localizacao,
        (SELECT COUNT(*)::int FROM midia m
          WHERE m.deleted_at IS NULL AND m.fonte IN ('tmdb','tmdb_tv')
            AND m.tipo IN ('FILME','SERIE')
            AND m.critica_omdb_em IS NULL) AS critica_omdb,
        (WITH ${SQL_FRANQUIAS_FALTANDO_ARESTA}
          SELECT COUNT(*)::int ${SQL_SELECT_FRANQUIAS_INCOMPLETAS}) AS arestas_franquia`);
    const row = r[0];
    // T-DADOS-07: fila condicionada ao gate da fonte — inativa = 0 (dormente).
    const filaAvaliacaoLivros = this.filaAvaliacaoLivrosAtiva()
      ? Number(row?.avaliacao_livros ?? 0)
      : 0;
    // T-DADOS-10: fila gateada pela fonte E pelo orçamento diário do OMDb —
    // cota esgotada = 0 (o drain não gira em falso até o dia seguinte).
    const filaCriticaOmdbAtiva = this.filaCriticaOmdbAtiva();
    const restanteOmdb = filaCriticaOmdbAtiva
      ? orcamentoOmdbRestante(await this.queriesOmdbHoje())
      : 0;
    return {
      semElenco: Number(row?.sem_elenco ?? 0),
      seriesSemTemporada: Number(row?.sem_temp ?? 0),
      filmesSemPais: Number(row?.sem_pais ?? 0),
      metadadosRicos: Number(row?.ricos ?? 0),
      provedores: Number(row?.provedores ?? 0),
      criticaIgdb: Number(row?.critica_igdb ?? 0),
      generosGames: Number(row?.generos_games ?? 0),
      arestasFranquia: Number(row?.arestas_franquia ?? 0),
      avaliacaoLivros: filaAvaliacaoLivros,
      localizacao: Number(row?.localizacao ?? 0),
      criticaOmdb: restanteOmdb > 0 ? Number(row?.critica_omdb ?? 0) : 0,
    };
  }

  /**
   * T179: drain de UMA rodada — alterna continuidade e metadados enquanto
   * houver fila e o orçamento de tempo permitir. Retorna o que fez; o
   * agendador (BackfillDrainService) decide quando chamar de novo.
   * Nunca lança: falha de uma parte vira `erro` no resumo.
   */
  async drenarLote(orçamentoMs: number): Promise<{
    pendentesAntes: Awaited<ReturnType<BackfillService["contarPendentes"]>>;
    pendentesDepois: Awaited<ReturnType<BackfillService["contarPendentes"]>>;
    lotes: { tipo: BackfillTipo; ok: number; falhas: number }[];
    erro?: string;
  }> {
    const inicio = Date.now();
    const lotes: { tipo: BackfillTipo; ok: number; falhas: number }[] = [];
    const pendentesAntes = await this.contarPendentes();
    let erro: string | undefined;
    try {
      // Continuidade primeiro (temporadas/episódios = maior valor visível).
      if (pendentesAntes.seriesSemTemporada > 0 || pendentesAntes.filmesSemPais > 0) {
        const r = await this.continuidade(2000);
        lotes.push({ tipo: "continuidade", ok: r.ok, falhas: r.falhas });
      }
      if (Date.now() - inicio < orçamentoMs && pendentesAntes.semElenco > 0) {
        const r = await this.enriquecerMetadados(2000);
        lotes.push({ tipo: "metadados", ok: r.ok, falhas: r.falhas });
      }
      // T-DADOS-01: por último a fila mais nova (duração/gêneros/franquia).
      if (Date.now() - inicio < orçamentoMs && pendentesAntes.metadadosRicos > 0) {
        const r = await this.enriquecerMetadadosRicos(2000);
        lotes.push({ tipo: "metadadosRicos", ok: r.ok, falhas: r.falhas });
      }
      // T-DADOS-02: fecho com os provedores de streaming (ficha "Onde assistir").
      if (Date.now() - inicio < orçamentoMs && pendentesAntes.provedores > 0) {
        const r = await this.enriquecerProvedores(2000);
        lotes.push({ tipo: "provedores", ok: r.ok, falhas: r.falhas });
      }
      // T-DADOS-03: por último a crítica de games (IGDB por id, com throttle —
      // é a fila mais lenta: 300ms por título, ~10min num lote de 2000).
      // `ok` soma os títulos SEM crítica: eles saíram da fila (watermark).
      if (Date.now() - inicio < orçamentoMs && pendentesAntes.criticaIgdb > 0) {
        const r = await this.enriquecerCriticaIgdb(2000);
        lotes.push({ tipo: "criticaIgdb", ok: r.ok + r.semCritica, falhas: r.falhas });
      }
      // T-DADOS-09: gêneros de games no IGDB (mesmo throttle da crítica).
      // `ok` soma os títulos SEM gênero: eles saíram da fila (watermark).
      if (Date.now() - inicio < orçamentoMs && pendentesAntes.generosGames > 0) {
        const r = await this.enriquecerGenerosGames(2000);
        lotes.push({ tipo: "generosGames", ok: r.ok + r.semGenero, falhas: r.falhas });
      }
      // T-DADOS-06: fecha as arestas SEQUENCIA_DE que faltam nas franquias
      // incompletas. Deriva do próprio grafo (zero chamada externa) e é
      // auto-esgotável — a franquia sai da fila ao ganhar a aresta que falta.
      if (Date.now() - inicio < orçamentoMs && pendentesAntes.arestasFranquia > 0) {
        const r = await this.enriquecerArestasFranquia(2000);
        lotes.push({ tipo: "arestasFranquia", ok: r.ok, falhas: r.falhas });
      }
      // T-DADOS-07: livros sem avaliação pública (OpenLibrary por id, 250ms por
      // título). `ok` soma os títulos SEM nota: eles saíram da fila (watermark).
      if (Date.now() - inicio < orçamentoMs && pendentesAntes.avaliacaoLivros > 0) {
        const r = await this.enriquecerAvaliacaoLivros(800);
        lotes.push({ tipo: "avaliacaoLivros", ok: r.ok + r.semAvaliacao, falhas: r.falhas });
      }
      // T-DADOS-08: localização en/es + classificação (TMDB por id).
      if (Date.now() - inicio < orçamentoMs && pendentesAntes.localizacao > 0) {
        const r = await this.enriquecerLocalizacao(2000);
        lotes.push({ tipo: "localizacao", ok: r.ok, falhas: r.falhas });
      }
      // T-DADOS-10: crítica de FILME/SERIE via OMDb (throttle 300ms, teto
      // diário de 900). `ok` soma sem_imdb/sem_nota: saíram da fila.
      if (Date.now() - inicio < orçamentoMs && (pendentesAntes.criticaOmdb ?? 0) > 0) {
        const r = await this.enriquecerCriticaOmdb(ORCAMENTO_OMDB_DIARIO);
        lotes.push({
          tipo: "criticaOmdb",
          ok: r.ok + r.semImdb + r.semNota,
          falhas: r.falhas,
        });
      }
    } catch (e) {
      erro = String((e as Error)?.message ?? e).slice(0, 200);
      this.logger.warn(`Drain: ${erro}`);
    }
    const pendentesDepois = await this.contarPendentes();
    return { pendentesAntes, pendentesDepois, lotes, ...(erro ? { erro } : {}) };
  }
}
