import { Injectable, Logger } from "@nestjs/common";
import { createHash } from "node:crypto";
import { appendFileSync } from "node:fs";
import * as path from "node:path";

/**
 * T206 — MockMailService (entrega de email em DEV).
 *
 * Em produção o serviço real de email enviaria o link de reset com o token.
 * Fora de produção, "entrega" o email num arquivo dev (dev-mailbox.log,
 * gitignored) para o fluxo de verificação local.
 *
 * SEGURANÇA: o TOKEN nunca vai para os logs do app — apenas o hash truncado
 * (12 hex) para debug. O arquivo dev-mailbox.log é o artefato do "email
 * mockado" (equivalente à caixa de entrada), não um log do servidor.
 */
@Injectable()
export class MockMailService {
  private readonly logger = new Logger(MockMailService.name);

  async enviarResetSenha(email: string, token: string): Promise<void> {
    const hashTruncado = createHash("sha256").update(token).digest("hex").slice(0, 12);
    if (process.env.NODE_ENV !== "production") {
      try {
        const arquivo = path.join(process.cwd(), "dev-mailbox.log");
        appendFileSync(
          arquivo,
          `[${new Date().toISOString()}] reset-para=${email} token=${token}\n`,
          "utf8",
        );
      } catch {
        this.logger.warn("Nao foi possivel gravar dev-mailbox.log (mock email).");
      }
      this.logger.debug(`Reset de senha (mock): email=${email} hash_truncado=${hashTruncado}`);
      return;
    }
    // Produção: integração com provedor de email real (pendência de operador).
    this.logger.debug(`Reset de senha: email=${email} hash_truncado=${hashTruncado}`);
  }
}
