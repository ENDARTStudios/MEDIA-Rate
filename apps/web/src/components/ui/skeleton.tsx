"use client";

type SkeletonProps = {
  variant?: "text" | "card" | "circle" | "rect";
  className?: string;
};

export function Skeleton({ variant = "text", className = "" }: SkeletonProps) {
  switch (variant) {
    case "circle":
      return (
        <div
          className={`rounded-full aspect-square bg-[#1C1C2E] animate-pulse ${className}`}
        />
      );
    case "card":
      return (
        <div
          className={`aspect-[2/3] bg-[#1C1C2E] rounded-md animate-pulse ${className}`}
        />
      );
    case "rect":
      return (
        <div
          className={`bg-[#1C1C2E] rounded-md animate-pulse ${className}`}
        />
      );
    default:
      return (
        <div
          className={`h-4 bg-[#1C1C2E] rounded-md animate-pulse w-full ${className}`}
        />
      );
  }
}
