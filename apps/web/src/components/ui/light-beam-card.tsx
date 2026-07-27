"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface LightBeamCardProps {
  children: React.ReactNode;
  className?: string;
  beamColor?: string;
}

export function LightBeamCard({
  children,
  className,
  beamColor = "#818CF8",
}: LightBeamCardProps) {
  const beam = `linear-gradient(${beamColor}, transparent)` as const;

  return (
    <div
      className={cn(
        "relative rounded-md bg-[#11111E] border border-[rgba(129,140,248,0.08)] overflow-hidden",
        className
      )}
    >
      <motion.div
        className="absolute top-0 left-0 h-[2px] w-[35%] opacity-20"
        style={{ background: `linear-gradient(90deg, transparent, ${beamColor}, transparent)` }}
        animate={{ left: ["-35%", "100%"] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "linear", delay: 0 }}
        aria-hidden="true"
      />
      <motion.div
        className="absolute top-0 right-0 w-[2px] h-[35%] opacity-20"
        style={{ background: `linear-gradient(180deg, transparent, ${beamColor}, transparent)` }}
        animate={{ top: ["-35%", "100%"] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "linear", delay: 0.625 }}
        aria-hidden="true"
      />
      <motion.div
        className="absolute bottom-0 right-0 h-[2px] w-[35%] opacity-20"
        style={{ background: `linear-gradient(90deg, transparent, ${beamColor}, transparent)` }}
        animate={{ right: ["-35%", "100%"] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "linear", delay: 1.25 }}
        aria-hidden="true"
      />
      <motion.div
        className="absolute bottom-0 left-0 w-[2px] h-[35%] opacity-20"
        style={{ background: `linear-gradient(180deg, transparent, ${beamColor}, transparent)` }}
        animate={{ bottom: ["-35%", "100%"] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "linear", delay: 1.875 }}
        aria-hidden="true"
      />

      <div className="relative z-10">{children}</div>
    </div>
  );
}
