"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { baixarListaPdf } from "@/lib/list-pdf";
import { montarConvite, urlDaLista, type ListaResumo } from "@/lib/list-share";

/**
 * Compartilhar lista + baixar PDF.
 *
 * Compartilhar lista neste produto é **dar o link**: a lista já é pública por slug
 * (`GET /listas/:slug`), e qualquer pessoa logada pode sugerir título. Não existe
 * "acesso restrito" para inventar conceito novo aqui.
 *
 * O que o componente acrescenta em cima do link:
 * - **convite** pronto (título + recado + contagem + link) para colar no WhatsApp/e-mail.
 *   O recado é a `descricao` da lista — é ali que o dono escreve "para quem é isto";
 * - **Web Share** quando o aparelho tem (`navigator.share`), com o convite como texto;
 * - **PDF** da lista, gerado no cliente sob demanda (jsPDF em import dinâmico, ver
 *   `lib/list-pdf.ts`).
 *
 * O origin só é lido depois da montagem: usar `window` no render quebraria a hidratação
 * (o servidor não tem origem).
 */
export function ShareLista({
  lista,
  ehDono,
  onEditarRecado,
}: {
  /** Dados já normalizados para convite/PDF (sem depender da forma da API). */
  lista: ListaResumo;
  ehDono: boolean;
  onEditarRecado?: () => void;
}) {
  const t = useTranslations("listas");
  const locale = useLocale();
  const [aberto, setAberto] = useState(false);
  const [url, setUrl] = useState(() => urlDaLista(lista.slug, locale));
  const [baixando, setBaixando] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUrl(urlDaLista(lista.slug, locale, window.location.origin));
    }
  }, [lista.slug, locale]);

  const rotulos = {
    byOwner: t("byOwner", { owner: lista.donoNome ?? "—" }),
    itemsCount: t("itemsCount", { count: lista.itens.length }),
    seeList: t("seeList"),
  };
  const convite = montarConvite(lista, url, rotulos);

  async function copiar(texto: string, mensagemOk: string) {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success(mensagemOk);
    } catch {
      // Sem Clipboard API (contexto inseguro/permite negada) não fingimos sucesso.
      toast.error(t("copyFailed"));
    }
  }

  async function compartilharNativo() {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") return;
    try {
      await navigator.share({ title: lista.titulo, text: convite, url });
    } catch {
      // Cancelar o share sheet não é erro: o usuário desistiu.
    }
  }

  async function baixarPdf() {
    setBaixando(true);
    try {
      await baixarListaPdf(lista, {
        byOwner: t("byOwner", { owner: lista.donoNome ?? "—" }),
        itemsCount: t("itemsCount", { count: lista.itens.length }),
        note: t("noteLabel"),
        // UAT-39: o PDF sai timbrado — tagline da marca, site e link da lista.
        tagline: t("pdfTagline"),
        site: "mediarate.app",
        verEm: t("seeList"),
        url,
      });
    } catch {
      toast.error(t("pdfError"));
    } finally {
      setBaixando(false);
    }
  }

  const temShareNativo = typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          aria-controls="compartilhar-lista"
          data-testid="compartilhar-lista-abrir"
        >
          {aberto ? t("close") : t("share")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void baixarPdf()}
          disabled={baixando}
          data-testid="baixar-pdf-lista"
        >
          {baixando ? t("pdfPreparing") : t("downloadPdf")}
        </Button>
      </div>

      {aberto && (
        <div
          id="compartilhar-lista"
          className="mt-3 space-y-3 rounded-lg border border-surface-border bg-surface-card p-4"
        >
          <p className="text-xs leading-relaxed text-fg-muted">{t("shareHint")}</p>

          <label className="block text-xs font-semibold uppercase tracking-widest text-fg-muted">
            {t("listLink")}
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="mt-1 w-full rounded-md border border-surface-border bg-surface-elevated px-3 py-2 text-sm text-fg-primary"
              data-testid="link-lista"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => void copiar(url, t("linkCopied"))}
              data-testid="copiar-link"
            >
              {t("copyLink")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void copiar(convite, t("inviteCopied"))}
              data-testid="copiar-convite"
            >
              {t("copyInvite")}
            </Button>
            {temShareNativo && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void compartilharNativo()}
                data-testid="share-nativo"
              >
                {t("shareNative")}
              </Button>
            )}
            {ehDono && onEditarRecado && !lista.descricao && (
              <Button size="sm" variant="ghost" onClick={onEditarRecado}>
                {t("addNote")}
              </Button>
            )}
          </div>

          <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-surface-border bg-surface-elevated p-3 text-xs text-fg-secondary">
            {convite}
          </pre>
        </div>
      )}
    </div>
  );
}
