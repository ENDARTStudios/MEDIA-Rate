"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface VerticalMarqueeProps {
  items: string[];
  speed?: number;
  className?: string;
}

export function VerticalMarquee({ items, speed = 30, className }: VerticalMarqueeProps) {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduce(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  return (
    <div className={cn("relative w-16 overflow-hidden", className)} aria-hidden="true">
      <div className="absolute inset-0 bg-gradient-to-b from-[#09090F] via-transparent to-[#09090F] pointer-events-none z-10" />

      <div className={cn("flex flex-col items-center", reduce && "gap-4 py-8")}>
        {reduce ? (
          items.map((item, i) => (
            <span
              key={i}
              className="text-xs text-[#9CA3AF] font-heading tracking-wider"
              style={{ writingMode: "vertical-rl" }}
            >
              {item}
            </span>
          ))
        ) : (
          <motion.div
            className="flex flex-col items-center gap-2"
            animate={{ y: ["0%", "-50%"] }}
            transition={{
              duration: speed,
              ease: "linear",
              repeat: Infinity,
            }}
            style={{ willChange: "transform" }}
          >
            {[...items, ...items].map((item, i) => (
              <span
                key={i}
                className="text-xs text-[#9CA3AF] font-heading tracking-wider whitespace-nowrap"
                style={{ writingMode: "vertical-rl" }}
              >
                {item}
              </span>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
