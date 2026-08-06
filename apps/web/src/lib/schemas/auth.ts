import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Email obrigatório").email("Email inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
    email: z.string().min(1, "Email obrigatório").email("Email inválido"),
    password: z.string().min(6, "Mínimo 6 caracteres"),
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((v) => v === true, { message: "Você deve aceitar os termos" }),
    inviteCode: z.string().trim().max(64).optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Senhas não conferem",
    path: ["confirmPassword"],
  });

export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;

const STRENGTH_LEVELS = {
  weak: { segments: 1, color: "#EF4444" },
  medium: { segments: 2, color: "#EAB308" },
  strong: { segments: 3, color: "#22C55E" },
};

export function getPasswordStrength(
  pw: string,
): { level: keyof typeof STRENGTH_LEVELS; segments: number; color: string } | null {
  if (!pw) return null;
  if (pw.length < 6) return { level: "weak", ...STRENGTH_LEVELS.weak };
  if (pw.length < 8 || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw))
    return { level: "medium", ...STRENGTH_LEVELS.medium };
  return { level: "strong", ...STRENGTH_LEVELS.strong };
}
