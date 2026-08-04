/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { MediaController } from "../src/modules/media/media.controller.js";
import { LgpdController } from "../src/modules/lgpd/lgpd.controller.js";
import { PaymentController } from "../src/modules/payment/payment.controller.js";
import { AdminController } from "../src/modules/admin/admin.controller.js";
import { PremiumController } from "../src/modules/premium/premium.controller.js";

function mockReq(user?: { id: string; email: string; nome: string | null; sessao_id: string }) {
  return {
    method: "GET",
    url: "/test",
    ip: "127.0.0.1",
    headers: {},
    user,
  } as any;
}

function mockRes() {
  const headers: Record<string, unknown> = {};
  return {
    setCookie: vi.fn(),
    clearCookie: vi.fn(),
    redirect: vi.fn(),
    header: vi.fn((k: string, v: unknown) => {
      headers[k] = v;
    }),
    status: vi.fn().mockReturnThis(),
    send: vi.fn(),
    headers,
  } as any;
}

function createMockPrisma() {
  return {
    midia: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn() },
    genero: { findMany: vi.fn().mockResolvedValue([]) },
    usuario: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    usuarioPapel: { findMany: vi.fn() },
    usuarioPlano: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
    consentimentoUsuario: { findMany: vi.fn() },
    watchlistEntry: { findMany: vi.fn() },
    usuarioMidiaInteracao: { findMany: vi.fn() },
    preferenciaUsuario: { findUnique: vi.fn() },
    sessao: { findMany: vi.fn(), updateMany: vi.fn() },
    eventoPagamento: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  };
}

const MOCK_USER = { id: "u1", email: "user@example.com", nome: "User", sessao_id: "s1" };

