import { ApiError } from "@/lib/http";

/** T205 Fase 1 — evento que o AdminStepUpDialog escuta para pedir a senha. */
export const ADMIN_STEPUP_REQUIRED_EVENT = "admin:stepup-required";

/** 428 do guard de step-up (marca ausente/expirada). */
export function ehStepUpRequired(erro: unknown): boolean {
  return erro instanceof ApiError && erro.status === 428;
}

/**
 * T205 Fase 1 — wrapper para chamadas admin DESTRUTIVAS: executa a operação e,
 * se o backend responder 428 (step-up requerido), dispara o diálogo de senha
 * (AdminStepUpDialog, montado no AdminShell) e REPETE a operação UMA única vez
 * após o step-up bem-sucedido. Cancelamento → propaga o 428 original, sem
 * efeito colateral. A senha NUNCA é armazenada — trafega só no evento/estado
 * efêmero do diálogo.
 */
export async function comStepUp<T>(operacao: () => Promise<T>): Promise<T> {
  try {
    return await operacao();
  } catch (erro) {
    if (!ehStepUpRequired(erro)) throw erro;
    const senha = await new Promise<string | null>((resolve) => {
      window.dispatchEvent(
        new CustomEvent(ADMIN_STEPUP_REQUIRED_EVENT, {
          detail: { resolve },
        }),
      );
    });
    if (senha === null) throw erro; // admin cancelou o diálogo
    return await operacao(); // retry ÚNICO com a marca recém-concedida
  }
}
