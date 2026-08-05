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
          className="fixed left-1/2 top-1/2 z-modal w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[#2A2A3D] bg-[#12121C] p-6 shadow-floating focus:outline-none"
          aria-describedby={undefined}
        >
          <Dialog.Title className="font-heading text-lg font-bold text-[#F5F5F7]">
            {categoryLabel} — {t("noResults")}
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-[#A0A0B8]">
            {t("comingSoonNotify")}
          </Dialog.Description>

          {sent ? (
            <p className="mt-5 text-sm font-medium text-[#34D399]" role="status">
              Cadastrado! Avisaremos quando chegar.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-5 space-y-3">
              <label htmlFor="waitlist-email" className="sr-only">
                E-mail
              </label>
              <input
                id="waitlist-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full rounded-md border border-[#2A2A3D] bg-[#1B1B2C] px-3 py-2 text-sm text-[#F5F5F7] placeholder-[#6B6B85] focus:outline-none focus:ring-2 focus:ring-[#818CF8]"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 rounded-md bg-[#818CF8] px-4 py-2 text-sm font-semibold text-[#0F172A] transition-opacity disabled:opacity-50"
                >
                  {busy ? "..." : "Avisar-me"}
                </button>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-md border border-[#2A2A3D] px-4 py-2 text-sm text-[#A0A0B8] hover:text-[#F5F5F7] transition-colors"
                  >
                    Cancelar
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
