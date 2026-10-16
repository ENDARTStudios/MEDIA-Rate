"use client";

/**
 * Minhas listas colaborativas (Premium — D-132).
 * Criação exige Premium (402 da API → upsell); visualização compartilhável.
 */
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link } from "@/lib/navigation";
import { api, ApiError } from "@/lib/http";
import { ErrorState } from "@/components/ui/error-state";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/use-auth-store";

interface MinhaLista {
  id: string;
  titulo: string;
  descricao: string | null;
  slug: string;
  criada_at: string;
  total_itens: number;
}

export function ListasPage() {
  const t = useTranslations("listas");
  const { isAuthenticated, hydrated: authHydrated } = useAuthStore();
  const [listas, setListas] = useState<MinhaLista[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [naoEncontrada, setNaoEncontrada] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [creating, setCreating] = useState(false);
  const [premiumNeeded, setPremiumNeeded] = useState(false);

  async function carregar() {
    // D-619: não concluir "você não criou listas" antes de saber se há sessão.
    if (!authHydrated) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      const data = await api.get<MinhaLista[]>("/api/v1/listas");
      setListas(data ?? []);
    } catch (e) {
      // M16 da auditoria: 404 (não existe) e falha de rede/servidor não são a mesma
      // coisa — a primeira é estado honesto, a segunda pede "tentar de novo".
      if (e instanceof ApiError && e.status === 404) {
        setNaoEncontrada(true);
        setError(null);
      } else {
        setError(e instanceof Error ? e.message : t("error"));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
    // carregar depende de isAuthenticated — re-executa no login/logout
  }, [authHydrated, isAuthenticated]);

  async function criar() {
    setCreating(true);
    setPremiumNeeded(false);
    setError(null);
    try {
      await api.post("/api/v1/listas", { titulo, descricao });
      setTitulo("");
      setDescricao("");
      setShowCreate(false);
      // D-584/B4 (T211): criar lista não dava feedback nenhum (o form só fechava).
      toast.success(t("created"));
      await carregar();
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) {
        setPremiumNeeded(true);
      } else {
        setError(e instanceof Error ? e.message : t("error"));
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <ProtectedPage>
      <div className="max-w-4xl mx-auto py-16 px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-heading font-bold text-[#F5F5F7]">{t("title")}</h1>
          <Button onClick={() => setShowCreate((v) => !v)}>{t("create")}</Button>
        </div>

        {premiumNeeded && (
          <div className="mb-6 rounded-lg border border-[#FBBF24]/30 bg-[#FBBF24]/10 px-4 py-3">
            <span className="text-sm text-[#FBBF24]">{t("premiumOnly")}</span>{" "}
            <Link
              href="/pricing"
              className="text-sm font-semibold text-[#818CF8] hover:text-[#A5B4FC]"
            >
              {t("upgrade")}
            </Link>
          </div>
        )}

        {showCreate && (
          <div className="mb-6 rounded-lg border border-[#2A2A3D] bg-[#12121C] p-5 space-y-3">
            <label htmlFor="lista-titulo" className="block text-sm text-[#A0A0B8]">
              {t("titleLabel")}
            </label>
            <input
              id="lista-titulo"
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder={t("titlePlaceholder")}
              className="w-full rounded-md border border-[#2A2A3D] bg-[#1B1B2C] px-3 py-2 text-sm text-[#F5F5F7] placeholder-[#85859F] focus:outline-none focus:ring-2 focus:ring-[#818CF8]"
            />
            <label htmlFor="lista-descricao" className="block text-sm text-[#A0A0B8]">
              {t("descriptionLabel")}
            </label>
            <textarea
              id="lista-descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-[#2A2A3D] bg-[#1B1B2C] px-3 py-2 text-sm text-[#F5F5F7] placeholder-[#85859F] focus:outline-none focus:ring-2 focus:ring-[#818CF8]"
            />
            <div className="flex gap-2">
              <Button onClick={() => void criar()} disabled={creating || !titulo.trim()}>
                {creating ? "..." : t("createSubmit")}
              </Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                {t("cancel")}
              </Button>
            </div>
          </div>
        )}

        {naoEncontrada && (
          <p className="mb-6 text-sm text-[#A0A0B8]" role="status">
            {t("notFound")}
          </p>
        )}

        {error && (
          <div className="mb-6">
            <ErrorState
              message={error}
              onRetry={() => {
                setError(null);
                setLoading(true);
                void carregar();
              }}
            />
          </div>
        )}

        {loading && <p className="text-[#A0A0B8]">{t("loading")}</p>}

        {!loading && listas.length === 0 && !showCreate && (
          <div className="rounded-lg border border-dashed border-[#2A2A3D] py-20 text-center">
            <p className="text-sm text-[#85859F]">{t("empty")}</p>
          </div>
        )}

        <ul role="list" className="grid gap-4 sm:grid-cols-2">
          {listas.map((lista) => (
            <li key={lista.id}>
              <Link
                href={`/listas/${lista.slug}`}
                className="block rounded-lg border border-[#2A2A3D] bg-[#12121C] p-5 hover:border-[#3A3A52] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#818CF8]"
              >
                <h2 className="font-heading font-semibold text-[#F5F5F7]">{lista.titulo}</h2>
                {lista.descricao && (
                  <p className="mt-1 text-sm text-[#A0A0B8] line-clamp-2">{lista.descricao}</p>
                )}
                <p className="mt-3 text-xs text-[#85859F]">
                  {t("itemsCount", { count: lista.total_itens })} · /listas/{lista.slug}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </ProtectedPage>
  );
}
