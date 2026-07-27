"use client"

import { cn } from "@/lib/utils"

const scoreColor = (score: number) => {
  if (score >= 9) return "#34D399"
  if (score >= 8) return "#38BDF8"
  if (score >= 7) return "#818CF8"
  if (score >= 6) return "#F59E0B"
  if (score >= 5) return "#F97316"
  return "#EF4444"
}

type BadgeProps = {
  children?: React.ReactNode
  variant?: "type" | "score" | "status"
  typeLabel?: "Filme" | "Série" | "Jogo"
  score?: number
  statusLabel?: "Free" | "Plus" | "Premium"
  className?: string
}

function Badge({
  children,
  variant = "type",
  typeLabel,
  score,
  statusLabel,
  className,
}: BadgeProps) {
  const display =
    children ??
    (variant === "type"
      ? typeLabel
      : variant === "score" && typeof score === "number"
        ? score.toString()
        : variant === "status"
          ? statusLabel
          : null)

  let style: React.CSSProperties = {}
  let hasBorder = false

  if (variant === "type") {
    hasBorder = true
    style = { backgroundColor: "#1C1C2E", color: "#9CA3AF", borderColor: "#1C1C2E" }
  } else if (variant === "score" && typeof score === "number") {
    hasBorder = true
    const c = scoreColor(score)
    style = { backgroundColor: "transparent", color: c, borderColor: c }
  } else if (variant === "status") {
    if (statusLabel === "Free") {
      style = { backgroundColor: "#11111E", color: "#9CA3AF" }
    } else if (statusLabel === "Plus") {
      style = { backgroundColor: "rgba(129,140,248,0.15)", color: "#818CF8" }
    } else if (statusLabel === "Premium") {
      style = { backgroundColor: "rgba(245,158,11,0.15)", color: "#F59E0B" }
    }
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        hasBorder && "border",
        className
      )}
      style={style}
    >
      {display}
    </span>
  )
}

export { Badge }
