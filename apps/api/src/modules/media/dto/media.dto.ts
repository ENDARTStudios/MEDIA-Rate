import { z } from "zod";

export const createMediaSchema = z.object({
  titulo: z.string().min(1).max(300),
  titulo_original: z.string().max(300).optional(),
  tipo: z.enum(["FILME", "SERIE", "GAME", "LIVRO", "ANIME", "COMIC"]),
  sinopse: z.string().min(1).max(5000),
  ano_lancamento: z.number().int().min(1800).max(2100),
  classificacao_indicativa: z.number().int().min(0).max(18).optional(),
  duracao: z.string().max(32).optional(),
  imagem_url: z.string().url().max(2048).nullable().optional(),
  fonte: z.string().max(64).optional(),
  fonte_id: z.string().max(255).optional(),
});

export const updateMediaSchema = createMediaSchema.partial();

export type CreateMediaDto = z.infer<typeof createMediaSchema>;
export type UpdateMediaDto = z.infer<typeof updateMediaSchema>;
