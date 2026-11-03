/* eslint-disable @typescript-eslint/no-explicit-any -- curvas de payload
   externo já validadas nos mappers puros de descoberta.fontes.ts. */
import { ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { TipoMidia } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service.js";
import {
  classificacaoNota,
  estatisticasEscala,
  esperar,
  fontesDescoberta,
  normalizarScore,
  slugifyCatalogo,
  sufixoSlug,
  type FonteDescoberta,
  type ItemDescoberta,
  type TipoIngestao,
} from "./descoberta.fontes.js";

/**
 * T-DADOS-63 — motor de ingestão em ESCALA por mídia (o "bot" de cada tipo,
 * dentro da API).
 *
 * Por que aqui e não em automação de chat: o processo da API já roda o drain
 * de backfill (D-576) 24/7, sobrevive a redeploy porque o cursor está no banco
 * (`ingestao_cursor`) e não consome uma automação por tipo. Cada tique atende
 * todas as fontes ativas, com throttle próprio, teto de páginas e orçamento de
 * tempo; ao atingir o alvo do tipo, a fonte é marcada como concluída.
 *
 * Regras herdadas do projeto:
 * - **nunca inventar dado**: fonte sem nota na listagem grava `nota: null`;
 * - identidade por ID EXATO da fonte (D3e): nada de busca textual `results[0]`;
 * - idempotência por (fonte, fonte_id) — reexecutar não duplica;
 * - guarda de disco antes de escrever (lição D-574);
 * - nota só é gravada quando a fonte a publica; o score 0–100 vem da escala
 *   da fonte (`fatorDaEscala`), com as mesmas estatísticas de referência dos
 *   adapters de score.
 */

const ALVO_PADRAO = 25_000;
const ORCAMENTO_PADRAO_MS = 5 * 60 * 1000;
const MAX_PAGINAS_POR_FONTE_TICK = 30;
const DISCO_LIMITE_MB_PADRAO = 4250;
const SINOPSE_MAX = 4000;

export interface ResumoFonteRodada {
  tipo: TipoIngestao;
  fonte: string;
  ativo: boolean;
  paginas: number;
  vistos: number;
  inseridos: number;
  proximo: Record<string, unknown> | null;
  erro?: string;
}

export interface ResumoRodada {
  inicio: string;
  duracaoMs: number;
  alvo: number;
  inseridos: number;
  fontes: ResumoFonteRodada[];
}

export interface StatusIngestao {
  alvo: number;
  geradoEm: string;
  emExecucao: boolean;
  tipos: {
    tipo: TipoMidia;
    total: number;
    comScore: number;
    faltam: number;
  }[];
  fontes: {
    tipo: TipoIngestao;
    fonte: string;
    rotulo: string;
    ativo: boolean;
    env: readonly string[];
    pausado: boolean;
    concluidoEm: string | null;
    vistos: number;
    inseridos: number;
    ultimoErro: string | null;
    ultimaRodadaEm: string | null;
    cursor: unknown;
  }[];
  ultimoResumo: ResumoRodada | null;
}

function alvoPadrao(): number {
  const n = Number(process.env.MEDIA_CATALOGO_ALVO ?? ALVO_PADRAO);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : ALVO_PADRAO;
}

function truncar(texto: string | null | undefined, max: number): string | null {
  if (!texto) return null;
  return texto.length > max ? texto.slice(0, max) : texto;
}

function ehErroDeCota(erro: unknown): boolean {
  const status = (erro as { status?: number } | null)?.status;
  return status === 429 || String(erro).includes("HTTP 429");
}

@Injectable()
export class CatalogoIngestaoService {
  private readonly logger = new Logger(CatalogoIngestaoService.name);
  private emExecucao = false;
  private ultimoResumo: ResumoRodada | null = null;

  constructor(private readonly prisma: PrismaService) {}

  alvo(): number {
    return alvoPadrao();
  }

  fontes(): FonteDescoberta[] {
    return fontesDescoberta();
  }

  /** Uma rodada que atende todas as fontes dentro do orçamento de tempo. */
  async rodada(orcamentoMs = ORCAMENTO_PADRAO_MS): Promise<ResumoRodada> {
    if (this.emExecucao) {
      throw new ConflictException("Ingestão do catálogo já está em execução.");
    }
    this.emExecucao = true;
    const inicio = Date.now();
    const alvo = this.alvo();
    const resumo: ResumoRodada = {
      inicio: new Date(inicio).toISOString(),
      duracaoMs: 0,
      alvo,
      inseridos: 0,
      fontes: [],
    };
    try {
      const discoMb = await this.guardarDisco();
      if (discoMb === null) {
        this.logger.warn("Ingestão do catálogo abortada: banco acima do limite de disco (D-574).");
        resumo.fontes.push({
          tipo: "FILME",
          fonte: "disco",
          ativo: false,
          paginas: 0,
          vistos: 0,
          inseridos: 0,
          proximo: null,
          erro: "disco acima do limite (D-574)",
        });
        return resumo;
      }
      for (const fonte of this.fontes()) {
        if (Date.now() - inicio >= orcamentoMs) break;
        const linha = await this.executarFonte(fonte, alvo, inicio, orcamentoMs);
        resumo.fontes.push(linha);
        resumo.inseridos += linha.inseridos;
      }
      return resumo;
    } finally {
      resumo.duracaoMs = Date.now() - inicio;
      this.ultimoResumo = resumo;
      this.emExecucao = false;
      this.logger.log(
        `Ingestão do catálogo: +${resumo.inseridos} títulos em ${Math.round(resumo.duracaoMs / 1000)}s ` +
          `(${resumo.fontes.map((f) => `${f.tipo}=${f.inseridos}/${f.vistos}`).join(" ") || "sem fonte atendida"}).`,
      );
    }
  }

  private async executarFonte(
    fonte: FonteDescoberta,
    alvo: number,
    inicio: number,
    orcamentoMs: number,
  ): Promise<ResumoFonteRodada> {
    const linha: ResumoFonteRodada = {
      tipo: fonte.tipo,
      fonte: fonte.fonte,
      ativo: fonte.ativo(),
      paginas: 0,
      vistos: 0,
      inseridos: 0,
      proximo: null,
    };
    if (!fonte.ativo()) {
      linha.erro = `credencial ausente (${fonte.env.join(", ")})`;
      return linha;
    }
    const chave = { tipo: fonte.tipo as TipoMidia, fonte: fonte.fonte };
    const atual = await this.prisma.ingestaoCursor.findUnique({ where: { tipo_fonte: chave } });
    if (atual?.pausado) {
      linha.erro = "pausado";
      linha.proximo = (atual.cursor as Record<string, unknown> | null) ?? null;
      return linha;
    }
    if (atual?.concluido_em) {
      linha.erro = "concluído (alvo atingido)";
      linha.proximo = (atual.cursor as Record<string, unknown> | null) ?? null;
      return linha;
    }
    const totalTipo = await this.prisma.midia.count({
      where: { tipo: fonte.tipo as TipoMidia, deleted_at: null },
    });
    if (totalTipo >= alvo) {
      await this.marcarCursor(chave, {
        concluido_em: new Date(),
        cursor: (atual?.cursor as Record<string, unknown> | null) ?? null,
      });
      linha.erro = `alvo de ${alvo} já atingido`;
      return linha;
    }

    let proximo = (atual?.cursor as Record<string, unknown> | null) ?? null;
    for (let p = 0; p < Math.min(fonte.paginasPorTick, MAX_PAGINAS_POR_FONTE_TICK); p++) {
      if (Date.now() - inicio >= orcamentoMs) break;
      await esperar(fonte.pausaMs);
      try {
        const pagina = await fonte.proximaPagina(proximo);
        linha.paginas += 1;
        linha.vistos += pagina.itens.length;
        linha.inseridos += await this.inserirItens(fonte.tipo, pagina.itens);
        proximo = pagina.proximo;
        linha.proximo = proximo;
        if (!proximo) break;
      } catch (e) {
        linha.erro = String(e).slice(0, 200);
        this.logger.warn(`Ingestão ${fonte.rotulo}: ${linha.erro}`);
        // Cota/ bloqueio da fonte: para esta fonte NESTE tique e retoma depois
        // do cursor atual — o que já foi inserido não se perde.
        if (ehErroDeCota(e)) break;
        if (linha.paginas === 0) break;
        break;
      }
    }

    const concluido =
      totalTipo + linha.inseridos >= alvo || (proximo === null && linha.inseridos > 0);
    await this.marcarCursor(chave, {
      cursor: proximo,
      vistos: (atual?.vistos ?? 0) + linha.vistos,
      inseridos: (atual?.inseridos ?? 0) + linha.inseridos,
      ultima_rodada_em: new Date(),
      ultimo_erro: linha.erro ?? null,
      ...(concluido ? { concluido_em: new Date() } : {}),
    });
    return linha;
  }

  private async marcarCursor(
    chave: { tipo: TipoMidia; fonte: string },
    dados: {
      cursor: Record<string, unknown> | null;
      vistos?: number;
      inseridos?: number;
      ultima_rodada_em?: Date;
      ultimo_erro?: string | null;
      concluido_em?: Date;
    },
  ): Promise<void> {
    const comum = {
      cursor: (dados.cursor ?? null) as any,
      ...(dados.vistos !== undefined ? { vistos: dados.vistos } : {}),
      ...(dados.inseridos !== undefined ? { inseridos: dados.inseridos } : {}),
      ...(dados.ultima_rodada_em ? { ultima_rodada_em: dados.ultima_rodada_em } : {}),
      ...(dados.ultimo_erro !== undefined ? { ultimo_erro: dados.ultimo_erro } : {}),
      ...(dados.concluido_em ? { concluido_em: dados.concluido_em } : {}),
    };
    await this.prisma.ingestaoCursor.upsert({
      where: { tipo_fonte: chave },
      create: { ...chave, ...comum },
      update: comum,
    });
  }

  /**
   * Grava um lote: deduplica por (fonte, fonte_id), resolve slug, insere mídias
   * e — quando a fonte publicou nota — `avaliacao_fonte` + `media_score`.
   */
  private async inserirItens(tipo: TipoIngestao, itens: ItemDescoberta[]): Promise<number> {
    if (!itens.length) return 0;
    // Uma mesma página pode trazer a mesma obra duas vezes; o mapa também
    // protege contra repetição dentro do próprio lote.
    const porFonte = new Map<string, Map<string, ItemDescoberta>>();
    for (const item of itens) {
      if (!item?.titulo || !item.fonteId) continue;
      const chave = item.fonte;
      let mapa = porFonte.get(chave);
      if (!mapa) {
        mapa = new Map<string, ItemDescoberta>();
        porFonte.set(chave, mapa);
      }
      if (!mapa.has(item.fonteId)) mapa.set(item.fonteId, item);
    }
    let criadosTotal = 0;
    for (const [fonteMidia, mapa] of porFonte) {
      const candidatos = [...mapa.values()];
      const ids = candidatos.map((c) => c.fonteId);
      const existentes = await this.prisma.midia.findMany({
        where: { fonte: fonteMidia, fonte_id: { in: ids } },
        select: { fonte_id: true },
      });
      const jaExiste = new Set(existentes.map((e) => e.fonte_id));
      const novos = candidatos.filter((c) => !jaExiste.has(c.fonteId));
      if (!novos.length) continue;
      const slugs = await this.resolverSlugs(tipo, novos);
      let criados: { id: string; fonte_id: string }[];
      try {
        criados = await this.prisma.midia.createManyAndReturn({
          data: novos.map((item, indice) => ({
            fonte: fonteMidia,
            fonte_id: item.fonteId.slice(0, 64),
            tipo: tipo as TipoMidia,
            titulo: item.titulo,
            titulo_original: item.tituloOriginal ?? null,
            sinopse: truncar(item.sinopse, SINOPSE_MAX),
            sinopse_en: truncar(item.sinopseEn, SINOPSE_MAX),
            ano_lancamento: item.ano ?? null,
            pais_origem: item.paisOrigem ?? null,
            imagem_url: item.imagemUrl ?? null,
            slug: slugs[indice],
            score: item.nota != null ? normalizarScore(item.nota.rating, item.nota.escala) : null,
            // T-DADOS-68: entidade que veio na própria listagem (editora do
            // ComicVine) entra já com o watermark — o drain não gasta uma
            // chamada por título para redescobrir o mesmo dado.
            creditos_em: item.creditoEntidade ? new Date() : null,
          })),
          select: { id: true, fonte_id: true },
        });
      } catch (e) {
        this.logger.warn(`Ingestão ${fonteMidia}: lote rejeitado (${String(e).slice(0, 160)}).`);
        continue;
      }
      criadosTotal += criados.length;
      const idPorFonteId = new Map(criados.map((c) => [c.fonte_id, c.id]));
      const avaliacoes: {
        midia_id: string;
        fonte: string;
        rating: number;
        media_fonte: number;
        desvio_fonte: number;
        votos: number;
        url: string | null;
      }[] = [];
      const scores: {
        midia_id: string;
        score: number;
        num_fontes: number;
        pesos_usados: Record<string, never>;
        score_publico: number | null;
        score_critica: number | null;
        votos_total: number;
      }[] = [];
      for (const item of novos) {
        const midiaId = idPorFonteId.get(item.fonteId.slice(0, 64));
        if (!midiaId || !item.nota) continue;
        const score = normalizarScore(item.nota.rating, item.nota.escala);
        if (score === null) continue;
        const stats = estatisticasEscala(item.nota.escala);
        const classe = classificacaoNota(item.nota.fonte);
        avaliacoes.push({
          midia_id: midiaId,
          fonte: item.nota.fonte,
          rating: item.nota.rating,
          media_fonte: stats.media,
          desvio_fonte: stats.desvio,
          votos: Number.isFinite(item.nota.votos) ? item.nota.votos : 0,
          url: item.nota.url ?? null,
        });
        scores.push({
          midia_id: midiaId,
          score,
          num_fontes: 1,
          pesos_usados: {},
          score_publico: classe === "publico" ? score : null,
          score_critica: classe === "critica" ? score : null,
          votos_total: Number.isFinite(item.nota.votos) ? item.nota.votos : 0,
        });
      }
      // Créditos de entidade da listagem (editora do ComicVine).
      const elenco = novos.flatMap((item) => {
        const credito = item.creditoEntidade;
        const midiaId = idPorFonteId.get(item.fonteId.slice(0, 64));
        if (!credito || !midiaId) return [];
        return [
          {
            midia_id: midiaId,
            fonte: credito.fonte,
            fonte_id: credito.fonteId.slice(0, 64),
            nome: credito.nome,
            personagem: credito.papel,
            ordem: 0,
            foto_url: null,
          },
        ];
      });
      if (elenco.length) {
        await this.prisma.midiaElenco.createMany({ data: elenco, skipDuplicates: true });
      }
      if (avaliacoes.length) {
        await this.prisma.avaliacaoFonte.createMany({ data: avaliacoes, skipDuplicates: true });
      }
      if (scores.length) {
        await this.prisma.mediaScore.createMany({ data: scores, skipDuplicates: true });
      }
    }
    return criadosTotal;
  }

  /**
   * Slug canônico único entre ATIVOS. Consulta o banco uma vez com todos os
   * candidatos (base, base-tipo, base-tipo-N) — colisão real é rara e o custo
   * de errar é o índice único parcial rejeitar o lote inteiro.
   */
  private async resolverSlugs(tipo: TipoIngestao, itens: ItemDescoberta[]): Promise<string[]> {
    const sufixo = sufixoSlug(tipo);
    const bases = itens.map((i) => slugifyCatalogo(i.titulo) || i.fonteId.toLowerCase());
    const candidatos = new Set<string>();
    for (const base of bases) {
      candidatos.add(base);
      candidatos.add(`${base}-${sufixo}`);
      for (let n = 2; n <= 6; n++) candidatos.add(`${base}-${sufixo}-${n}`);
    }
    const existentes = await this.prisma.midia.findMany({
      where: { slug: { in: [...candidatos] }, deleted_at: null },
      select: { slug: true },
    });
    const ocupados = new Set(existentes.map((e) => e.slug).filter((s): s is string => Boolean(s)));
    return bases.map((base, indice) => {
      if (!ocupados.has(base)) {
        ocupados.add(base);
        return base;
      }
      for (let n = 2; n <= 6; n++) {
        const tentativa = `${base}-${sufixo}-${n}`;
        if (!ocupados.has(tentativa)) {
          ocupados.add(tentativa);
          return tentativa;
        }
      }
      const alternativa = `${base}-${sufixo}-${itens[indice]?.fonteId ?? "x"}`.slice(0, 300);
      ocupados.add(alternativa);
      return alternativa;
    });
  }

  /** Guarda de disco (D-574): devolve MB usados ou `null` se acima do limite. */
  private async guardarDisco(): Promise<number | null> {
    const limite = Number(process.env.DISCO_LIMITE_MB ?? DISCO_LIMITE_MB_PADRAO);
    try {
      const r = await this.prisma.$queryRawUnsafe<{ bytes: bigint }[]>(
        `SELECT pg_database_size(current_database())::bigint AS bytes`,
      );
      const usadoMb = Number(r[0]?.bytes ?? 0n) / 1048576;
      return usadoMb > limite ? null : Math.round(usadoMb);
    } catch (e) {
      this.logger.warn(`Guarda de disco indisponível (${String(e).slice(0, 120)}).`);
      return null;
    }
  }

  /** Status observável (rota admin) — cobre catálogo, notas e cursores. */
  async status(): Promise<StatusIngestao> {
    const alvo = this.alvo();
    const tipos: TipoMidia[] = ["FILME", "SERIE", "GAME", "LIVRO", "COMIC", "MANGA"];
    const porTipo = await this.prisma.midia.groupBy({
      by: ["tipo"],
      where: { deleted_at: null },
      _count: { _all: true },
    });
    const comScore = await this.prisma.midia.groupBy({
      by: ["tipo"],
      where: { deleted_at: null, score: { not: null } },
      _count: { _all: true },
    });
    const totalPorTipo = new Map(porTipo.map((r) => [r.tipo, r._count._all]));
    const scorePorTipo = new Map(comScore.map((r) => [r.tipo, r._count._all]));
    const linhas = await this.prisma.ingestaoCursor.findMany();
    const porChave = new Map(linhas.map((l) => [`${l.tipo}::${l.fonte}`, l]));
    return {
      alvo,
      geradoEm: new Date().toISOString(),
      emExecucao: this.emExecucao,
      tipos: tipos.map((tipo) => {
        const total = totalPorTipo.get(tipo) ?? 0;
        return {
          tipo,
          total,
          comScore: scorePorTipo.get(tipo) ?? 0,
          faltam: Math.max(0, alvo - total),
        };
      }),
      fontes: this.fontes().map((fonte) => {
        const linha = porChave.get(`${fonte.tipo}::${fonte.fonte}`);
        return {
          tipo: fonte.tipo,
          fonte: fonte.fonte,
          rotulo: fonte.rotulo,
          ativo: fonte.ativo(),
          env: fonte.env,
          pausado: linha?.pausado ?? false,
          concluidoEm: linha?.concluido_em ? linha.concluido_em.toISOString() : null,
          vistos: linha?.vistos ?? 0,
          inseridos: linha?.inseridos ?? 0,
          ultimoErro: linha?.ultimo_erro ?? null,
          ultimaRodadaEm: linha?.ultima_rodada_em ? linha.ultima_rodada_em.toISOString() : null,
          cursor: linha?.cursor ?? null,
        };
      }),
      ultimoResumo: this.ultimoResumo,
    };
  }

  /** Pausa/retoma manual de uma fonte (rota admin). */
  async alternarPausa(
    tipo: string,
    fonte: string,
    pausado: boolean,
  ): Promise<{ tipo: string; fonte: string; pausado: boolean }> {
    const alvo = this.fontes().find((f) => f.tipo === tipo && f.fonte === fonte);
    if (!alvo) {
      throw new NotFoundException(`Fonte de ingestão desconhecida: ${tipo}/${fonte}.`);
    }
    await this.prisma.ingestaoCursor.upsert({
      where: { tipo_fonte: { tipo: alvo.tipo as TipoMidia, fonte: alvo.fonte } },
      create: { tipo: alvo.tipo as TipoMidia, fonte: alvo.fonte, pausado },
      update: { pausado },
    });
    return { tipo: alvo.tipo, fonte: alvo.fonte, pausado };
  }
}
