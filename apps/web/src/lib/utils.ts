import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Valida um callbackUrl de login/registro para impedir open redirect
 * (ex.: `//evil.com`, `/\evil.com` ou URLs absolutas).
 * Retorna apenas caminhos internos começando com `/` e não seguido de `/` ou `\`.
 */
export function getSafeCallbackUrl(callbackUrl: string | null): string {
  const internal =
    callbackUrl &&
    callbackUrl.startsWith("/") &&
    !callbackUrl.startsWith("//") &&
    !callbackUrl.startsWith("/\\") &&
    !callbackUrl.startsWith("/%5c");
  return internal ? callbackUrl : "/dashboard";
}
