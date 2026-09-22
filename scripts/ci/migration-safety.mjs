#!/usr/bin/env node
/**
 * T031/B1 (#148 item 7) — guarda FAIL-CLOSED para mudanças de banco.
 *
 * O entrypoint do Railway aplica `prisma migrate deploy` no boot de TODO
 * deploy de produção. Um PR que altera `apps/api/prisma/migrations/**` ou
 * `apps/api/prisma/schema.prisma` vai direto para produção no merge — este
 * guard é a trava pré-merge: exige (1) label `migration-review`,
 * (2) PLANO DE ROLLBACK na descrição e (3) declaração explícita de migration.
 *
 * Falha fechando: metadado ausente/ilegível quando há mudança de banco =
 * BLOQUEADO (motivo listado). Sem mudança de banco = liberado.
 *
 * Uso em CI (metadados via arquivos — nunca inline, anti-injeção):
 *   node scripts/ci/migration-safety.mjs \
 *     --files-file /tmp/pr-files.txt --labels-file /tmp/pr-labels.json \
 *     --body-file /tmp/pr-body.md
 * Self-test (sem rede, sem git, sem segredos):
 *   node scripts/ci/migration-safety.mjs --self-test
 */
import { readFileSync } from "node:fs";

export const LABEL_OBRIGATORIA = "migration-review";

/** Padrões de arquivo que caracterizam mudança de banco (schema ou migration). */
export const PADROES_BANCO = [
  /^apps\/api\/prisma\/migrations\//,
  /^apps\/api\/prisma\/schema\.prisma$/,
];

const MIN_CONTEUDO_PLANO = 15;

/**
 * True se o arquivo é mudança de banco (migration versionada ou schema).
 */
export function ehArquivoDeBanco(caminho) {
  const normalizado = String(caminho ?? "").replace(/\\/g, "/").trim();
  return PADROES_BANCO.some((re) => re.test(normalizado));
}

/**
 * Extrai labels de JSON do GitHub (`["a","b"]`). Retorna { labels } ou
 * { erro } em caso de JSON ilegível (o chamador decide o fail-closed).
 */
export function lerLabels(textoJson) {
  let bruto;
  try {
    bruto = JSON.parse(textoJson);
  } catch {
    return { erro: "JSON de labels inválido" };
  }
  if (!Array.isArray(bruto)) return { erro: "JSON de labels não é array" };
  return { labels: bruto.map(String) };
}

