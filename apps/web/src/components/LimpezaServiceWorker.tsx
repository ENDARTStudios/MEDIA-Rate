"use client";

import { useEffect } from "react";
import { limparServiceWorkersEstranhosUmaVez } from "@/lib/sw-cleanup";

/**
 * D-525 — monta uma vez no layout raiz e desregistra service workers
 * estranhos da origem (o app não registra SW próprio; ver sw-cleanup.ts).
 * Silencioso por design: falha de storage/permission não pode quebrar o app.
 *
 * IMPORTANTE: esta rotina assume que o MEDIA Rate NÃO registra Service
 * Worker próprio. Se futuramente adotarmos PWA/offline/cache strategy
 * própria, REVISAR/REMOVER esta rotina antes de registrar qualquer sw.js
 * do aplicativo — caso contrário o app se auto-destruiria o cache.
 */
export function LimpezaServiceWorker() {
  useEffect(() => {
    void limparServiceWorkersEstranhosUmaVez().catch(() => undefined);
  }, []);
  return null;
}
