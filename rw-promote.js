(async () => {
  const { PrismaClient } = await import("@prisma/client");
  const p = new PrismaClient();
  const user = await p.usuario.findUnique({ where: { email: "lgpd-test@mediarate.test" } });
  let papel = await p.papel.findUnique({ where: { nome: "ADMIN" } });
  if (!papel) papel = await p.papel.create({ data: { nome: "ADMIN" } });
  const ja = await p.usuarioPapel.findFirst({ where: { usuario_id: user.id, papel_id: papel.id } });
  if (!ja) await p.usuarioPapel.create({ data: { usuario_id: user.id, papel_id: papel.id } });
  console.log("ADMIN ativo");
  await p.$disconnect();
})().catch((e) => { console.error("ERRO:", e.message); process.exit(1); });
