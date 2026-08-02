import { z } from "zod";

/**
 * DTO para registro de usuário (T3.1).
 * Senha mínima 8 chars, 1 letra + 1 número (NIST SP 800-63B recomenda
 * não forçar complexidade excessiva, mas mínimo de 8 é padrão).
 */
export const RegisterDto = z.object({
  email: z.string().email("Email inválido.").max(255),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres.").max(128),
  nome: z.string().min(2).max(255).optional(),
  inviteCode: z.string().uuid().optional(),
});

export type RegisterDtoType = z.infer<typeof RegisterDto>;

/**
 * DTO para login (T3.2).
 */
export const LoginDto = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});

export type LoginDtoType = z.infer<typeof LoginDto>;

/**
 * DTO para solicitação de reset de senha (T3.8).
 */
export const ForgotPasswordDto = z.object({
  email: z.string().email("Email inválido.").max(255),
});

export type ForgotPasswordDtoType = z.infer<typeof ForgotPasswordDto>;

/**
 * DTO para execução do reset de senha (T3.8).
 * Senha com mesma política do registro (min 8 chars).
 */
export const ResetPasswordDto = z.object({
  token: z.string().min(16, "Token inválido.").max(256),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres.").max(128),
});

export type ResetPasswordDtoType = z.infer<typeof ResetPasswordDto>;
