// Seed script para desenvolvimento (T2.x).
// Roda com: npx prisma db seed
// Cria: 1 admin, 3 usuarios (um por plano), 5 midias, 5 entitlements,
// 15 plano_entitlements (5 por plano), 1 sessao para cada usuario.
/* eslint-disable no-console */
import {
  PrismaClient,
  type Plano,
  type ClassificacaoIndicativa,
  type TipoMidia,
} from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log("[seed] Iniciando seed...");

  // --- Limpeza (ordem reversa para respeitar FKs) ---
  await prisma.mediaScoreView.deleteMany();
  await prisma.preferenciaUsuario.deleteMany();
  await prisma.watchlistEntry.deleteMany();
  await prisma.usuarioMidiaInteracao.deleteMany();
  await prisma.mediaScore.deleteMany();
  await prisma.midia.deleteMany();
  await prisma.consentimentoUsuario.deleteMany();
  await prisma.eventoPagamento.deleteMany();
  await prisma.usuarioPlano.deleteMany();
  await prisma.planoEntitlement.deleteMany();
  await prisma.entitlement.deleteMany();
  await prisma.usuarioPapel.deleteMany();
  await prisma.sessao.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.papel.deleteMany();
  console.log("[seed] Tabelas limpas.");

  // --- Papel (T2.4) ---
  const papelUser = await prisma.papel.create({ data: { nome: "USER" } });
  const papelAdmin = await prisma.papel.create({ data: { nome: "ADMIN" } });
  // MODERADOR e criado mas nao atribuido a nenhum usuario no seed.

  const _papelMod = await prisma.papel.create({ data: { nome: "MODERADOR" } });
  console.warn(`[seed] 3 papeis criados (USER, ADMIN, MODERADOR).`);

  // --- Entitlements (T2.9) ---
  const entitlements = [
    {
      chave: "max_watchlist_items",
      descricao: "Limite maximo de itens na watchlist",
      tipo: "number",
      valor_padrao: "10",
    },
    {
      chave: "recommendation_tier",
      descricao: "Nivel do algoritmo de recomendacao",
      tipo: "string",
      valor_padrao: "basic",
    },
    {
      chave: "media_score_history",
      descricao: "Acesso ao historico de MEDIA Score",
      tipo: "boolean",
      valor_padrao: "false",
    },
    {
      chave: "advanced_filters",
      descricao: "Filtros avancados de busca",
      tipo: "boolean",
      valor_padrao: "false",
    },
    { chave: "ad_free", descricao: "Sem anuncios", tipo: "boolean", valor_padrao: "false" },
  ];
  for (const e of entitlements) {
    await prisma.entitlement.create({ data: e });
  }
  console.log(`[seed] ${entitlements.length} entitlements criados.`);

  // --- PlanoEntitlement (T2.9): mapeia entitlements para cada plano ---
  const planoEntitlements: { plano: Plano; chave: string; valor: string }[] = [
    // FREE: limites basicos
    { plano: "FREE", chave: "max_watchlist_items", valor: "10" },
    { plano: "FREE", chave: "recommendation_tier", valor: "basic" },
    { plano: "FREE", chave: "media_score_history", valor: "false" },
    { plano: "FREE", chave: "advanced_filters", valor: "false" },
    { plano: "FREE", chave: "ad_free", valor: "false" },
    // PLUS: limites medios
    { plano: "PLUS", chave: "max_watchlist_items", valor: "100" },
    { plano: "PLUS", chave: "recommendation_tier", valor: "advanced" },
    { plano: "PLUS", chave: "media_score_history", valor: "true" },
    { plano: "PLUS", chave: "advanced_filters", valor: "true" },
    { plano: "PLUS", chave: "ad_free", valor: "true" },
    // PREMIUM: tudo no maximo
    { plano: "PREMIUM", chave: "max_watchlist_items", valor: "999999" },
    { plano: "PREMIUM", chave: "recommendation_tier", valor: "ml_personalized" },
    { plano: "PREMIUM", chave: "media_score_history", valor: "true" },
    { plano: "PREMIUM", chave: "advanced_filters", valor: "true" },
    { plano: "PREMIUM", chave: "ad_free", valor: "true" },
  ];
  for (const pe of planoEntitlements) {
    await prisma.planoEntitlement.create({ data: pe });
  }
  console.log(`[seed] ${planoEntitlements.length} plano_entitlements criados.`);

  // --- Usuarios (T2.2) ---
  const passwordHash = await argon2.hash("Senha@123", {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  const admin = await prisma.usuario.create({
    data: {
      email: "admin@mediarate.example",
      password_hash: passwordHash,
      nome: "Admin Master",
      email_verificado_em: new Date(),
    },
  });
  await prisma.usuarioPapel.create({
    data: { usuario_id: admin.id, papel_id: papelAdmin.id },
  });
  await prisma.usuarioPlano.create({
    data: { usuario_id: admin.id, plano: "PREMIUM", status: "ATIVA" },
  });

  const usuariosData: { email: string; nome: string; plano: Plano }[] = [
    { email: "free@mediarate.example", nome: "Usuario Free", plano: "FREE" },
    { email: "plus@mediarate.example", nome: "Usuario Plus", plano: "PLUS" },
    { email: "premium@mediarate.example", nome: "Usuario Premium", plano: "PREMIUM" },
  ];
  for (const u of usuariosData) {
    const usuario = await prisma.usuario.create({
      data: {
        email: u.email,
        password_hash: passwordHash,
        nome: u.nome,
        email_verificado_em: new Date(),
      },
    });
    await prisma.usuarioPapel.create({
      data: { usuario_id: usuario.id, papel_id: papelUser.id },
    });
    await prisma.usuarioPlano.create({
      data: { usuario_id: usuario.id, plano: u.plano, status: "ATIVA" },
    });
  }
  console.log(`[seed] 4 usuarios criados (1 admin + 3 por plano).`);

  // --- Consentimento LGPD para o admin (T2.11) ---
  await prisma.consentimentoUsuario.create({
    data: {
      usuario_id: admin.id,
      finalidade: "RECOMENDACAO_PERSONALIZADA",
      texto_versao: "v1.0",
      ip_aceite: "127.0.0.1",
    },
  });
  console.log(`[seed] 1 consentimento LGPD criado para admin.`);

  // --- Midias (T2.7 + extensao dominio) ---
  const midiasData: {
    fonte: string;
    fonte_id: string;
    tipo: TipoMidia;
    titulo: string;
    ano: number;
    classificacao: ClassificacaoIndicativa;
  }[] = [
    {
      fonte: "omdb",
      fonte_id: "tt0111161",
      tipo: "FILME",
      titulo: "The Shawshank Redemption",
      ano: 1994,
      classificacao: "DEZESSEIS",
    },
    {
      fonte: "omdb",
      fonte_id: "tt0468569",
      tipo: "FILME",
      titulo: "The Dark Knight",
      ano: 2008,
      classificacao: "DOZE",
    },
    {
      fonte: "tmdb",
      fonte_id: "1396",
      tipo: "SERIE",
      titulo: "Breaking Bad",
      ano: 2008,
      classificacao: "DEZESSEIS",
    },
    {
      fonte: "igdb",
      fonte_id: "19560",
      tipo: "GAME",
      titulo: "The Witcher 3: Wild Hunt",
      ano: 2015,
      classificacao: "DEZESSEIS",
    },
    {
      fonte: "openlibrary",
      fonte_id: "OL8162283W",
      tipo: "LIVRO",
      titulo: "The Lord of the Rings",
      ano: 1954,
      classificacao: "L",
    },
  ];
  const midias = [];
  for (const m of midiasData) {
    const midia = await prisma.midia.create({ data: m });
    midias.push(midia);
  }
  console.log(`[seed] ${midias.length} midias criadas.`);

  // --- MediaScore (T4.7 placeholder) ---
  for (const midia of midias) {
    const score = Math.round(60 + Math.random() * 40); // 60-100
    await prisma.mediaScore.create({
      data: {
        midia_id: midia.id,
        score,
        num_fontes: 2 + Math.floor(Math.random() * 3),
        pesos_usados: { omdb: 0.3, tmdb: 0.4, metacritic: 0.3 },
      },
    });
  }
  console.log(`[seed] ${midias.length} media_scores criados.`);

  // --- Sessao para o admin (T2.3 placeholder) ---
  // Nao gerada no seed — sessoes sao criadas em runtime pelo AuthService.

  console.log("[seed] Seed concluido com sucesso.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("[seed] Erro:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
