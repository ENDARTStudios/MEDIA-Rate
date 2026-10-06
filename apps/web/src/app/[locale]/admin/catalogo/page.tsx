"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/http";

type TipoMidia = "FILME" | "SERIE" | "GAME" | "LIVRO" | "MANGA" | "COMIC";

const TIPOS: TipoMidia[] = ["FILME", "SERIE", "GAME", "LIVRO", "MANGA", "COMIC"];

interface MidiaAdmin {
  id: string;
  titulo: string;
  tipo: string;
  ano_lancamento: number | null;
  imagem_url: string | null;
}

interface MidiaLista {
  data: MidiaAdmin[];
  next_cursor: string | null;
  total: number;
}

interface FormMidia {
  titulo: string;
  tipo: TipoMidia;
  ano_lancamento: string;
  sinopse: string;
  titulo_original: string;
  imagem_url: string;
}

const FORM_VAZIO: FormMidia = {
  titulo: "",
  tipo: "FILME",
  ano_lancamento: "",
  sinopse: "",
  titulo_original: "",
  imagem_url: "",
};

/**
 * Onda 3 admin (P1a) — CRUD do catálogo. Consome as rotas T215 já existentes
 * (@Roles ADMIN): POST/PATCH/DELETE /api/v1/midias + listagem pública para
 * navegação (somente ativos — soft delete T215 some daqui).
 */
