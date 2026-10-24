"use client";

/**
 * Sidebar de filtros do catálogo — agora no desenho do conceito v1.
 *
 * O que mudou e por quê:
 *
 *  - **Todos os grupos ficam visíveis.** Antes ano/nota/gênero/crítica viviam atrás de um
 *    "Filtro avançado" recolhido: quem abria a página via "Filtros" e um chevron. O
 *    conceito desenha Tipo · Gênero · Ano · Nota mínima · Só com crítica abertos.
 *  - **Contagens ao lado de cada opção** (tipo pela contagem por categoria; gênero por
 *    `total_midias` que o endpoint já devolve).
 *  - **Tipo e Gênero como LISTA DE OPÇÕES**, não `<select>`. O conceito desenha caixas de
 *    seleção; o contrato da URL/API aceita UM valor por filtro (`?type=`, `?genero=`),
 *    então o desenho virou **radio**, não checkbox — caixa de marcar que desmarca a
 *    anterior mentiria sobre poder escolher dois.
 *  - **Nota mínima é slider** (0–100, passo 5) com o valor à direita; o máximo continua
 *    como campo compacto, para não perder o recorte por faixa.
 *  - **"Só com crítica" é switch** (`role="switch"`), como no desenho.
 *  - **Cabeçalho** com "FILTROS" + contagem de ativos em accent; **rodapé** com a contagem
 *    do recorte e "Limpar filtros" — no desktop o filtro é ao vivo, não há "aplicar".
 */
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/http";
import { useTotalDoRecorte } from "./catalog/TotalDoRecorte";
import { listaDeValores } from "@/lib/api";
import type { MediaType } from "@/lib/types";
import { TIPOS_DO_CATALOGO, useTiposComContagem } from "./catalog/useTiposComContagem";
import { CATEGORY_TOKENS } from "@/lib/design-tokens";
import { Pin, PinOff } from "lucide-react";
import { cn } from "@/lib/utils";

const GENEROS_VISIVEIS = 4;

