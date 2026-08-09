"use client";

/**
 * Visualização de uma lista colaborativa (pública pelo link).
 * Qualquer usuário logado adiciona títulos; o dono edita/remove/exclui.
 */
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/http";
import { MediaCard, type MediaItem } from "@/components/MediaCard";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/use-auth-store";

interface ListaItem {
  id: string;
  midia_id: string;
  observacao: string | null;
  titulo: string | null;
  tipo: string | null;
  ano_lancamento: number | null;
  imagem_url: string | null;
  score: number | null;
}

interface ListaResponse {
  id: string;
  titulo: string;
  descricao: string | null;
  slug: string;
  dono: { id: string; nome: string | null };
  eh_dono: boolean;
  itens: ListaItem[];
}

interface ResultadoBusca {
  id: string;
  title?: string;
  name?: string;
  type?: string;
  posterUrl?: string | null;
  year?: number | null;
}

function toMediaItem(i: ListaItem): MediaItem {
  const tipo =
    i.tipo === "FILME"
      ? "FILME"
      : i.tipo === "SERIE"
        ? "SERIE"
        : i.tipo === "GAME"
          ? "GAME"
          : "FILME";
  return {
    id: i.midia_id,
    titulo: i.titulo ?? "—",
    tipo,
    ano_lancamento: i.ano_lancamento,
    imagem_url: i.imagem_url,
    score: i.score,
  };
}

export function ListaViewPage({ slug }: { slug: string }) {
  const t = useTranslations("listas");
  const { isAuthenticated, user } = useAuthStore();
  const [lista, setLista] = useState<ListaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");

  async function carregar() {
    try {
      const data = await api.get<ListaResponse>(`/api/v1/listas/${slug}`);
      setLista(data);
      setTitulo(data?.titulo ?? "");
      setDescricao(data?.descricao ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
    // carregar depende de slug — re-executa ao navegar entre listas
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function buscar() {
    if (!busca.trim()) return;
    try {
      // /api/v1/search delega ao discover normalizado (T227/T229) e retorna
      // { items: [{ id, titulo, tipo, ano_lancamento, imagem_url, slug }] }.
      const data = await api.get<{
        items: {
          id: string;
          titulo: string;
          tipo: string;
          ano_lancamento: number | null;
          imagem_url: string | null;
        }[];
      }>(`/api/v1/search?q=${encodeURIComponent(busca)}`);
      setResultados(
        (data?.items ?? []).map((it) => ({
          id: it.id,
          title: it.titulo,
          type: it.tipo,
          posterUrl: it.imagem_url,
          year: it.ano_lancamento,
        })),
      );
    } catch {
      setResultados([]);
    }
  }

  async function adicionar(midiaId: string) {
    try {
      await api.post(`/api/v1/listas/${slug}/itens`, { midia_id: midiaId });
      setResultados([]);
      setBusca("");
      setAdding(false);
      await carregar();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    }
  }

  async function remover(itemId: string) {
    try {
      await api.delete(`/api/v1/listas/${slug}/itens/${itemId}`, {});
      await carregar();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    }
  }

  async function salvar() {
    try {
      await api.patch(`/api/v1/listas/${slug}`, { titulo, descricao });
      setEditMode(false);
      await carregar();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    }
  }

  async function excluir() {
    if (!window.confirm(t("confirmDelete"))) return;
    try {
      await api.delete(`/api/v1/listas/${slug}`, {});
      window.location.href = "/listas";
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    }
  }

  if (loading) return <p className="max-w-5xl mx-auto py-16 px-4 text-[#A0A0B8]">{t("loading")}</p>;

  if (error || !lista) {
    return (
      <div className="max-w-5xl mx-auto py-16 px-4 text-center">
        <p className="text-[#A0A0B8] mb-4">{error ?? t("notFound")}</p>
      </div>
    );
  }

  const podeAdicionar = isAuthenticated;

  return (
    <div className="max-w-5xl mx-auto py-16 px-4">
      {editMode ? (
        <div className="mb-8 space-y-3 rounded-lg border border-[#2A2A3D] bg-[#12121C] p-5">
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="w-full rounded-md border border-[#2A2A3D] bg-[#1B1B2C] px-3 py-2 text-sm text-[#F5F5F7]"
          />
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-[#2A2A3D] bg-[#1B1B2C] px-3 py-2 text-sm text-[#F5F5F7]"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void salvar()}>
              {t("save")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>
              {t("cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold text-[#F5F5F7]">{lista.titulo}</h1>
          {lista.descricao && <p className="mt-1 text-sm text-[#A0A0B8]">{lista.descricao}</p>}
          <p className="mt-2 text-xs text-[#6B6B85]">
            {t("byOwner", { owner: lista.dono.nome ?? "—" })} ·{" "}
            {t("itemsCount", { count: lista.itens.length })}
          </p>
          {lista.eh_dono && (
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditMode(true)}>
                {t("edit")}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => void excluir()}>
                {t("delete")}
              </Button>
            </div>
          )}
        </div>
      )}

      {podeAdicionar && (
        <div className="mb-8 rounded-lg border border-[#2A2A3D] bg-[#12121C] p-4">
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="text-sm font-semibold text-[#818CF8] hover:text-[#A5B4FC]"
          >
            {adding ? t("cancel") : `+ ${t("addItem")}`}
          </button>
          {adding && (
            <div className="mt-3 space-y-3">
              <div className="flex gap-2">
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void buscar();
                  }}
                  placeholder={t("searchPlaceholder")}
                  className="flex-1 rounded-md border border-[#2A2A3D] bg-[#1B1B2C] px-3 py-2 text-sm text-[#F5F5F7] placeholder-[#6B6B85] focus:outline-none focus:ring-2 focus:ring-[#818CF8]"
                />
                <Button size="sm" onClick={() => void buscar()}>
                  {t("search")}
                </Button>
              </div>
              {resultados.length > 0 && (
                <ul className="max-h-64 overflow-y-auto divide-y divide-[#2A2A3D] rounded-md border border-[#2A2A3D]">
                  {resultados.slice(0, 10).map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => void adicionar(r.id)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-[#F5F5F7] hover:bg-[#1B1B2C]"
                      >
                        <span className="truncate">{r.title ?? r.name ?? r.id}</span>
                        <span className="ml-2 shrink-0 text-xs text-[#6B6B85]">+ {t("add")}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {lista.itens.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#2A2A3D] py-20 text-center">
          <p className="text-sm text-[#6B6B85]">{t("emptyItems")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {lista.itens.map((item) => (
            <div key={item.id} className="relative">
              <a
                href={`/media/${item.midia_id}`}
                className="block rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#818CF8]"
              >
                <MediaCard media={toMediaItem(item)} />
              </a>
              {lista.eh_dono && (
                <button
                  type="button"
                  onClick={() => void remover(item.id)}
                  className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#E11D48] text-xs text-white shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-[#818CF8]"
                  aria-label={t("remove")}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!isAuthenticated && (
        <p className="mt-8 text-center text-xs text-[#6B6B85]">
          {t("loginToContribute")} {user ? "" : ""}
        </p>
      )}
    </div>
  );
}
