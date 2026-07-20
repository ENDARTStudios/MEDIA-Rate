import { Injectable } from "@nestjs/common";
import argon2 from "argon2";

/**
 * Opções do argon2id (RFC 9106). Parâmetros conservadores para servidor
 * moderno (2026). Custo computacional ≈ 100ms por hash em CPU típico.
 *
 * Prompts/Doer Secao 4: "Senha/token sempre hash (argon2/bcrypt custo >=12)".
 * argon2id e o modo recomendado (resistente a GPU e side-channel).
 */
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  // 19 MiB de memória por hash (RFC 9106 recomenda 64MiB para servidores;
  // usamos 19 para equilibrar com concorrência — ajustavel por env).
  memoryCost: Number.parseInt(process.env.ARGON2_MEMORY_KIB ?? "19456", 10),
  // 2 iteracoes (paralelismo implicito).
  timeCost: Number.parseInt(process.env.ARGON2_TIME_COST ?? "2", 10),
  // 1 thread (suficiente para custo de memoria alto).
  parallelism: Number.parseInt(process.env.ARGON2_PARALLELISM ?? "1", 10),
};

/**
 * Servico de hash de senha (T2.5).
 *
 * - Hash com argon2id (memoryCost + timeCost + parallelism configuraveis).
 * - Verificacao em tempo constante (argon2.verify usa comparacao constante-time
 *   internamente para evitar timing attacks).
 * - Pepper opcional via ARGON2_SECRET_PEPPER env (definido em .env.example).
 *   Quando definido, e misturado ao password antes do hash. Permite
 *   invalidar todas as senhas em caso de vazamento do banco.
 */
@Injectable()
export class PasswordService {
  private readonly pepper: Buffer | undefined;

  constructor() {
    const pepperEnv = process.env.ARGON2_SECRET_PEPPER;
    this.pepper = pepperEnv && pepperEnv.length > 0 ? Buffer.from(pepperEnv) : undefined;
  }

  /**
   * Gera hash argon2id da senha.
   * @returns string no formato $argon2id$v=19$m=...$salt$hash
   */
  async hash(password: string): Promise<string> {
    if (typeof password !== "string" || password.length === 0) {
      throw new Error("Password deve ser string nao-vazia.");
    }
    const input = this.pepper ? Buffer.concat([Buffer.from(password), this.pepper]) : password;
    return argon2.hash(input, ARGON2_OPTIONS);
  }

  /**
   * Verifica senha contra hash em tempo constante.
   * @returns true se senha confere, false caso contrario (ou se hash invalido).
   */
  async verify(password: string, hash: string): Promise<boolean> {
    if (typeof password !== "string" || typeof hash !== "string") {
      return false;
    }
    if (hash.length === 0) {
      return false;
    }
    try {
      const input = this.pepper ? Buffer.concat([Buffer.from(password), this.pepper]) : password;
      return await argon2.verify(hash, input);
    } catch {
      // Hash malformado ou algoritmo incompativel: retorna false (nao vaza info).
      return false;
    }
  }

  /**
   * Verifica se um hash precisa ser re-hash ( parametros abaixo do atual).
   * Usar para upgrade gradual de parametros quando ARGON2_MEMORY/TIME mudam.
   */
  needsRehash(hash: string): boolean {
    try {
      return argon2.needsRehash(hash, ARGON2_OPTIONS);
    } catch {
      return true;
    }
  }
}
