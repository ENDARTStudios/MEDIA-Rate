import { Injectable, UnauthorizedException } from "@nestjs/common";
import { createRemoteJWKSet, jwtVerify } from "jose";

export interface GoogleProfile {
  email: string;
  nome: string | null;
}

/**
 * T361 (D-335) — validação server-side do ID token do Google (OpenID Connect).
 *
 * - Busca as chaves públicas do Google (JWKS) e valida assinatura RS256 +
 *   `iss` (accounts.google.com) + `aud` (GOOGLE_CLIENT_ID) + `exp`.
 * - NUNCA confia no cliente: o email só é aceito depois da verificação do JWT.
 * - Apple foi adiada (custo do Developer Program) — D-335/T361b futuro.
 */
@Injectable()
export class GoogleAuthService {
  private readonly issuer = "https://accounts.google.com";
  private readonly jwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

  async verify(credential: string): Promise<GoogleProfile> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: "Unauthorized",
        message: "Login Google não configurado.",
      });
    }

    try {
      const { payload } = await jwtVerify(credential, this.jwks, {
        issuer: this.issuer,
        audience: clientId,
      });
      const email = payload.email;
      if (typeof email !== "string" || email.length === 0) {
        throw new Error("email ausente no token");
      }
      return {
        email,
        nome: typeof payload.name === "string" ? payload.name : null,
      };
    } catch {
      throw new UnauthorizedException({
        statusCode: 401,
        error: "Unauthorized",
        message: "Credencial Google inválida.",
      });
    }
  }
}
