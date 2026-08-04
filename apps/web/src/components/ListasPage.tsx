"use client";

/**
 * Minhas listas colaborativas (Premium — D-132).
 * Criação exige Premium (402 da API → upsell); visualização compartilhável.
 */
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { api, ApiError } from "@/lib/http";
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
  const { isAuthenticated } = useAuthStore();
  const [listas, setListas] = useState<MinhaLista[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [creating, setCreating] = useState(false);
  const [premiumNeeded, setPremiumNeeded] = useState(false);

  async function carregar() {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      const data = await api.get<MinhaLista[]>("/api/v1/listas");
      setListas(data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
    // carregar depende de isAuthenticated — re-executa no login/logout
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  async function criar() {
    setCreating(true);
    setPremiumNeeded(false);
    setError(null);
    try {
      await api.post("/api/v1/listas", { titulo, descricao });
      setTitulo("");
      setDescricao("");
      setShowCreate(false);
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
              className="w-full rounded-md border border-[#2A2A3D] bg-[#1B1B2C] px-3 py-2 text-sm text-[#F5F5F7] placeholder-[#6B6B85] focus:outline-none focus:ring-2 focus:ring-[#818CF8]"
            />
            <label htmlFor="lista-descricao" className="block text-sm text-[#A0A0B8]">
              {t("descriptionLabel")}
            </label>
            <textarea
              id="lista-descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-[#2A2A3D] bg-[#1B1B2C] px-3 py-2 text-sm text-[#F5F5F7] placeholder-[#6B6B85] focus:outline-none focus:ring-2 focus:ring-[#818CF8]"
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

        {error && (
          <p className="mb-6 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        {loading && <p className="text-[#A0A0B8]">{t("loading")}</p>}

        {!loading && listas.length === 0 && !showCreate && (
          <div className="rounded-lg border border-dashed border-[#2A2A3D] py-20 text-center">
            <p className="text-sm text-[#6B6B85]">{t("empty")}</p>
          </div>
        )}

        <ul className="grid gap-4 sm:grid-cols-2">
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
                <p className="mt-3 text-xs text-[#6B6B85]">
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
