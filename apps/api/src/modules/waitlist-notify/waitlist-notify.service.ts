import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";

/** Janela deslizante em memória por IP (10 solicitações/hora por IP). */
const JANELA_MS = 60 * 60 * 1000;
const MAX_POR_IP = 10;

@Injectable()
export class WaitlistNotifyService {
  private readonly hitsPorIp = new Map<string, number[]>();

  constructor(private readonly prisma: PrismaService) {}

  /** Sliding window por IP → true se dentro do limite. */
  permitirPorIp(ip: string): boolean {
    const agora = Date.now();
    const hits = (this.hitsPorIp.get(ip) ?? []).filter((t) => agora - t < JANELA_MS);
    if (hits.length >= MAX_POR_IP) {
      this.hitsPorIp.set(ip, hits);
      return false;
    }
    hits.push(agora);
    this.hitsPorIp.set(ip, hits);
    return true;
  }

  async registrar(email: string, category: string): Promise<void> {
    try {
      await this.prisma.waitlistNotify.create({ data: { email, category } });
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "P2002") {
        // Unique (email+category) — resposta genérica, sem expor dados.
        throw new HttpException("Solicitação já registrada.", HttpStatus.CONFLICT);
      }
      throw err;
    }
  }
}
