import { Injectable, Logger } from "@nestjs/common";

/**
 * Lockout progressivo (T3.3).
 *
 * Estratégia: contador de tentativas falhas por chave (IP + email normalizado).
 * Após 5 tentativas falhas consecutivas, aplica bloqueio exponencial:
 *   1º bloqueio: 30s
 *   2º bloqueio: 2min
 *   3º bloqueio: 10min
 *   4º bloqueio (e subsequentes): 30min
 *
 * Implementação: Map em memória do processo. Para Beta com instância única
 * é suficiente. Para multi-instância, migrar para Redis (FORA do escopo —
 * Restrição #1 + DECIDE-01 excluem Redis). Em Fase 7 (Hardening), se
 * necessário, adicionar tabela `tentativa_login_falha` no PostgreSQL.
 *
 * Reset: contador zera após login bem-sucedido OU após janela de observação
 * de 15min sem novas tentativas (sliding window).
 */

interface LockoutEntry {
  failedCount: number;
  blockedUntil: number; // epoch ms
  lastAttempt: number; // epoch ms
}

const WINDOW_MS = 15 * 60 * 1000; // 15 min
const MAX_FAILURES_BEFORE_LOCK = 5;
const LOCK_DURATIONS_MS = [
  30 * 1000, // 30s — 1º bloqueio
  2 * 60 * 1000, // 2min — 2º
  10 * 60 * 1000, // 10min — 3º
  30 * 60 * 1000, // 30min — 4º e subsequentes
];

@Injectable()
export class LockoutService {
  private readonly logger = new Logger(LockoutService.name);
  private readonly entries = new Map<string, LockoutEntry>();

  /**
   * Chave normalizada: IP + email lowercase. Permite detectar brute force
   * por IP mesmo com emails diferentes, e por email mesmo com IPs diferentes.
   */
  private key(ip: string, email: string): string {
    return `${ip}:${email.toLowerCase().trim()}`;
  }

  /**
   * Verifica se a chave está bloqueada no momento.
   * @returns tempo restante em ms se bloqueada, 0 caso contrário.
   */
  isLocked(ip: string, email: string): { locked: boolean; remainingMs: number } {
    const k = this.key(ip, email);
    const entry = this.entries.get(k);
    if (!entry) return { locked: false, remainingMs: 0 };
    const now = Date.now();
    if (entry.blockedUntil > now) {
      return { locked: true, remainingMs: entry.blockedUntil - now };
    }
    return { locked: false, remainingMs: 0 };
  }

  /**
   * Registra tentativa falha. Se atingir threshold, aplica bloqueio.
   *
   * Lógica de escalonamento:
   * - A cada MAX_FAILURES_BEFORE_LOCK (5) falhas, aplica um novo nível de bloqueio.
   * - Se já está bloqueado, incrementa contador mas não re-aplica bloqueio
   *   (o bloqueio atual precisa expirar antes de novo nível).
   * - Quando o bloqueio expira e o usuário falha de novo, se o contador
   *   acumulado atingir próximo múltiplo de 5, aplica próximo nível.
   *
   * @returns info sobre bloqueio aplicado (se houve novo bloqueio nesta chamada).
   */
  registerFailure(
    ip: string,
    email: string,
  ): {
    failedCount: number;
    locked: boolean;
    lockedForMs: number;
  } {
    const k = this.key(ip, email);
    const now = Date.now();
    const existing = this.entries.get(k);

    // Reset se última tentativa foi fora da janela (15min sem atividade).
    let entry: LockoutEntry;
    if (!existing || now - existing.lastAttempt > WINDOW_MS) {
      entry = { failedCount: 1, blockedUntil: 0, lastAttempt: now };
    } else {
      entry = {
        failedCount: existing.failedCount + 1,
        blockedUntil: existing.blockedUntil,
        lastAttempt: now,
      };
    }

    // Aplica bloqueio se atingir múltiplo de MAX_FAILURES_BEFORE_LOCK
    // E o bloqueio anterior já expirou (ou nunca houve).
    let locked = false;
    let lockedForMs = 0;
    const isMultipleOfThreshold = entry.failedCount % MAX_FAILURES_BEFORE_LOCK === 0;
    const blockExpired = entry.blockedUntil <= now;
    if (isMultipleOfThreshold && blockExpired) {
      // lockLevel = quantos bloqueios já aplicamos (0-indexed).
      // 5 falhas → level 0 (30s), 10 falhas → level 1 (2min), etc.
      const lockLevel = Math.min(
        Math.floor(entry.failedCount / MAX_FAILURES_BEFORE_LOCK) - 1,
        LOCK_DURATIONS_MS.length - 1,
      );
      const duration = LOCK_DURATIONS_MS[lockLevel];
      if (duration !== undefined) {
        lockedForMs = duration;
        entry.blockedUntil = now + lockedForMs;
      }
      locked = true;
      this.logger.warn(
        `Lockout aplicado para ${k}: nível ${lockLevel + 1}, ${lockedForMs / 1000}s`,
      );
    }

    this.entries.set(k, entry);
    return { failedCount: entry.failedCount, locked, lockedForMs };
  }

  /**
   * Reseta contador após login bem-sucedido.
   */
  resetOnSuccess(ip: string, email: string): void {
    const k = this.key(ip, email);
    this.entries.delete(k);
  }

  /**
   * Limpa entradas expiradas (chamar periodicamente).
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;
    for (const [k, entry] of this.entries) {
      if (entry.blockedUntil < now && now - entry.lastAttempt > WINDOW_MS) {
        this.entries.delete(k);
        removed++;
      }
    }
    return removed;
  }
}