describe("MediaController (unit T8.1)", () => {
  let controller: MediaController;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockScoreService: {
    calcularScore: ReturnType<typeof vi.fn>;
    calcularScoreV2?: ReturnType<typeof vi.fn>;
    calcularScoreV3?: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    mockScoreService = {
      calcularScore: vi.fn().mockReturnValue({
        score: 75,
        num_fontes: 2,
        confianca: 0.6,
        pesos_usados: {},
        detalhes: [],
      }),
    };
    controller = new MediaController(mockPrisma as any, mockScoreService as any);
  });

  it("list() returns paginated results", async () => {
    mockPrisma.midia.findMany.mockResolvedValue([
      { id: "1", titulo: "A", tipo: "FILME", ano_lancamento: 2020 },
    ]);
    const result = await controller.list(undefined, "10", undefined, undefined);
    expect(result.data).toHaveLength(1);
    expect(result.has_more).toBe(false);
  });

  it("list() with tipo filter", async () => {
    mockPrisma.midia.findMany.mockResolvedValue([]);
    await controller.list(undefined, "20", "FILME", undefined);
    expect(mockPrisma.midia.findMany).toHaveBeenCalled();
  });

  it("list() with sort by titulo", async () => {
    mockPrisma.midia.findMany.mockResolvedValue([]);
    await controller.list(undefined, "20", undefined, "titulo:asc");
    expect(mockPrisma.midia.findMany).toHaveBeenCalled();
  });

  it("list() com filtros avançados (ano + faixa de score) monta o where", async () => {
    mockPrisma.midia.findMany.mockResolvedValue([]);
    mockPrisma.midia.count.mockResolvedValue(0);
    await controller.list(undefined, "20", "FILME", undefined, "2000", "2010", "60", "90");
    const call = mockPrisma.midia.findMany.mock.calls[0]![0] as {
      where: Record<string, unknown>;
    };
    expect(call.where.tipo).toBe("FILME");
    expect(call.where.ano_lancamento).toEqual({ gte: 2000, lte: 2010 });
    expect(call.where.scores).toEqual({ some: { score: { gte: 60, lte: 90 } } });
  });

  it("list() ignora filtros avançados não numéricos", async () => {
    mockPrisma.midia.findMany.mockResolvedValue([]);
    mockPrisma.midia.count.mockResolvedValue(0);
    await controller.list(undefined, "20", undefined, undefined, "abc", "xyz", "nope", "also");
    const call = mockPrisma.midia.findMany.mock.calls[0]![0] as {
      where: Record<string, unknown>;
    };
    expect(call.where.ano_lancamento).toBeUndefined();
    expect(call.where.scores).toBeUndefined();
  });

  it("list() com filtro de gênero por slug monta o where", async () => {
    mockPrisma.midia.findMany.mockResolvedValue([]);
    mockPrisma.midia.count.mockResolvedValue(0);
    await controller.list(undefined, "20", undefined, undefined, undefined, undefined, undefined, undefined, "ficcao-cientifica");
    const call = mockPrisma.midia.findMany.mock.calls[0]![0] as {
      where: Record<string, unknown>;
    };
    expect(call.where.generos).toEqual({ some: { genero: { slug: "ficcao-cientifica" } } });
  });

  it("listGeneros() retorna gêneros com contagem", async () => {
    mockPrisma.genero.findMany.mockResolvedValue([
      { id: 1, nome: "Drama", slug: "drama", _count: { midias: 12 } },
    ]);
    const result = await controller.listGeneros();
    expect(result).toEqual([{ id: 1, nome: "Drama", slug: "drama", total_midias: 12 }]);
  });

  it("getOne() returns midia", async () => {
    mockPrisma.midia.findUnique.mockResolvedValue({ id: "1", titulo: "A", tipo: "FILME" });
    const result = await controller.getOne("1");
    expect(result.titulo).toBe("A");
  });

  it("getOne() throws 404 if not found", async () => {
    mockPrisma.midia.findUnique.mockResolvedValue(null);
    await expect(controller.getOne("999")).rejects.toThrow();
  });

  it("getMediaScore() returns score from persisted", async () => {
    mockPrisma.midia.findUnique.mockResolvedValue({
      id: "1",
      tipo: "FILME",
      scores: [
        {
          score: 85,
          num_fontes: 3,
          pesos_usados: {},
          calculado_em: new Date(),
          score_critica: 88,
          score_publico: 82,
          consenso: 6,
          confianca: 0.9,
        },
      ],
    });
    const result = await controller.getMediaScore("1");
    expect(result.score).toBe(85);
    expect(result.criticosScore).toBe(88);
    expect(result.publicoScore).toBe(82);
    expect(result.consenso).toBe(6);
    expect(result.confianca).toBe(90); // legada 0–1 normalizada para CS 0–100
  });

  it("getMediaScore() persisted sem buckets v2 — fallback null e confiança 0", async () => {
    mockPrisma.midia.findUnique.mockResolvedValue({
      id: "1",
      tipo: "FILME",
      scores: [{ score: 70, num_fontes: 2, pesos_usados: {}, calculado_em: new Date() }],
    });
    const result = await controller.getMediaScore("1");
    expect(result.score).toBe(70);
    expect(result.criticosScore).toBeNull();
    expect(result.publicoScore).toBeNull();
    expect(result.confianca).toBe(0);
  });

  it("getMediaScore() throws 404 if not found", async () => {
    mockPrisma.midia.findUnique.mockResolvedValue(null);
    await expect(controller.getMediaScore("999")).rejects.toThrow();
  });

  it("getMediaScore() returns calculated score when no persisted", async () => {
    mockScoreService.calcularScoreV3 = vi.fn().mockReturnValue({
      score: 70,
      criticosScore: null,
      publicoScore: null,
      consenso: null,
      indiceConsenso: null,
      votosTotal: 0,
      num_fontes: 0,
      confianca: 0,
      pesos_usados: {},
      detalhes: [],
    });
    mockPrisma.midia.findUnique.mockResolvedValue({ id: "1", tipo: "FILME", scores: [] });
    const result = await controller.getMediaScore("1");
    expect(result.score).toBe(70);
    expect(result.criticosScore).toBeNull();
  });

  it("getBySlug() resolve por id UUID direto", async () => {
    mockPrisma.midia.findUnique.mockResolvedValue({
      id: "792422c1-f982-4380-9d26-a6925120d0ad",
      titulo: "Lucifer",
      titulo_original: null,
      tipo: "SERIE",
      sinopse: "Sinopse",
      ano_lancamento: 2016,
      imagem_url: "https://x/poster.jpg",
      classificacao_indicativa: "LIVRE",
      duracao_minutos: 42,
      generos: [{ genero: { nome: "Drama" } }],
      streamings: [{ service: { nome: "Netflix" } }],
      scores: [
        {
          score: 70.5,
          score_critica: null,
          score_publico: 70.5,
          consenso: null,
          num_fontes: 4,
          confianca: 0.9,
          calculado_em: new Date(),
          detalhes: [{ fonte: "tmdb" }],
        },
      ],
      avaliacoes: [{ fonte: "tmdb", url: "https://tmdb/x" }],
    });
    const result = await controller.getBySlug("792422c1-f982-4380-9d26-a6925120d0ad");
    expect(result.id).toBe("792422c1-f982-4380-9d26-a6925120d0ad");
    expect(result.slug).toBe("lucifer");
    expect(result.generos).toEqual(["Drama"]);
    expect(result.streamings).toEqual(["Netflix"]);
    expect(result.score?.score).toBe(70.5);
    expect(result.score?.confianca).toBe(90); // legada 0–1 normalizada
    expect(result.score?.detalhes).toEqual([{ fonte: "tmdb" }]);
    expect(result.fontes).toEqual([{ fonte: "tmdb", url: "https://tmdb/x" }]);
  });

  it("getBySlug() nao tenta findUnique para slug nao-UUID (fallback direto)", async () => {
    mockPrisma.midia.findMany.mockResolvedValue([
      { id: "m1", titulo: "Lucifer", titulo_original: null },
    ]);
    mockPrisma.midia.findUnique.mockResolvedValue({
      id: "m1",
      titulo: "Lucifer",
      titulo_original: null,
      tipo: "SERIE",
      sinopse: null,
      ano_lancamento: 2016,
      imagem_url: null,
      classificacao_indicativa: null,
      duracao_minutos: null,
      generos: [],
      streamings: [],
      scores: [],
      avaliacoes: [],
    });
    const result = await controller.getBySlug("lucifer");
    expect(result.id).toBe("m1");
    expect(result.slug).toBe("lucifer");
    // O primeiro findUnique (por UUID) nunca é chamado com o slug textual.
    expect(mockPrisma.midia.findUnique).toHaveBeenCalledWith({
      where: { id: "m1" },
      include: expect.any(Object),
    });
  });

  it("getBySlug() resolve por slugify do titulo (sem acento)", async () => {
    mockPrisma.midia.findUnique.mockResolvedValue({
      id: "m1",
      titulo: "O Poderoso Chefão",
      titulo_original: null,
      tipo: "FILME",
      sinopse: null,
      ano_lancamento: 1972,
      imagem_url: null,
      classificacao_indicativa: null,
      duracao_minutos: null,
      generos: [],
      streamings: [],
      scores: [],
      avaliacoes: [],
    });
    mockPrisma.midia.findMany.mockResolvedValue([
      { id: "m1", titulo: "O Poderoso Chefão", titulo_original: null },
      { id: "m2", titulo: "Outro Filme", titulo_original: null },
    ]);
    const result = await controller.getBySlug("o-poderoso-chefao");
    expect(result.id).toBe("m1");
    expect(result.slug).toBe("o-poderoso-chefao");
    expect(result.score).toBeNull();
  });

  it("getBySlug() resolve por slugify do titulo_original", async () => {
    mockPrisma.midia.findUnique.mockResolvedValue({
      id: "m1",
      titulo: "Frieren e a Jornada para o Além",
      titulo_original: "Sousou no Frieren",
      tipo: "SERIE",
      sinopse: null,
      ano_lancamento: 2023,
      imagem_url: null,
      classificacao_indicativa: null,
      duracao_minutos: null,
      generos: [],
      streamings: [],
      scores: [],
      avaliacoes: [],
    });
    mockPrisma.midia.findMany.mockResolvedValue([
      { id: "m1", titulo: "Frieren e a Jornada para o Além", titulo_original: "Sousou no Frieren" },
    ]);
    const result = await controller.getBySlug("sousou-no-frieren");
    expect(result.id).toBe("m1");
  });

  it("getBySlug() throws 404 quando nada corresponde", async () => {
    mockPrisma.midia.findUnique.mockResolvedValueOnce(null);
    mockPrisma.midia.findMany.mockResolvedValue([
      { id: "m1", titulo: "Outro Filme", titulo_original: null },
    ]);
    await expect(controller.getBySlug("nao-existe")).rejects.toThrow();
  });

  it("list() com sort=score usa orderBy da relacao scores", async () => {
    mockPrisma.midia.findMany.mockResolvedValue([]);
    await controller.list(undefined, "10", undefined, "score:desc");
    const call = mockPrisma.midia.findMany.mock.calls[0]?.[0];
    expect(call?.orderBy).toEqual({ scores: { score: "desc" } });
  });

  it("list() com sort inválido cai no default created_at desc", async () => {
    mockPrisma.midia.findMany.mockResolvedValue([]);
    await controller.list(undefined, "10", undefined, "hack:desc");
    const call = mockPrisma.midia.findMany.mock.calls[0]?.[0];
    expect(call?.orderBy).toEqual({ created_at: "desc" });
  });
});