export function CatalogFiltersClient() {
  const t = useTranslations("catalog");
  const tf = useTranslations("catalogFilters");
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [mostrarTodosGeneros, setMostrarTodosGeneros] = useState(false);
  const [fixado, setFixado] = useState(false);

  // UAT-47: o rail fica FIXO RETRAÍDO — sem expandir no hover (o painel
  // "abrindo sozinho" ao passar o mouse deslocava o grid e atrapalhava a
  // leitura). Abrir é decisão explícita: o pino alterna recolhido/aberto e a
  // preferência é lembrada. Preferência lida no efeito para o SSR e o primeiro
  // render do cliente serem idênticos (recolhido).
  const CHAVE_PIN = "catalog:sidebar-pinned";
  useEffect(() => {
    try {
      setFixado(window.localStorage.getItem(CHAVE_PIN) === "1");
    } catch {
      // storage bloqueado (modo privado) — segue recolhido, sem quebrar a página
    }
  }, [CHAVE_PIN]);

  const alternarPin = () => {
    setFixado((atual) => {
      const proximo = !atual;
      try {
        window.localStorage.setItem(CHAVE_PIN, proximo ? "1" : "0");
      } catch {
        // idem: preferência é conveniência, não requisito
      }
      return proximo;
    });
  };

  // Rótulos visíveis apenas com o painel aberto (fixado) — nunca no hover.
  const rotuloVisivel = fixado ? "inline" : "hidden";

  const type = sp.get("type") ?? "";
  const query = sp.get("q") ?? "";
  const anoMin = sp.get("anoMin") ?? "";
  const anoMax = sp.get("anoMax") ?? "";
  const scoreMin = sp.get("scoreMin") ?? "";
  const scoreMax = sp.get("scoreMax") ?? "";
  const genero = sp.get("genero") ?? "";
  const comCritica = sp.get("com_critica") === "true";

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(sp.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [sp, router, pathname],
  );

  const clearAll = () => router.replace(pathname);

  // BETA-GAP-10/T127: o catálogo textual (`/api/v1/search`) só casa título/sinopse —
  // gênero/nota/crítica NÃO são aplicados nesse modo. Em vez de exibir filtro que a
  // request ignora, desabilita com hint honesta enquanto houver busca ativa.
  const buscaAtiva = query.trim().length > 0;

  // A ordenação agora vive na faixa acima dos chips; aqui ela só entra na CONTAGEM.
  const sort = sp.get("sort") ?? "";

  // Listas em CSV na URL: `?type=movie,book` e `?genero=drama,acao`.
  const tiposAtivos = listaDeValores(type) as MediaType[];
  const generosAtivos = listaDeValores(genero);

  const alternarGenero = (slug: string) => {
    const proximo = generosAtivos.includes(slug)
      ? generosAtivos.filter((g) => g !== slug)
      : [...generosAtivos, slug];
    setParam("genero", proximo.join(","));
  };

  const { total } = useTotalDoRecorte();
  const contagensDeTipo = useTiposComContagem();

  const { data: generos } = useQuery({
    queryKey: ["generos"],
    queryFn: async () =>
      (await api.get<{ id: number; nome: string; slug: string; total_midias: number }[]>(
        "/api/v1/midias/generos",
      )) ?? [],
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Conta VALORES selecionados, não parâmetros: dois tipos marcados são dois ativos.
  const activeCount =
    tiposAtivos.length +
    generosAtivos.length +
    (sort ? 1 : 0) +
    (query.trim() ? 1 : 0) +
    (anoMin ? 1 : 0) +
    (anoMax ? 1 : 0) +
    (scoreMin ? 1 : 0) +
    (scoreMax ? 1 : 0) +
    (comCritica ? 1 : 0);

  const listaGeneros = generos ?? [];
  const generosVisiveis = mostrarTodosGeneros
    ? listaGeneros
    : listaGeneros.slice(0, GENEROS_VISIVEIS);

  const campoBase =
    "w-full rounded-md border border-surface-border bg-surface-elevated px-2.5 py-2 text-sm text-fg-primary placeholder:text-fg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-indigo disabled:opacity-50";

  const rotuloGrupo =
    "text-[11px] font-semibold uppercase tracking-wider text-fg-muted whitespace-nowrap";

  return (
    <aside
      aria-label={tf("groupLabel")}
      aria-keyshortcuts="Alt+F"
      className={cn(
        "group w-full shrink-0 text-sm lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:overflow-x-hidden lg:transition-[width] lg:duration-200 lg:ease-out",
        // UAT-47: largura só muda pelo pino — o rail não abre no hover.
        fixado ? "lg:w-60" : "lg:w-14",
      )}
    >
      {/* Cabeçalho: FILTROS + quantos estão ativos */}
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={cn(
            "font-heading font-semibold uppercase tracking-wider text-fg-primary whitespace-nowrap",
            rotuloVisivel,
          )}
        >
          {tf("filters")}
        </span>
        {activeCount > 0 && (
          <span
            className="text-[11px] font-semibold text-accent-indigo"
            data-testid="catalog-active-count"
          >
            {tf("activeCount", { count: activeCount })}
          </span>
        )}
      </div>
      <div className="mt-2 hidden justify-end lg:flex">
        <button
          type="button"
          onClick={alternarPin}
          aria-pressed={fixado}
          aria-label={fixado ? tf("unpin") : tf("pin")}
          title={fixado ? tf("unpin") : tf("pin")}
          data-testid="catalog-sidebar-pin"
          className="inline-flex min-h-[28px] items-center gap-1 rounded-md px-1.5 text-[11px] text-fg-muted transition-colors hover:text-accent-indigo focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-indigo"
        >
          {fixado ? (
            <Pin className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <PinOff className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span className={rotuloVisivel}>{fixado ? tf("unpin") : tf("pin")}</span>
        </button>
      </div>

      <div className="mt-3 h-px bg-surface-border" aria-hidden="true" />

      {buscaAtiva && (
        <p
          id="catalog-advanced-search-hint"
          data-testid="catalog-advanced-search-hint"
          className="mt-3 rounded-md border border-accent-indigo/20 bg-accent-indigo/5 px-2 py-1.5 text-[11px] leading-4 text-fg-secondary"
        >
          {tf("advancedUnavailableSearch")}
        </p>
      )}

      {/* ── TIPO — chips de seleção única (mesma função da barra que saiu do topo) ── */}
      <fieldset className="mt-4">
        <legend className={cn(rotuloGrupo, fixado ? "block" : "hidden")}>{tf("tipoLabel")}</legend>
        <div className="mt-2 flex flex-wrap gap-1.5" data-testid="catalog-filter-tipo">
          {TIPOS_DO_CATALOGO.map((tipo) => {
            const Icone = CATEGORY_TOKENS[tipo.id].icon;
            const ativo = type === tipo.id;
            const contagem = contagensDeTipo[tipo.id];
            return (
              <button
                key={tipo.id}
                type="button"
                onClick={() => setParam("type", ativo ? "" : tipo.id)}
                aria-pressed={ativo}
                aria-label={tipo.rotulo}
                title={tipo.rotulo}
                data-testid={`catalog-filter-tipo-${tipo.id}`}
                className={cn(
                  "inline-flex min-h-[32px] items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-indigo",
                  ativo
                    ? "border-transparent text-surface-bg"
                    : "border-surface-border text-fg-secondary hover:border-accent-indigo hover:text-fg-primary",
                )}
                style={
                  ativo ? { backgroundColor: CATEGORY_TOKENS[tipo.id].color } : { color: undefined }
                }
              >
                <Icone
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: ativo ? undefined : CATEGORY_TOKENS[tipo.id].color }}
                  aria-hidden="true"
                />
                <span className={fixado ? "" : "hidden"}>{tipo.rotulo}</span>
                {/* Sem opacity na contagem: no rail retraído ela é o único texto
                    do chip e opacity-70 derrubava o contraste p/ 4.31:1 (abaixo
                    do AA); as cores herdadas do chip passam nos dois estados
                    (visual-qa/axe, UAT-47). */}
                {contagem != null && <span className="tabular-nums text-[10px]">{contagem}</span>}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-4 h-px bg-surface-border" aria-hidden="true" />

      {/* ── GÊNERO — mesma regra: um gênero por vez ─────────────────────────── */}
      <fieldset className="mt-4" disabled={buscaAtiva}>
        <legend className={rotuloGrupo}>{tf("genero")}</legend>
        <div
          className="mt-2 space-y-1"
          data-testid="catalog-filter-genero"
          aria-disabled={buscaAtiva}
        >
          {generosVisiveis.map((g) => (
            <label
              key={g.id}
              className="flex min-h-[32px] cursor-pointer items-center gap-2 text-fg-secondary hover:text-fg-primary"
            >
              <input
                type="checkbox"
                checked={generosAtivos.includes(g.slug)}
                onChange={() => alternarGenero(g.slug)}
                disabled={buscaAtiva}
                data-testid={`catalog-filter-genero-${g.slug}`}
                className="accent-accent-indigo"
              />
              <span className="flex-1">{g.nome}</span>
              <span className="tabular-nums text-[11px] text-fg-muted">{g.total_midias}</span>
            </label>
          ))}
          {listaGeneros.length > GENEROS_VISIVEIS && (
            <button
              type="button"
              onClick={() => setMostrarTodosGeneros((v) => !v)}
              aria-expanded={mostrarTodosGeneros}
              data-testid="catalog-genero-ver-todos"
              className="mt-1 text-[11px] text-accent-indigo hover:text-accent-indigo-hover"
            >
              {mostrarTodosGeneros
                ? tf("showFewer")
                : tf("showAll", { count: listaGeneros.length })}
            </button>
          )}
        </div>
      </fieldset>

      <div className="mt-4 h-px bg-surface-border" aria-hidden="true" />

      {/* ── ANO ─────────────────────────────────────────────────────────────── */}
      <div className="mt-4">
        <span className={rotuloGrupo}>{tf("anoLabel")}</span>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            value={anoMin}
            onChange={(e) => setParam("anoMin", e.target.value)}
            placeholder={tf("anoMin")}
            aria-label={tf("anoMin")}
            className={campoBase}
          />
          <span className="text-fg-secondary" aria-hidden="true">
            –
          </span>
          <input
            type="number"
            value={anoMax}
            onChange={(e) => setParam("anoMax", e.target.value)}
            placeholder={tf("anoMax")}
            aria-label={tf("anoMax")}
            className={campoBase}
          />
        </div>
      </div>

      <div className="mt-4 h-px bg-surface-border" aria-hidden="true" />

      {/* ── NOTA MÍNIMA — slider com o valor à direita ──────────────────────── */}
      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <span className={rotuloGrupo}>{tf("notaMinima")}</span>
          <span className="tabular-nums text-[11px] font-semibold text-fg-primary">
            {scoreMin ? t("scoreDe", { score: scoreMin }) : tf("semMinimo")}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={scoreMin || 0}
          onChange={(e) => setParam("scoreMin", e.target.value === "0" ? "" : e.target.value)}
          disabled={buscaAtiva}
          aria-label={tf("notaMinima")}
          aria-describedby={buscaAtiva ? "catalog-advanced-search-hint" : undefined}
          data-testid="catalog-filter-score-min"
          className="mt-2 w-full accent-accent-indigo disabled:opacity-50"
        />
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            value={scoreMax}
            onChange={(e) => setParam("scoreMax", e.target.value)}
            placeholder={tf("scoreMax")}
            aria-label={tf("scoreMax")}
            disabled={buscaAtiva}
            aria-describedby={buscaAtiva ? "catalog-advanced-search-hint" : undefined}
            data-testid="catalog-filter-score-max"
            className={cn(campoBase, "max-w-[6.5rem]")}
          />
          <span className="text-[11px] text-fg-muted">{tf("scoreMaxHint")}</span>
        </div>
      </div>

      <div className="mt-4 h-px bg-surface-border" aria-hidden="true" />

      {/* ── SÓ COM CRÍTICA — switch ─────────────────────────────────────────── */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className={rotuloGrupo} id="catalog-critica-label">
          {tf("somenteCriticaCurto")}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={comCritica}
          aria-labelledby="catalog-critica-label"
          aria-describedby={buscaAtiva ? "catalog-advanced-search-hint" : undefined}
          disabled={buscaAtiva}
          onClick={() => setParam("com_critica", comCritica ? "" : "true")}
          data-testid="catalog-filter-com-critica"
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-indigo disabled:opacity-50",
            comCritica
              ? "border-accent-indigo bg-accent-indigo"
              : "border-surface-border bg-surface-elevated",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-[1.125rem] w-[1.125rem] rounded-full bg-fg-primary transition-[left]",
              comCritica ? "left-[1.375rem]" : "left-0.5",
            )}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* ── Rodapé: contagem do recorte + limpar ────────────────────────────── */}
      <div className="mt-4 h-px bg-surface-border" aria-hidden="true" />
      <div className="mt-3">
        <p className="text-xs text-fg-secondary" data-testid="catalog-recorte-total">
          {total == null ? tf("countLoading") : t("count", { count: total })}
        </p>
        <p className="mt-1 text-[11px] text-fg-muted">{tf("liveNotice")}</p>
        <button
          type="button"
          onClick={clearAll}
          data-testid="catalog-clear-all"
          disabled={activeCount === 0}
          className="mt-3 min-h-[36px] w-full rounded-md border border-surface-border bg-surface-card text-xs font-semibold text-fg-secondary transition-colors hover:border-accent-indigo hover:text-fg-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {tf("clearAll")}
        </button>
      </div>
    </aside>
  );
}