/** Marcares aceitos como início de plano de rollback (heading ou bold). */
const RE_MARCADOR_ROLLBACK =
  /(^|\n)\s*(?:#{1,4}\s*(?:plano\s+de\s+)?rollback\b|\*\*(?:plano\s+de\s+)?rollback\b\*\*\s*:?)/i;

/**
 * True se o corpo do PR contém um PLANO DE ROLLBACK real: marcador
 * (heading `#… Rollback`/`Plano de rollback` ou bold `**Rollback…`) seguido
 * de conteúdo não-vazio (>= MIN_CONTEUDO_PLANO chars).
 */
export function temPlanoRollback(corpo) {
  const texto = String(corpo ?? "");
  const m = RE_MARCADOR_ROLLBACK.exec(texto);
  if (!m) return false;
  const depois = texto.slice(m.index + m[0].length).replace(/\s+/g, " ").trim();
  return depois.length >= MIN_CONTEUDO_PLANO;
}

/**
 * True se o corpo DECLARA explicitamente a migration (linha começando com
 * "migration"/"migração", crua ou em bold).
 */
export function temDeclaracaoMigration(corpo) {
  // Ancorada no INÍCIO de linha (aceitando bullet/bold) — menção solta a
  // "migration" no meio do texto (ex.: plano de rollback) não conta.
  return /(^|\n)\s*(?:[-*]\s+)?(?:\*\*)?\s*migra(?:[çc][ãa]o|tion)\b/i.test(String(corpo ?? ""));
}

/**
 * Avaliação pura do guard. Falha fechando: se há arquivo de banco e
 * qualquer metadado estiver ilegível → bloqueado com motivo.
 */
export function avaliar({ arquivos, labels, corpo }) {
  const deBanco = (arquivos ?? []).filter(ehArquivoDeBanco);
  if (deBanco.length === 0) {
    return { bloqueado: false, motivos: ["sem mudanças de banco — guard não se aplica"] };
  }

  const motivos = [];

  if (!Array.isArray(labels)) {
    motivos.push("labels ilegíveis (fail-closed) — informe as labels do PR em JSON válido");
  } else if (!labels.includes(LABEL_OBRIGATORIA)) {
    motivos.push(`label obrigatória ausente: "${LABEL_OBRIGATORIA}"`);
  }

  if (!temPlanoRollback(corpo)) {
    motivos.push(
      "plano de rollback ausente — adicione uma seção '## Rollback' com conteúdo real na descrição",
    );
  }

  if (!temDeclaracaoMigration(corpo)) {
    motivos.push(
      "declaração de migration ausente — adicione uma linha 'Migration:' com a intenção da mudança",
    );
  }

  if (motivos.length === 0) {
    return {
      bloqueado: false,
      motivos: [
        `mudança de banco com contrato B1 completo — liberado (${deBanco.length} arquivo(s) de banco)`,
      ],
    };
  }
  return { bloqueado: true, motivos };
}

// ────────────────────────── self-test ──────────────────────────

export function rodarSelfTest() {
  const casos = [];
  const ok = (nome, fn) => casos.push([nome, fn]);

  const completo = {
    labels: [LABEL_OBRIGATORIA],
    corpo: "## O que\nmuda X\n\n## Rollback\nReverter o merge e rodar `prisma migrate resolve --rolled-back` na migration 20260922_exemplo; banco tem backup diário (7.7).",
  };

  ok("sem arquivo de banco → liberado", () => {
    const r = avaliar({ arquivos: ["README.md", "docs/x.md"], labels: [], corpo: "" });
    if (r.bloqueado !== false) throw new Error("deveria liberar");
  });

  ok("migration + label + plano + declaração → liberado", () => {
    const r = avaliar({
      arquivos: ["apps/api/prisma/migrations/20260922_exemplo/migration.sql"],
      ...completo,
      corpo: completo.corpo + "\n\n**Migration:** cria tabela exemplo.",
    });
    if (r.bloqueado !== false) throw new Error("deveria liberar: " + JSON.stringify(r.motivos));
  });

  ok("schema.prisma + completo → liberado", () => {
    const r = avaliar({
      arquivos: ["apps/api/prisma/schema.prisma"],
      ...completo,
      corpo: completo.corpo + "\n\nMigration: adiciona coluna exemplo.",
    });
    if (r.bloqueado !== false) throw new Error("deveria liberar: " + JSON.stringify(r.motivos));
  });

  ok("migration SEM label → bloqueado (motivo label)", () => {
    const r = avaliar({
      arquivos: ["apps/api/prisma/migrations/20260922_exemplo/migration.sql"],
      labels: ["outra"],
      corpo: completo.corpo + "\n\nMigration: x.",
    });
    if (r.bloqueado !== true || !r.motivos.some((m) => m.includes("migration-review"))) {
      throw new Error("deveria bloquear por label: " + JSON.stringify(r));
    }
  });

  ok("migration + label SEM plano de rollback → bloqueado", () => {
    const r = avaliar({
      arquivos: ["apps/api/prisma/migrations/20260922_exemplo/migration.sql"],
      labels: [LABEL_OBRIGATORIA],
      corpo: "Migration: x.",
    });
    if (r.bloqueado !== true || !r.motivos.some((m) => /rollback/i.test(m))) {
      throw new Error("deveria bloquear por plano: " + JSON.stringify(r));
    }
  });

  ok("sem declaração de migration → bloqueado", () => {
    const r = avaliar({ arquivos: ["apps/api/prisma/schema.prisma"], ...completo });
    if (r.bloqueado !== true || !r.motivos.some((m) => /declara/i.test(m))) {
      throw new Error("deveria bloquear por declaração: " + JSON.stringify(r));
    }
  });

  ok("labels JSON ilegível + banco → bloqueado (fail-closed)", () => {
    const r = avaliar({
      arquivos: ["apps/api/prisma/migrations/20260922_x/migration.sql"],
      labels: { erro: "json quebrado" },
      corpo: completo.corpo + "\n\nMigration: x.",
    });
    if (r.bloqueado !== true || !r.motivos.some((m) => /ileg/i.test(m))) {
      throw new Error("deveria bloquear fail-closed: " + JSON.stringify(r));
    }
  });

  ok("corpo vazio + banco → bloqueado (fail-closed)", () => {
    const r = avaliar({
      arquivos: ["apps/api/prisma/schema.prisma"],
      labels: [LABEL_OBRIGATORIA],
      corpo: "",
    });
    if (r.bloqueado !== true) throw new Error("deveria bloquear: " + JSON.stringify(r));
  });

  ok("docs-only com labels ilegíveis → liberado (guard só vale p/ banco)", () => {
    const r = avaliar({ arquivos: ["docs/a.md"], labels: { erro: "x" }, corpo: "" });
    if (r.bloqueado !== false) throw new Error("deveria liberar docs-only");
  });

  ok("caminho de migration fora do app não conta", () => {
    const r = avaliar({ arquivos: ["outra-coisa/prisma/migrations/x/migration.sql"], labels: [], corpo: "" });
    if (r.bloqueado !== false) throw new Error("deveria liberar caminho alheio");
  });

  let falhas = 0;
  for (const [nome, fn] of casos) {
    try {
      fn();
      console.log(`  ✓ ${nome}`);
    } catch (e) {
      falhas++;
      console.error(`  ✗ ${nome}\n    ${e.message}`);
    }
  }
  console.log(`self-test: ${casos.length - falhas}/${casos.length} ok`);
  return falhas === 0;
}

// ─────────────────────────── CLI ───────────────────────────

function argValor(flag, argv) {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--self-test")) {
    const passou = rodarSelfTest();
    process.exit(passou ? 0 : 1);
  }

  const labelsRes = (() => {
    const arquivo = argValor("--labels-file", argv);
    const inline = argValor("--labels", argv);
    try {
      const bruto = arquivo ? readFileSync(arquivo, "utf8") : (inline ?? "[]");
      return lerLabels(bruto);
    } catch (e) {
      return { erro: `falha ao ler labels: ${e.message}` };
    }
  })();

  const corpoRes = (() => {
    const arquivo = argValor("--body-file", argv);
    const inline = argValor("--body", argv);
    if (!arquivo && inline === undefined) return { erro: "sem --body-file/--body" };
    try {
      return { corpo: arquivo ? readFileSync(arquivo, "utf8") : inline };
    } catch (e) {
      return { erro: `falha ao ler corpo: ${e.message}` };
    }
  })();

  const arquivosRes = (() => {
    const arquivo = argValor("--files-file", argv);
    const inline = argValor("--files", argv);
    try {
      const bruto = arquivo ? readFileSync(arquivo, "utf8") : (inline ?? "");
      return { arquivos: bruto.split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean) };
    } catch (e) {
      return { erro: `falha ao ler arquivos: ${e.message}` };
    }
  })();

  const resultado = avaliar({
    arquivos: arquivosRes.arquivos ?? [],
    labels: labelsRes.labels ?? labelsRes,
    corpo: corpoRes.corpo ?? "",
  });

  if (arquivosRes.erro || labelsRes.erro || corpoRes.erro) {
    // Fail-closed na coleta: erro de leitura bloqueia sempre.
    const motivos = [
      arquivosRes.erro && `arquivos ilegíveis (${arquivosRes.erro})`,
      labelsRes.erro && `labels ilegíveis (${labelsRes.erro})`,
      corpoRes.erro && `corpo ilegível (${corpoRes.erro})`,
    ].filter(Boolean);
    console.error("::error::migration-safety: coleta de metadados falhou (fail-closed)");
    for (const m of motivos) console.error(`  - ${m}`);
    process.exit(1);
  }

  if (resultado.bloqueado) {
    console.error("::error::migration-safety: PR altera banco e não cumpre o contrato B1");
    for (const m of resultado.motivos) console.error(`  - ${m}`);
    console.error(
      `Como cumprir: adicione a label "${LABEL_OBRIGATORIA}" e, na descrição do PR, ` +
        `uma seção "## Rollback" com o plano e uma linha "Migration:" com a intenção. ` +
        `Contrato completo: docs/b1-prod-guards.md`,
    );
    process.exit(1);
  }

  console.log(
    resultado.motivos[0] ??
      "migration-safety: sem mudanças de banco — liberado.",
  );
  process.exit(0);
}

// Executa como CLI; quando importado (specs futuros), não roda nada.
// (comparação por sufixo — robusta em Windows e Linux)
const executadoDireto =
  process.argv[1] &&
  process.argv[1].replace(/\\/g, "/").endsWith("scripts/ci/migration-safety.mjs");
if (executadoDireto) {
  main();
}
