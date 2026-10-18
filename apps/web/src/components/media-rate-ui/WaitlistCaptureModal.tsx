"use client";

/**
 * Modal leve de captura de e-mail para categorias futuras (addendum §6).
 * Reutiliza o mesmo callback de waitlist do EmptyStateComingSoon.
 */
import * as Dialog from "@radix-ui/react-dialog";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

export interface WaitlistCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Título/categoria em destaque (ex.: "Livros"). */
  categoryLabel: string;
  onNotify?: (email: string) => Promise<void> | void;
}

export function WaitlistCaptureModal({
  open,
  onOpenChange,
  categoryLabel,
  onNotify,
}: WaitlistCaptureModalProps) {
  const t = useTranslations("catalog");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!onNotify || !email) return;
    setBusy(true);
    try {
      await onNotify(email);
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-modal bg-black/70 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-modal w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-surface-border bg-surface-card p-6 shadow-floating focus:outline-none"
          aria-describedby={undefined}
        >
          <Dialog.Title className="font-heading text-lg font-bold text-fg-primary">
            {categoryLabel} — {t("noResults")}
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-fg-secondary">
            {t("comingSoonNotify")}
          </Dialog.Description>

          {sent ? (
            <p className="mt-5 text-sm font-medium text-accent-emerald" role="status">
              Cadastrado! Avisaremos quando chegar.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-5 space-y-3">
              <label htmlFor="waitlist-email" className="sr-only">
                {t("comingSoonEmailLabel")}
              </label>
              <input
                id="waitlist-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("comingSoonEmailPlaceholder")}
                className="w-full rounded-md border border-surface-border bg-surface-elevated px-3 py-2 text-sm text-fg-primary placeholder-fg-muted focus:outline-none focus:ring-2 focus:ring-accent-indigo"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 rounded-md bg-accent-indigo px-4 py-2 text-sm font-semibold text-accent-indigo-foreground transition-opacity disabled:opacity-50"
                >
                  {busy ? "..." : t("notifyButton")}
                </button>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-md border border-surface-border px-4 py-2 text-sm text-fg-secondary hover:text-fg-primary transition-colors"
                  >
                    {t("cancelar")}
                  </button>
                </Dialog.Close>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
