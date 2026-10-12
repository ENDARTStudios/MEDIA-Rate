"use client";

import { Link } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface GradientMenuProps {
  items: { label: string; href: string }[];
  className?: string;
}

/**
 * Menu de navegação com realce em hover.
 *
 * T210: o realce era `hover:bg-clip-text + bg-gradient-to-r` (texto com
 * gradiente) mais um `text-shadow` aplicado por JS no mouseenter. O detector de
 * DOM marca `gradient-text` como "AI tell" (texto decorativo em vez de
 * significado) e a cor do texto ficava imprevisível para contraste. Agora o
 * hover é cor sólida do token + sublinhado, 100% CSS (sem handler de mouse, sem
 * estado, sem paint de gradiente).
 */
export function GradientMenu({ items, className }: GradientMenuProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="relative px-3 py-2 text-sm text-[#9CA3AF] underline-offset-4 transition-colors duration-200 hover:text-[#F5F5F7] hover:underline focus-visible:text-[#F5F5F7]"
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
