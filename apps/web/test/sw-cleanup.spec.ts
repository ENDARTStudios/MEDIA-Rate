import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  limparServiceWorkersEstranhos,
  limparServiceWorkersEstranhosUmaVez,
} from "@/lib/sw-cleanup";

/**
 * D-525 — o app NÃO registra service worker próprio; qualquer SW na origem
 * é estranho (ex.: outro projeto em localhost:3000) e prende o app em chunks
 * velhos. A limpeza desregistra todos e apaga o Cache Storage.
 */

interface Registro {
  unregister: () => Promise<boolean>;
}

function instalarAmbiente({
  registros,
  cachesExistentes,
}: {
  registros: Registro[];
  cachesExistentes: string[];
}) {
  const desregistrados: boolean[] = [];
  const apagados: string[] = [];
  vi.stubGlobal("window", {});
  vi.stubGlobal("navigator", {
    serviceWorker: {
      getRegistrations: vi.fn(async () =>
        registros.map(() => ({
          unregister: async () => {
            desregistrados.push(true);
            return true;
          },
        })),
      ),
    },
  });
  vi.stubGlobal("caches", {
    keys: vi.fn(async () => cachesExistentes),
    delete: vi.fn(async (nome: string) => {
      apagados.push(nome);
      return true;
    }),
  });
  return { desregistrados, apagados };
}

describe("limparServiceWorkersEstranhos (D-525)", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("desregistra todos os SWs e apaga todos os caches da origem", async () => {
    const { desregistrados, apagados } = instalarAmbiente({
      registros: [{} as Registro, {} as Registro, {} as Registro],
      cachesExistentes: ["sf-static-v1", "sf-pages-v1"],
    });
    const r = await limparServiceWorkersEstranhos();
    expect(r.swRemovidos).toBe(3);
    expect(r.cachesRemovidos).toBe(2);
    expect(desregistrados).toHaveLength(3);
    expect(apagados).toEqual(["sf-static-v1", "sf-pages-v1"]);
  });

  it("é no-op em SSR (sem window/navigator)", async () => {
    const r = await limparServiceWorkersEstranhos();
    expect(r).toEqual({ swRemovidos: 0, cachesRemovidos: 0 });
  });

  it("ambiente sem SW nem caches → zeros sem erro", async () => {
    instalarAmbiente({ registros: [], cachesExistentes: [] });
    const r = await limparServiceWorkersEstranhos();
    expect(r).toEqual({ swRemovidos: 0, cachesRemovidos: 0 });
  });

  it("limparServiceWorkersEstranhosUmaVez roda a limpeza uma única vez", async () => {
    instalarAmbiente({ registros: [{} as Registro], cachesExistentes: ["x"] });
    const a = await limparServiceWorkersEstranhosUmaVez();
    const b = await limparServiceWorkersEstranhosUmaVez();
    expect(a).toEqual(b);
  });
});
