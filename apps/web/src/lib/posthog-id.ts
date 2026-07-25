"use client";

const COOKIE_KEY = "ph_distinct_id";

export function getOrCreateDistinctId(): string {
  if (typeof document === "undefined") return "anon";
  const existing = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${COOKIE_KEY}=`))
    ?.split("=")[1];
  if (existing) return existing;
  const id = crypto.randomUUID();
  document.cookie = `${COOKIE_KEY}=${id}; path=/; max-age=31536000; SameSite=Lax`;
  return id;
}
