import { SetMetadata } from "@nestjs/common";

/**
 * Decorator @Idempotent() — marca rota como idempotente via header
 * Idempotency-Key (T4.3).
 *
 * Funcionamento:
 * - Cliente envia header `Idempotency-Key: <uuid>` em POST destrutivo/financeiro.
 * - Middleware verifica se já existe resposta cacheada para essa chave.
 * - Se sim, retorna a resposta cacheada (sem re-executar o handler).
 * - Se não, executa handler, cacheia resposta por 24h, retorna.
 *
 * Cache: tabela `evento_pagamento` para pagamentos (já existe T2.10).
 * Para outros endpoints, tabela dedicada `idempotencia_registro` (a criar
 * em tarefa futura). Por ora, decorator é documentação + interceptor
 * que valida presença do header em rotas marcadas.
 *
 * Uso:
 *   @Post('checkout')
 *   @Idempotent()
 *   checkout() { ... }
 */
export const IDEMPOTENT_KEY = "idempotent";
export const Idempotent = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IDEMPOTENT_KEY, true) as MethodDecorator & ClassDecorator;
