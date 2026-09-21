/**
 * D-525 — mitigação de service worker estranho na origem.
 *
 * O MEDIA Rate NÃO registra service worker próprio (evidência: nenhum
 * `serviceWorker.register` no código, nenhum sw.js no repositório ou no
 * histórico git, sem next-pwa/workbox). Porém, na origem de DESENVOLVIMENTO
 * (localhost:3000) outros projetos podem registrar um SW — e um SW antigo de
 * terceiros controla as páginas deste app, servindo chunks velhos ("render
 * antigo" silencioso, reportado na auditoria S1).
 *
 * Estratégia: no boot do app, desregistrar QUALQUER service worker da origem
 * e limpar o Cache Storage. Se um dia o app passar a ter SW próprio, esta
 * rotina DEVE ser atualizada antes (checar o scriptURL antes de remover).
 */

export interface LimpezaSwResultado {
  swRemovidos: number;
  cachesRemovidos: number;
}

export async function limparServiceWorkersEstranhos(): Promise<LimpezaSwResultado> {
  const resultado: LimpezaSwResultado = { swRemovidos: 0, cachesRemovidos: 0 };
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return resultado; // SSR — nada a fazer.
  }

  const sw = navigator.serviceWorker;
  if (sw?.getRegistrations) {
    const registros = await sw.getRegistrations();
    for (const registro of registros) {
      const desregistrado = await registro.unregister().catch(() => false);
      if (desregistrado) resultado.swRemovidos += 1;
    }
  }

  if (typeof caches !== "undefined" && caches?.keys) {
    const nomes = await caches.keys();
    for (const nome of nomes) {
      const apagado = await caches.delete(nome).catch(() => false);
      if (apagado) resultado.cachesRemovidos += 1;
    }
  }

  return resultado;
}

/** Executa a limpeza UMA vez por sessão de página (idempotente). */
let emAndamento: Promise<LimpezaSwResultado> | null = null;

export function limparServiceWorkersEstranhosUmaVez(): Promise<LimpezaSwResultado> {
  emAndamento ??= limparServiceWorkersEstranhos();
  return emAndamento;
}
