import { z } from "zod";

export const addToWatchlistSchema = z.object({
  midia_id: z.string().uuid(),
  coluna: z.enum(["WANT", "WATCHING", "COMPLETED", "DROPPED"]).default("WANT"),
});

export const moveWatchlistSchema = z.object({
  coluna: z.enum(["WANT", "WATCHING", "COMPLETED", "DROPPED"]),
});

export type AddToWatchlistDto = z.infer<typeof addToWatchlistSchema>;
export type MoveWatchlistDto = z.infer<typeof moveWatchlistSchema>;
