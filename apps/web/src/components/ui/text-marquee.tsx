"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";

interface TextMarqueeProps {
  items: string[];
  speed?: number;
  className?: string;
  itemClassName?: string;
  pauseOnHover?: boolean;
}

export function TextMarquee({
  items,
  speed = 30,
  className,
  itemClassName,
  pauseOnHover = true,
}: TextMarqueeProps) {
  // T046: detecta prefers-reduced-motion apos mount (evita mismatch SSR/cliente).
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduce(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  if (reduce) {
    return (
      <div className={`flex flex-wrap justify-center gap-4 ${className ?? ""}`}>
        {items.map((item, i) => (
          <span key={i} className={itemClassName}>{item}</span>
        ))}
      </div>
    );
  }

  return (
    <div className={`overflow-hidden whitespace-nowrap ${className ?? ""}`}>
      <motion.div
        className="inline-flex gap-8"
        animate={{ x: ["0%", "-50%"] }}
        transition={{
          duration: items.length * (speed / 10),
          ease: "linear",
          repeat: Infinity,
        }}
        whileHover={pauseOnHover ? { animationPlayState: "paused" } : undefined}
      >
        {[...items, ...items].map((item, i) => (
          <span
            key={i}
            className={`inline-block px-4 py-2 rounded-full bg-surface-card border border-surface-border/50 text-gray-300 text-sm font-medium hover:text-white hover:border-accent-500/50 transition-colors ${itemClassName ?? ""}`}
          >
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
