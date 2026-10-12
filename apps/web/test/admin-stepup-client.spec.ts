import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  comStepUp,
  ADMIN_STEPUP_REQUIRED_EVENT,
  ehStepUpRequired,
} from "@/lib/admin-stepup-client";
import { ApiError } from "@/lib/http";

/**
 * T205 Fase 1 — wrapper comStepUp: transparente sem 428; em 428 dispara o
 * evento do diálogo e REPETE a operação UMA vez; cancelamento (null) propaga
 * o 428 original; outros erros propagam sem evento.
 */

function erro428(): ApiError {
  return new ApiError(428, "Confirme sua senha para executar esta ação.", {
    statusCode: 428,
    code: "ADMIN_STEPUP_REQUIRED",
  });
}

describe("comStepUp (T205 Fase 1)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("operação bem-sucedida sem 428 → resultado direto, SEM evento", async () => {
    const espiaoEvento = vi.fn();
    window.addEventListener(ADMIN_STEPUP_REQUIRED_EVENT, espiaoEvento);
    const resultado = await comStepUp(async () => "feito");
    expect(resultado).toBe("feito");
    expect(espiaoEvento).not.toHaveBeenCalled();
    window.removeEventListener(ADMIN_STEPUP_REQUIRED_EVENT, espiaoEvento);
  });

  it("428 → dispara evento com resolve e repete a operação UMA vez", async () => {
    let chamadas = 0;
    let senhaRecebida: string | null = null;
    window.addEventListener(
      ADMIN_STEPUP_REQUIRED_EVENT,
      ((e: CustomEvent) => {
        setTimeout(() => {
          senhaRecebida = "senha-do-admin";
          e.detail.resolve("senha-do-admin");
        }, 0);
      }) as EventListener,
      { once: true },
    );
    const r = await comStepUp(async () => {
      chamadas++;
      if (chamadas === 1) throw erro428();
      return "ok-pós-stepup";
    });
    expect(r).toBe("ok-pós-stepup");
    expect(chamadas).toBe(2);
    expect(senhaRecebida).toBe("senha-do-admin");
  });

  it("cancelamento (resolve null) → propaga o 428 original SEM repetir", async () => {
    let chamadas = 0;
    window.addEventListener(
      ADMIN_STEPUP_REQUIRED_EVENT,
      ((e: CustomEvent) => {
        setTimeout(() => e.detail.resolve(null), 0);
      }) as EventListener,
      { once: true },
    );
    await expect(
      comStepUp(async () => {
        chamadas++;
        throw erro428();
      }),
    ).rejects.toMatchObject({ status: 428 });
    expect(chamadas).toBe(1);
  });

  it("erro NÃO-428 → propaga sem disparar evento", async () => {
    const espiaoEvento = vi.fn();
    window.addEventListener(ADMIN_STEPUP_REQUIRED_EVENT, espiaoEvento);
    await expect(
      comStepUp(async () => {
        throw new ApiError(403, "Forbidden");
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect(espiaoEvento).not.toHaveBeenCalled();
    window.removeEventListener(ADMIN_STEPUP_REQUIRED_EVENT, espiaoEvento);
  });

  it("ehStepUpRequired: true só para ApiError 428", () => {
    expect(ehStepUpRequired(erro428())).toBe(true);
    expect(ehStepUpRequired(new ApiError(403, "x"))).toBe(false);
    expect(ehStepUpRequired(new Error("x"))).toBe(false);
    expect(ehStepUpRequired(null)).toBe(false);
  });
});
