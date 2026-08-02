"use client";

import { cn } from "@/lib/utils";

interface HoverTextEffectProps {
  children: React.ReactNode;
  className?: string;
}

export function HoverTextEffect({ children, className }: HoverTextEffectProps) {
  return (
    <span
      className={cn(
        "inline-block transition-all duration-300 ease-out",
        "hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-[#818CF8] hover:to-[#38BDF8]",
        className,
      )}
      style={
        {
          transitionProperty: "color, text-shadow",
          textShadow: "none",
        } as React.CSSProperties
      }
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.textShadow = "0 0 12px rgba(129,140,248,0.4)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.textShadow = "none";
      }}
    >
      {children}
    </span>
  );
}
