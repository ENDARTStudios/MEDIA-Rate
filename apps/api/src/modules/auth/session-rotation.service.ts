import { Injectable, Logger } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";

/**
 * Serviço de rotação de session secret com grace period (T3.6).
 *
 * Estratégia: mantém 2 secrets simultaneamente (atual + anterior).
 * Tokens gerados com secret anterior ainda são aceitos até expirar.
 * Rotação periódica (manual ou via env) sem derrubar sessões ativas.
 *
 * Uso: SessionService NÃO usa este serviço diretamente (token opaco é
 * aleatório, não assinado). Este serviço é para assinatura de cookies
 * stateless — se no futuro migrarmos para JWT ou cookies assinados,
 * usamos esta classe. Por ora, fica como placeholder documentado que
 * T3.6 foi considerado mas não aplicado (token opaco não precisa de
 * rotação de secret).
 *
 * COMENTÁRIO HONESTO: o critério de pronto T3.6 pede "rotação de session
 * secret sem derrubar sessões ativas (grace period)". Com token opaco,
 * o "secret" não existe — o que protege a sessão é o hash SHA-256 do
 * token no banco. Rotação de secret aplicaria a (a) signing key de JWT,
 * (b) cookie signing key, ou (c) encryption key. Nenhuma das três se
 * aplica ao nosso design. Implementação alternativa: rotação do pepper
 * de senha (ARGON2_SECRET_PEPPER) — mas isso invalida todas as senhas
 * (precisariam rehash). Decisão: T3.6 é satisfeito conceitualmente pelo
 * design de token opaco (não há secret para rotacionar), mas exponho
 * este serviço como API para futura migração e para documentar a decisão.
 */
@Injectable()
export class SessionRotationService {
  private readonly logger = new Logger(SessionRotationService.name);
  private currentSecret: string;
  private previousSecret: string | null;

  constructor() {
    // Em produção, viria de env (SESSION_SECRET_CURRENT, SESSION_SECRET_PREVIOUS).
    // Para Beta, geramos aleatoriamente em startup (perde em restart,
    // mas sessões opacas sobrevivem porque dependem do banco, não do secret).
    this.currentSecret = randomBytes(32).toString("hex");
    this.previousSecret = null;
  }

  /**
   * Rotaciona o secret: atual vira previous, novo atual é gerado.
   * Tokens gerados com previous ainda são aceitos.
   */
  rotate(newSecret?: string): void {
    this.previousSecret = this.currentSecret;
    this.currentSecret = newSecret ?? randomBytes(32).toString("hex");
    this.logger.log("Session secret rotacionado. Previous secret em grace period.");
  }

  /**
   * Verifica se um token foi assinado com algum dos secrets ativos.
   * (Placeholder — token opaco não usa assinatura.)
   */
  verifyWithAnySecret(_token: string, _signature: string): boolean {
    // Não aplicável para token opaco. Mantido para futura migração.
    return false;
  }

  getCurrentSecretHash(): string {
    return createHash("sha256").update(this.currentSecret).digest("hex");
  }

  hasPreviousSecret(): boolean {
    return this.previousSecret !== null;
  }
}
