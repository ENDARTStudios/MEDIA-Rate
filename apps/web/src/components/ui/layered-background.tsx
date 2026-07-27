"use client"

import { cn } from "@/lib/utils"

interface LayeredBackgroundProps {
  children: React.ReactNode
  spotlight?: boolean
  className?: string
}

export function LayeredBackground({ children, spotlight = false, className }: LayeredBackgroundProps) {
  return (
    <>
      {/* Base solid background */}
      <div className="fixed inset-0 bg-[#09090F] pointer-events-none" aria-hidden="true" />

      {/* Grain / noise overlay via SVG feTurbulence */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-none"
        style={{ opacity: 0.025 }}
        aria-hidden="true"
      >
        <filter id="layered-bg-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" />
        </filter>
        <rect width="100%" height="100%" filter="url(#layered-bg-noise)" />
      </svg>

      {/* Subtle 40px grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(129,140,248,0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(129,140,248,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Optional spotlight radial gradient */}
      {spotlight && (
        <div
          className="fixed inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background: "radial-gradient(ellipse at 50% 0%, rgba(129,140,248,0.06) 0%, transparent 60%)",
          }}
        />
      )}

      {/* Content container */}
      <div className={cn("relative z-10", className)}>
        {children}
      </div>
    </>
  )
}