describe("LgpdController (unit T8.1)", () => {
  let controller: LgpdController;
  let mockService: {
    exportarDados: ReturnType<typeof vi.fn>;
    solicitarExclusao: ReturnType<typeof vi.fn>;
    cancelarExclusao: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockService = {
      exportarDados: vi
        .fn()
        .mockResolvedValue({ usuario_id: "u1", gerado_em: "2026-01-01T00:00:00Z", dados: {} }),
      solicitarExclusao: vi.fn().mockResolvedValue({
        agendado_para: "2026-08-01T00:00:00Z",
        dias_para_cancelar: 30,
        mensagem: "OK",
      }),
      cancelarExclusao: vi.fn().mockResolvedValue({ cancelado: true }),
    };
    controller = new LgpdController(mockService as any);
  });

  it("exportarDados() calls service with user id", async () => {
    const result = await controller.exportarDados(mockReq(MOCK_USER) as any);
    expect(mockService.exportarDados).toHaveBeenCalledWith("u1");
    expect(result.usuario_id).toBe("u1");
  });

  it("exportarDados() throws if no user", async () => {
    await expect(controller.exportarDados(mockReq() as any)).rejects.toThrow();
  });

  it("solicitarExclusao() calls service with user id and motivo", async () => {
    const result = await controller.solicitarExclusao(mockReq(MOCK_USER) as any, {
      motivo: "test",
    });
    expect(mockService.solicitarExclusao).toHaveBeenCalledWith("u1", "test");
    expect(result.dias_para_cancelar).toBe(30);
  });

  it("cancelarExclusao() calls service with user id", async () => {
    const result = await controller.cancelarExclusao(mockReq(MOCK_USER) as any);
    expect(mockService.cancelarExclusao).toHaveBeenCalledWith("u1");
    expect(result.cancelado).toBe(true);
  });
});

