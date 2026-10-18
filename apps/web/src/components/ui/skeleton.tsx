"use client";

interface SkeletonProps {
  variant?: "text" | "card" | "circle" | "rect";
  className?: string;
}

export function Skeleton({ variant = "text", className = "" }: SkeletonProps) {
  switch (variant) {
    case "circle":
      return (
        <div
          className={`rounded-full aspect-square bg-surface-elevated animate-pulse ${className}`}
        />
      );
    case "card":
      return (
        <div className={`aspect-[2/3] bg-surface-elevated rounded-md animate-pulse ${className}`} />
      );
    case "rect":
      return <div className={`bg-surface-elevated rounded-md animate-pulse ${className}`} />;
    default:
      return (
        <div className={`h-4 bg-surface-elevated rounded-md animate-pulse w-full ${className}`} />
      );
  }
}
