/**
 * Fixture da evidência local (D-527 / scripts/evidence-local.mjs) — mídias +
 * interações para o usuário de teste PREMIUM. Somente para ambiente LOCAL
 * (nada de dado sensível; rodar APÓS db:provision:test-users).
 * Uso: DATABASE_URL=<local> node apps/api/prisma/fixtures/evidence-fixture.cjs
 */
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const MIDIAS = [
  { id: "11111111-1111-4111-8111-111111111111", slug: "duna-parte-dois", titulo: "Duna: Parte Dois", tipo: "FILME", ano: 2024 },
  { id: "22222222-2222-4222-8222-222222222222", slug: "hades-2", titulo: "Hades II", tipo: "GAME", ano: 2024 },
  { id: "33333333-3333-4333-8333-333333333333", slug: "piranesi", titulo: "Piranesi", tipo: "LIVRO", ano: 2020 },
  { id: "44444444-4444-4444-8444-444444444444", slug: "o-menu", titulo: "O Menu", tipo: "FILME", ano: 2022 },
  { id: "55555555-5555-4555-8555-555555555555", slug: "ruptura", titulo: "Ruptura", tipo: "SERIE", ano: 2025 },
];
const PREMIUM = process.env.EVIDENCE_EMAIL ?? "premium@mediarate.test";

async function main() {
  for (const m of MIDIAS) {
    await p.midia.upsert({
      where: { id: m.id },
      create: { id: m.id, slug: m.slug, titulo: m.titulo, tipo: m.tipo, ano_lancamento: m.ano, fonte_id: `fixture-${m.slug}`, fonte: "FIXTURE", updated_at: new Date() },
      update: {},
    });
  }
  const user = await p.usuario.findUnique({ where: { email: PREMIUM } });
  if (!user) throw new Error("usuário premium ausente — rode db:provision:test-users antes");
  let i = 0;
  const itens = [
    { m: MIDIAS[0], status: "CONCLUIDO", reacao: "GOSTEI" },
    { m: MIDIAS[1], status: "CONSUMINDO", reacao: null },
    { m: MIDIAS[2], status: "CONCLUIDO", reacao: null },
    { m: MIDIAS[3], status: "ABANDONADO", reacao: null, motivo: "FALTA_TEMPO" },
    { m: MIDIAS[4], status: "QUERO_CONSUMIR", reacao: null },
  ];
  for (const it of itens) {
    i += 1;
    await p.usuarioMidiaInteracao.upsert({
      where: { usuario_id_midia_id: { usuario_id: user.id, midia_id: it.m.id } },
      create: {
        id: `aaaaaaa1-0000-4000-8000-00000000000${i}`,
        usuario_id: user.id,
        midia_id: it.m.id,
        status: it.status,
        reacao: it.reacao,
        motivo_abandono: it.motivo ?? null,
      },
      update: { status: it.status, reacao: it.reacao, motivo_abandono: it.motivo ?? null },
    });
  }
  console.log("fixture ok: 5 midias +", itens.length, "interacoes para", PREMIUM);
}

main().finally(() => p.$disconnect());