describe("PaymentController (unit T8.1)", () => {
  let controller: PaymentController;
  let mockService: {
    createCheckout: ReturnType<typeof vi.fn>;
    processWebhook: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockService = {
      createCheckout: vi.fn().mockResolvedValue({
        id: "cs_1",
        url: "https://stripe.com/cs_1",
        subscription_id: "sub_1",
        customer_id: "cus_1",
      }),
      processWebhook: vi.fn().mockResolvedValue({
        processed: true,
        event_id: "evt_1",
        type: "checkout.session.completed",
      }),
    };
    controller = new PaymentController(mockService as any);
  });

  it("createCheckout() calls service with dto and user", async () => {
    const dto = {
      plano: "PLUS" as const,
      success_url: "https://app.example.com/success",
      cancel_url: "https://app.example.com/cancel",
    };
    const result = await controller.createCheckout(dto, mockReq(MOCK_USER) as any);
    expect(mockService.createCheckout).toHaveBeenCalledWith(dto, {
      id: "u1",
      email: "user@example.com",
    });
    expect(result.url).toContain("stripe.com");
  });

  it("createCheckout() throws if no user", async () => {
    const dto = {
      plano: "PLUS" as const,
      success_url: "https://a.com",
      cancel_url: "https://b.com",
    };
    await expect(controller.createCheckout(dto, mockReq() as any)).rejects.toThrow();
  });

  it("webhook() calls processWebhook with raw body and signature", async () => {
    // O controller lê req.rawBody (bytes preservados pelo parser JSON em main.ts).
    const req = { body: { type: "test" }, rawBody: Buffer.from('{"type":"test"}') } as any;
    const result = await controller.webhook(req, "sig_test");
    expect(mockService.processWebhook).toHaveBeenCalledWith(
      Buffer.from('{"type":"test"}'),
      "sig_test",
    );
    expect(result.processed).toBe(true);
  });

  it("webhook() repassa empty string quando rawBody ausente", async () => {
    const req = { body: {} } as any;
    await controller.webhook(req, "sig_test");
    expect(mockService.processWebhook).toHaveBeenCalledWith("", "sig_test");
  });
});

describe("AdminController (unit T8.1)", () => {
  let controller: AdminController;

  beforeEach(() => {
    controller = new AdminController();
  });

  it("getStats() returns message with timestamp", () => {
    const result = controller.getStats();
    expect(result.message).toContain("admin");
    expect(result.timestamp).toBeDefined();
  });
});

describe("PremiumController (unit T8.1)", () => {
  let controller: PremiumController;

  beforeEach(() => {
    controller = new PremiumController();
  });

  it("getAdvancedRecommendations() returns tier advanced", () => {
    const result = controller.getAdvancedRecommendations();
    expect(result.tier).toBe("advanced");
  });

  it("getMlRecommendations() returns tier ml_personalized", () => {
    const result = controller.getMlRecommendations();
    expect(result.tier).toBe("ml_personalized");
  });
});
