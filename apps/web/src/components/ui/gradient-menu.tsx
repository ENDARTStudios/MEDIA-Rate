"use client";

import { Link } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface GradientMenuProps {
  items: { label: string; href: string }[];
  className?: string;
}

export function GradientMenu({ items, className }: GradientMenuProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="relative px-3 py-2 text-sm text-[#9CA3AF] transition-all duration-200 hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-[#818CF8] hover:to-[#38BDF8]"
          style={{ transitionProperty: "color, text-shadow" } as React.CSSProperties}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.textShadow =
              "0 4px 12px rgba(129,140,248,0.2)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.textShadow = "none";
          }}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
