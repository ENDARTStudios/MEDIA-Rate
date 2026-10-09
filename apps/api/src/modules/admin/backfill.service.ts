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

export type BackfillTipo = "metadados" | "continuidade";

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
    nome: String(a.name ?? ""),
    personagem: a.roles?.[0]?.character ?? a.character ?? null,
    ordem: a.order ?? i,
    foto_url: a.profile_path ? `${IMG}/w185${a.profile_path}` : null,
  }));
  const empresas: EmpresaItem[] = [];
  const vistas = new Set<string>();
  for (const c of payload.production_companies ?? []) {
    if (!c?.name || vistas.has(String(c.id))) continue;
    vistas.add(String(c.id));
    empresas.push({ fonte_id: String(c.id), nome: c.name, papel: "PRODUTORA" });
  }
  for (const n of payload.networks ?? []) {
    if (!n?.name || vistas.has(String(n.id))) continue;
    vistas.add(String(n.id));
    empresas.push({ fonte_id: String(n.id), nome: n.name, papel: "NETWORK" });
  }
  return {
    elenco: elenco.filter((a) => a.nome),
    produtoras: empresas,
    backdrop_url: payload.backdrop_path ? `${IMG}/w1280${payload.backdrop_path}` : null,
    pais_origem:
      payload.production_countries?.[0]?.iso_3166_1 ?? payload.origin_country?.[0] ?? null,
  };
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
  const ordenados = [...filmes].filter((f) => f.ano).sort((a, b) => a.ano! - b.ano!);
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
}
