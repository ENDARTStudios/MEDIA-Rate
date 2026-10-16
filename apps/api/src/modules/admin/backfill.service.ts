/* eslint-disable @typescript-eslint/no-explicit-any -- payloads externos do TMDB
   (JSON sem tipo publicado) e linhas de $queryRawUnsafe; validados nos mappers
   puros (backfill-service.spec) antes de qualquer escrita. */
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { UA_BROWSER } from "../media-score/adapters/http.utils.js";
import { fetchJson } from "../media-score/adapters/http.utils.js";

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

export type BackfillTipo = "metadados" | "continuidade" | "metadadosRicos" | "provedores";

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
  };

  constructor(private readonly prisma: PrismaService) {}

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
   * T179: contagem das filas pendentes — base do drain auto-reagendável e do
   * relatório. Zero em todas = backfills completos (nada a fazer).
   */
  async contarPendentes(): Promise<{
    semElenco: number;
    seriesSemTemporada: number;
    filmesSemPais: number;
    metadadosRicos: number;
    provedores: number;
  }> {
    const r = await this.prisma.$queryRawUnsafe<
      {
        sem_elenco: number;
        sem_temp: number;
        sem_pais: number;
        ricos: number;
        provedores: number;
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
            AND m.provedores_em IS NULL) AS provedores`);
    const row = r[0];
    return {
      semElenco: Number(row?.sem_elenco ?? 0),
      seriesSemTemporada: Number(row?.sem_temp ?? 0),
      filmesSemPais: Number(row?.sem_pais ?? 0),
      metadadosRicos: Number(row?.ricos ?? 0),
      provedores: Number(row?.provedores ?? 0),
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
    } catch (e) {
      erro = String((e as Error)?.message ?? e).slice(0, 200);
      this.logger.warn(`Drain: ${erro}`);
    }
    const pendentesDepois = await this.contarPendentes();
    return { pendentesAntes, pendentesDepois, lotes, ...(erro ? { erro } : {}) };
  }
}
