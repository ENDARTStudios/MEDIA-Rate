"use client";

import { usePathname } from "next/navigation";
import { Link } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface GradientMenuProps {
  items: { label: string; href: string }[];
  className?: string;
}

/**
 * Menu de navegação com realce em hover e ESTADO ATIVO por rota.
 *
 * T210: o realce era `hover:bg-clip-text + bg-gradient-to-r` (texto com
 * gradiente) mais um `text-shadow` aplicado por JS no mouseenter. O detector de
 * DOM marca `gradient-text` como "AI tell" (texto decorativo em vez de
 * significado) e a cor do texto ficava imprevisível para contraste. Agora o
 * hover é cor sólida do token + sublinhado, 100% CSS (sem handler de mouse, sem
 * estado, sem paint de gradiente).
 *
 * D-659 (reestruturação da casca): a barra não indicava onde o usuário estava —
 * só reagia a hover. Sem isso, "intuitivo" não fecha: o usuário não sabe se
 * está em /catalog ou em /top. O ativo agora vem da ROTA (`usePathname`),
 * não de estado local, e expõe `aria-current="page"` — o que leitores de tela
 * também anunciam. O prefixo de locale é removido antes da comparação porque
 * `usePathname()` devolve `/pt-BR/catalog` e o item declara `/catalog`.
 */
const SEM_LOCALE = /^\/(pt-BR|en-US|es-ES)(?=\/|$)/;

export function GradientMenu({ items, className }: GradientMenuProps) {
  const pathname = usePathname() ?? "/";
  const atual = pathname.replace(SEM_LOCALE, "") || "/";

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {items.map((item) => {
        const ativo = atual === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={ativo ? "page" : undefined}
            data-active={ativo ? "true" : undefined}
            className={cn(
              "relative px-3 py-2 text-sm underline-offset-4 transition-colors duration-200 hover:text-[#F5F5F7] hover:underline focus-visible:text-[#F5F5F7]",
              ativo ? "text-[#F5F5F7]" : "text-[#A0A0B8]",
            )}
          >
            {item.label}
            {/* Sublinhado do ativo: cor do accent do conceito, não do texto. */}
            {ativo ? (
              <span
                aria-hidden="true"
                className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-[#818CF8]"
              />
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
