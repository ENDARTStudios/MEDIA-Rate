"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

export function DiagPanel() {
  const sp = useSearchParams();
  if (sp.get("diag") !== "1") return null;

  const buildId =
    typeof window !== "undefined"
      ? (window as any).__NEXT_DATA__?.buildId || "N/A"
      : "SSR";

  const url = typeof window !== "undefined" ? window.location.href : "SSR";

  const [vw, setVw] = useState(0);
  const [vh, setVh] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [meStatus, setMeStatus] = useState<number | null>(null);
  const [meEmail, setMeEmail] = useState("");
  const [meLoading, setMeLoading] = useState(false);
  const [wlStatus, setWlStatus] = useState<number | null>(null);
  const [wlCount, setWlCount] = useState<number | null>(null);
  const [wlLoading, setWlLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [lastApi, setLastApi] = useState("");
  const [minimized, setMinimized] = useState(false);

  const cookies =
    typeof document !== "undefined" ? document.cookie : "";
  const cookieDisplay = cookies
    ? "(present, httpOnly invisible)"
    : "(httpOnly, invisible to JS)";

  const csrfToken =
    typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem("mediarate:csrf")
      : null;
  const csrfDisplay = csrfToken ? csrfToken.substring(0, 4) + "..." : "—";

  const storageKeys =
    typeof sessionStorage !== "undefined"
      ? Object.keys(sessionStorage).join(", ") || "—"
      : "N/A";

  async function testMe() {
    setMeLoading(true);
    try {
      const r = await fetch("/api/v1/auth/me", { credentials: "include" });
      setMeStatus(r.status);
      setLastApi(`/me → ${r.status}`);
      if (r.ok) {
        const d = await r.json();
        setMeEmail(
          d.email || d.nome || JSON.stringify(d).substring(0, 40)
        );
      } else {
        setMeEmail(
          r.status === 401
            ? "NÃO LOGADO / cookie não enviado"
            : `Error ${r.status}`
        );
      }
    } catch (e: any) {
      setMeStatus(0);
      setMeEmail("fetch failed: " + (e.message || "network"));
    }
    setMeLoading(false);
  }

  async function testWatchlist() {
    setWlLoading(true);
    try {
      const r = await fetch("/api/v1/watchlist", { credentials: "include" });
      setWlStatus(r.status);
      setLastApi(`/watchlist → ${r.status}`);
      if (r.ok) {
        const d = await r.json();
        setWlCount(Array.isArray(d) ? d.length : d.items?.length ?? 0);
      }
    } catch (e: any) {
      setWlStatus(0);
    }
    setWlLoading(false);
  }

  useEffect(() => {
    setHydrated(true);
    setVw(window.innerWidth);
    setVh(window.innerHeight);
    const onResize = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    const onError = (e: ErrorEvent) => {
      setErrors((prev) =>
        [...prev, `JS: ${e.message?.substring(0, 80)}`].slice(-10)
      );
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      setErrors((prev) =>
        [
          ...prev,
          `Promise: ${String(e.reason).substring(0, 80)}`,
        ].slice(-10)
      );
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    testMe().then(() => testWatchlist());

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  function copyReport() {
    const lines = [
      "MEDIA Rate Diag v1",
      `deploy: ${buildId}`,
      `url: ${url}`,
      `viewport: ${vw}x${vh}`,
      `hydrated: ${hydrated}`,
      `cookie_js: ${cookieDisplay}`,
      `csrf: ${csrfDisplay}`,
      `storage_keys: ${storageKeys}`,
      `me: ${meStatus} ${meEmail}`,
      `watchlist: ${wlStatus} items=${wlCount}`,
      `last_api: ${lastApi}`,
      `errors(${errors.length}): ${errors.join(" | ")}`,
    ];
    navigator.clipboard.writeText(lines.join("\n"));
  }

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex gap-1">
      <span className="text-[#6B7280] shrink-0">{label}: </span>
      <span className="text-[#EDE7DC] break-all">{value}</span>
    </div>
  );

  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-[#11111E] border border-[#1C1C2E] rounded-md px-3 py-1.5 text-[11px] font-mono text-[#9CA3AF]">
        <button
          onClick={() => setMinimized(false)}
          className="text-[#6B7280] hover:text-[#EDE7DC]"
        >
          Diag
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-[#11111E] border border-[#1C1C2E] rounded-md max-w-xs p-3 text-[11px] font-mono text-[#9CA3AF] flex flex-col gap-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[#818CF8] font-bold text-[12px]">
          MEDIA Rate Diag
        </span>
        <button
          onClick={() => setMinimized(true)}
          className="text-[#6B7280] hover:text-[#EDE7DC] leading-none"
        >
          _
        </button>
      </div>
      {row("deploy", buildId)}
      {row("url", url)}
      {row("viewport", `${vw}x${vh}`)}
      {row("hydrated", String(hydrated))}
      {row("cookie_js", cookieDisplay)}
      {row("csrf", csrfDisplay)}
      {row("storage_keys", storageKeys)}
      {row(
        "me",
        meLoading
          ? "loading..."
          : `${meStatus ?? "—"} ${meEmail}`
      )}
      {row(
        "watchlist",
        wlLoading
          ? "loading..."
          : `${wlStatus ?? "—"} items=${wlCount ?? "—"}`
      )}
      {row("last_api", lastApi || "—")}
      {row(
        "errors",
        errors.length === 0 ? "—" : `${errors.length} erro(s)`
      )}
      {errors.length > 0 && (
        <div className="max-h-16 overflow-y-auto text-[#EF4444] mt-0.5">
          {errors.map((e, i) => (
            <div key={i}>{e}</div>
          ))}
        </div>
      )}
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => testMe().then(() => testWatchlist())}
          className="bg-[#1C1C2E] px-2 py-0.5 rounded text-[#EDE7DC] hover:bg-[#2A2A3E]"
        >
          Retestar
        </button>
        <button
          onClick={() => setErrors([])}
          className="bg-[#1C1C2E] px-2 py-0.5 rounded text-[#EDE7DC] hover:bg-[#2A2A3E]"
        >
          Limpar erros
        </button>
        <button
          onClick={copyReport}
          className="bg-[#1C1C2E] px-2 py-0.5 rounded text-[#EDE7DC] hover:bg-[#2A2A3E]"
        >
          Copiar relatório
        </button>
      </div>
    </div>
  );
}