export default function AdminCatalogoPage() {
  const [items, setItems] = useState<MidiaAdmin[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const [form, setForm] = useState<FormMidia>(FORM_VAZIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async (q: string, cursorPagina: string | null, anexar: boolean) => {
    setCarregando(true);
    setErro(null);
    try {
      const qs = new URLSearchParams({ limit: "20" });
      if (q.trim()) qs.set("q", q.trim());
      if (cursorPagina) qs.set("cursor", cursorPagina);
      const d = await api.get<MidiaLista>(`/api/v1/midias?${qs.toString()}`);
      setItems((anteriores) => (anexar ? [...anteriores, ...d.data] : d.data));
      setCursor(d.next_cursor);
      setTotal(d.total);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar o catálogo.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar(busca, null, false);
  }, [busca]);

  async function abrirEditar(id: string) {
    setMensagem(null);
    setErro(null);
    try {
      const d = await api.get<{
        id: string;
        titulo: string;
        tipo: string;
        ano_lancamento: number | null;
        sinopse: string | null;
        titulo_original: string | null;
        imagem_url: string | null;
      }>(`/api/v1/midias/${id}`);
      setEditandoId(d.id);
      setForm({
        titulo: d.titulo ?? "",
        tipo: (TIPOS.includes(d.tipo as TipoMidia) ? d.tipo : "FILME") as TipoMidia,
        ano_lancamento: d.ano_lancamento != null ? String(d.ano_lancamento) : "",
        sinopse: d.sinopse ?? "",
        titulo_original: d.titulo_original ?? "",
        imagem_url: d.imagem_url ?? "",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar a mídia.");
    }
  }

  async function salvar() {
    setErro(null);
    setMensagem(null);
    const ano = Number.parseInt(form.ano_lancamento, 10);
    if (!form.titulo.trim()) {
      setErro("Informe o título.");
      return;
    }
    if (!form.sinopse.trim()) {
      setErro("Informe a sinopse.");
      return;
    }
    if (!Number.isInteger(ano) || ano < 1800 || ano > 2100) {
      setErro("Informe um ano entre 1800 e 2100.");
      return;
    }
    const payload: Record<string, unknown> = {
      titulo: form.titulo.trim(),
      tipo: form.tipo,
      sinopse: form.sinopse.trim(),
      ano_lancamento: ano,
    };
    if (form.titulo_original.trim()) payload.titulo_original = form.titulo_original.trim();
    if (form.imagem_url.trim()) payload.imagem_url = form.imagem_url.trim();

    setOcupado(true);
    try {
      if (editandoId) {
        await api.patch(`/api/v1/midias/${editandoId}`, payload);
        setMensagem(`Mídia atualizada: "${payload.titulo as string}"`);
      } else {
        payload.fonte = "manual";
        payload.fonte_id = `manual-${crypto.randomUUID()}`;
        await api.post("/api/v1/midias", payload);
        setMensagem(`Mídia criada: "${payload.titulo as string}"`);
      }
      setEditandoId(null);
      setForm(FORM_VAZIO);
      await carregar(busca, null, false);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao salvar a mídia.");
    } finally {
      setOcupado(false);
    }
  }

  async function remover(id: string, titulo: string) {
    if (!window.confirm(`Remover "${titulo}" do catálogo? (soft delete — preservada no banco)`)) {
      return;
    }
    setErro(null);
    setMensagem(null);
    try {
      const r = await api.delete<{ message?: string }>(`/api/v1/midias/${id}`);
      setMensagem(r?.message ?? "Mídia removida.");
      setItems((anteriores) => anteriores.filter((i) => i.id !== id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao remover.");
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">
        Catálogo ({total})
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        CRUD admin — criação/edição auditadas; remoção é soft delete (T215).
      </p>

      {/* Formulário criar/editar */}
      <section
        aria-labelledby="form-title"
        className="mb-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
        data-testid="admin-catalogo-form"
      >
        <h2 id="form-title" className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
          {editandoId ? "Editar mídia" : "Nova mídia"}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Título *
            <input
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              data-testid="admin-catalogo-titulo"
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Tipo *
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoMidia })}
              data-testid="admin-catalogo-tipo"
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2"
            >
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Ano *
            <input
              value={form.ano_lancamento}
              onChange={(e) => setForm({ ...form, ano_lancamento: e.target.value })}
              inputMode="numeric"
              data-testid="admin-catalogo-ano"
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Título original
            <input
              value={form.titulo_original}
              onChange={(e) => setForm({ ...form, titulo_original: e.target.value })}
              data-testid="admin-catalogo-titulo-original"
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Imagem (URL)
            <input
              value={form.imagem_url}
              onChange={(e) => setForm({ ...form, imagem_url: e.target.value })}
              data-testid="admin-catalogo-imagem"
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 font-mono text-xs"
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Sinopse *
            <textarea
              value={form.sinopse}
              onChange={(e) => setForm({ ...form, sinopse: e.target.value })}
              rows={3}
              data-testid="admin-catalogo-sinopse"
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2"
            />
          </label>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => void salvar()}
            disabled={ocupado}
            data-testid="admin-catalogo-salvar"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
          >
            {ocupado ? "Salvando…" : editandoId ? "Salvar alterações" : "Criar mídia"}
          </button>
          {editandoId && (
            <button
              type="button"
              onClick={() => {
                setEditandoId(null);
                setForm(FORM_VAZIO);
              }}
              className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm"
            >
              Cancelar
            </button>
          )}
        </div>
        {mensagem && (
          <p data-testid="admin-catalogo-mensagem" className="mt-2 text-sm text-green-600">
            {mensagem}
          </p>
        )}
        {erro && (
          <p data-testid="admin-catalogo-erro" className="mt-2 text-sm text-red-600" role="alert">
            {erro}
          </p>
        )}
      </section>

      {/* Busca + listagem */}
      <div className="mb-3">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por título…"
          data-testid="admin-catalogo-busca"
          aria-label="Buscar mídias por título"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm"
        />
      </div>

      {carregando && <p className="text-sm text-gray-500">Carregando…</p>}

      <ul className="divide-y divide-gray-200 dark:divide-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        {items.map((m) => (
          <li key={m.id} className="flex items-center gap-3 px-4 py-3 text-sm">
            <span className="min-w-0 flex-1 truncate">
              {m.titulo}{" "}
              <span className="text-xs text-gray-400">
                {m.tipo} · {m.ano_lancamento ?? "—"}
              </span>
            </span>
            <button
              type="button"
              onClick={() => void abrirEditar(m.id)}
              data-testid={`admin-catalogo-editar-${m.id}`}
              className="shrink-0 rounded-lg border border-gray-300 dark:border-gray-600 px-2 py-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => void remover(m.id, m.titulo)}
              data-testid={`admin-catalogo-remover-${m.id}`}
              className="shrink-0 rounded-lg border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Remover
            </button>
          </li>
        ))}
        {!carregando && items.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-gray-500">Nenhum título encontrado.</li>
        )}
      </ul>

      {cursor && (
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => void carregar(busca, cursor, true)}
            disabled={carregando}
            data-testid="admin-catalogo-carregar-mais"
            className="rounded-xl border border-gray-300 dark:border-gray-600 px-5 py-2 text-sm font-semibold disabled:opacity-40"
          >
            Carregar mais
          </button>
        </div>
      )}
    </div>
  );
}
