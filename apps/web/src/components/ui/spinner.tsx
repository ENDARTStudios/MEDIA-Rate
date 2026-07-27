"use client"

import { cn } from "@/lib/utils"

const sizeMap = {
  sm: "w-4 h-4 border-2",
  md: "w-6 h-6 border-2",
  lg: "w-8 h-8 border-[3px]",
} as const

type SpinnerProps = {
  size?: "sm" | "md" | "lg"
  className?: string
}

function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <div
      className={cn(
        "animate-spin rounded-full border-transparent",
        sizeMap[size],
        className
      )}
      style={{ borderTopColor: "#818CF8" }}
    />
  )
}

export { Spinner }
