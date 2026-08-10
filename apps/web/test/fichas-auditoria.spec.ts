import { describe, it, expect } from "vitest";
import { generoTraduzido, genreSlug } from "@/lib/i18n-content";
import ptBR from "@/messages/pt-BR.json";
import enUS from "@/messages/en-US.json";
import esES from "@/messages/es-ES.json";

function tg(g: Record<string, string>) {
  const call = (k: string) => g[k] ?? `MISSING:${k}`;
  call.has = (k: string) => k in g;
  return call as ((k: string) => string) & { has: (k: string) => boolean };
}
const G = (f: string) => (JSON.parse(f) as { genres: Record<string, string> }).genres;

describe("Auditoria fichas — mangá e gêneros compostos", () => {
  it("namespace catalog tem manga (breadcrumb) nos 3 locales", () => {
    const cat = (f: string) => (JSON.parse(f) as { catalog: Record<string, string> }).catalog;
    expect(cat(JSON.stringify(ptBR)).manga).toBe("Mangás");
    expect(cat(JSON.stringify(enUS)).manga).toBe("Manga");
    expect(cat(JSON.stringify(esES)).manga).toBe("Manga");
  });

  it("gênero 'Ação e Aventura' traduzido nos 3 locales", () => {
    expect(generoTraduzido(tg(G(JSON.stringify(ptBR))), "Ação e Aventura")).toBe("Ação e Aventura");
    expect(generoTraduzido(tg(G(JSON.stringify(enUS))), "Ação e Aventura")).toBe(
      "Action and Adventure",
    );
    expect(generoTraduzido(tg(G(JSON.stringify(esES))), "Ação e Aventura")).toBe(
      "Acción y Aventura",
    );
  });

  it("gênero 'Animação' traduzido nos 3 locales", () => {
    expect(generoTraduzido(tg(G(JSON.stringify(enUS))), "Animação")).toBe("Animation");
    expect(generoTraduzido(tg(G(JSON.stringify(esES))), "Animação")).toBe("Animación");
  });

  it("slug de gêneros compostos achatado corretamente", () => {
    expect(genreSlug("Ação e Aventura")).toBe("acaoeaventura");
    expect(genreSlug("Animação e Aventura")).toBe("animacaoeaventura");
  });
});
