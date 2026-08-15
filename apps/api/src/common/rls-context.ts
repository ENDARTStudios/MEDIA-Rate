import type { Prisma, PrismaClient } from "@prisma/client";

export const DEFAULT_TENANT = "00000000-0000-0000-0000-000000000001";

/** T343: role de serviço interno (webhooks de billing) — sem bypass global. */
export const ROLE_SERVICE = "SERVICE";

type TxRls = Prisma.TransactionClient;

export interface RlsContexto {
  usuarioId?: string | null;
  tenantId?: string | null;
  role: string;
}

/**
 * T290 (D-284) — executa uma função DENTRO de $transaction com SET LOCAL
 * do contexto RLS (current_user_id/current_tenant_id/current_user_role).
 * SET LOCAL é transacional — não vaza entre requisições no pool.
 * Políticas usam current_setting(..., true) → contexto ausente = negação
 * silenciosa (interações) ou fallback para o tenant padrão (catálogo).
 */
export async function comContextoRls<T>(
  prisma: PrismaClient,
  ctx: RlsContexto,
  fn: (tx: TxRls) => Promise<T>,
): Promise<T> {
  // Fallback p/ mocks de teste sem $transaction: executa direto (sem RLS).
  if (typeof prisma.$transaction !== "function") {
    return fn(prisma as unknown as TxRls);
  }
  return prisma.$transaction(async (tx) => {
    // Só seta user_id quando presente — '' quebraria o cast ::uuid nas policies.
    if (ctx.usuarioId) {
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.current_user_id', $1, true)`,
        ctx.usuarioId,
      );
    }
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_tenant_id', $1, true)`,
      ctx.tenantId ?? DEFAULT_TENANT,
    );
    await tx.$executeRawUnsafe(`SELECT set_config('app.current_user_role', $1, true)`, ctx.role);
    return fn(tx);
  });
}

/** Contexto anônimo (catálogo público por tenant default). */
export function contextoAnonimo(): RlsContexto {
  return { tenantId: DEFAULT_TENANT, role: "USER" };
}

/** Bootstrap para seeds/jobs: tenant default + role ADMIN na conexão. */
export async function bootstrapRlsSeed(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(
    `SELECT set_config('app.current_tenant_id', '${DEFAULT_TENANT}', false)`,
  );
  await prisma.$executeRawUnsafe(`SELECT set_config('app.current_user_role', 'ADMIN', false)`);
  await prisma.$executeRawUnsafe(`SELECT set_config('app.current_user_id', '', false)`);
}
