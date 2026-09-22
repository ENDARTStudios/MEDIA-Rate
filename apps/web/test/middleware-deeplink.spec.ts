import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import middleware from "@/middleware";

/**
 * D-525 — deep link de rota protegida não pode perder a query no redirect
 * de login: /biblioteca?status=…&tipo=… volta exatamente igual após o login
 * (o AuthForm consome callbackUrl via getSafeCallbackUrl — só caminho interno).
 */

function req(url: string, comSessao = false) {
  const request = new NextRequest(new Request(url));
  if (comSessao) {
    request.cookies.set("sess", "token-falso");
  }
  return request;
}

describe("middleware — deep link preserva query (D-525)", () => {
  it("deslogado: redireciona para login com callbackUrl = path + query", async () => {
    const res = await middleware(
      req("http://localhost:3000/pt-BR/biblioteca?status=QUERO_CONSUMIR&tipo=LIVRO"),
    );
    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    const destino = new URL(location, "http://localhost:3000");
    expect(destino.pathname).toBe("/pt-BR/login");
    const callback = JSON.parse(`"${destino.searchParams.get("callbackUrl") ?? ""}"`);
    expect(callback).toBe("/pt-BR/biblioteca?status=QUERO_CONSUMIR&tipo=LIVRO");
  });

  it("deslogado sem query: callbackUrl é só o path", async () => {
    const res = await middleware(req("http://localhost:3000/pt-BR/dashboard"));
    expect(res.status).toBe(307);
    const destino = new URL(res.headers.get("location") ?? "", "http://localhost:3000");
    const callback = JSON.parse(`"${destino.searchParams.get("callbackUrl") ?? ""}"`);
    expect(callback).toBe("/pt-BR/dashboard");
  });

  it("logado (cookie sess): sem redirect de login", async () => {
    const res = await middleware(
      req("http://localhost:3000/pt-BR/biblioteca?status=QUERO_CONSUMIR", true),
    );
    // resposta normal do intl middleware (não é redirect 307 p/ login)
    const location = res.headers.get("location");
    expect(location === null || !location.includes("/login")).toBe(true);
  });

  it("callbackUrl é sanitizado pelo login (getSafeCallbackUrl só caminho interno)", async () => {
    // defesa em profundidade: valores como //evil.com nunca são aceitos como callback
    const { getSafeCallbackUrl } = await import("@/lib/utils");
    expect(getSafeCallbackUrl("//evil.com")).toBe("/dashboard");
    expect(getSafeCallbackUrl("/%5cbiblioteca")).toBe("/dashboard");
    expect(getSafeCallbackUrl("/biblioteca?status=QUERO_CONSUMIR")).toBe(
      "/biblioteca?status=QUERO_CONSUMIR",
    );
  });
});
