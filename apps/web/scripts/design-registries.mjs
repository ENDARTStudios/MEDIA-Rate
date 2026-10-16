#!/usr/bin/env node
/**
 * design:registries — valida os registries de componentes declarados no projeto.
 *
 * Por que existe: `apps/web/components.json` declara 5 registries (política D-580) e
 * **nenhum gate verificava se continuam vivos**. Um registry renomeado/morto só
 * aparecia no meio de uma instalação, com erro de rede no lugar de diagnóstico.
 *
 * Uso:
 *   node apps/web/scripts/design-registries.mjs          # relatório (exit 0 sempre)
 *   node apps/web/scripts/design-registries.mjs --ci     # exit 2 se algum cair
 *
 * Só faz GET no `<registry>/r/registry.json` de cada registry declarado — nenhum
 * componente é baixado e nada é escrito no repositório.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..", "..", "..");

/** Licença verificada em fonte primária (npm/GitHub/página), com a data da verificação. */
const LICENCAS = {
  "@obsidian": "MIT",
  "@kokonutui": "MIT",
  "@bklit": "MIT",
  "@react-bits": "MIT + Commons Clause (não redistribuir)",
  "@componentry": "MIT",
};

function registriesDeclarados() {
  const bruto = readFileSync(join(RAIZ, "apps", "web", "components.json"), "utf8");
  const json = JSON.parse(bruto);
  return Object.entries(json.registries ?? {});
}

async function medir(nome, template) {
  const url = template.replace("{name}", "registry");
  const inicio = Date.now();
  try {
    const resposta = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    const ms = Date.now() - inicio;
    if (!resposta.ok) return { nome, url, ok: false, status: resposta.status, ms };
    const json = await resposta.json();
    const itens = json.items ?? json.components ?? [];
    return {
      nome,
      url,
      ok: true,
      status: resposta.status,
      ms,
      quantos: itens.length,
      id: json.name,
    };
  } catch (erro) {
    return { nome, url, ok: false, erro: String(erro).slice(0, 60), ms: Date.now() - inicio };
  }
}

const alvos = registriesDeclarados();
if (alvos.length === 0) {
  console.error("design-registries: nenhum registry declarado em apps/web/components.json");
  process.exit(0);
}

const resultados = await Promise.all(alvos.map(([nome, template]) => medir(nome, template)));

console.log(`design-registries: ${resultados.length} registry(s) declarado(s)\n`);
for (const r of resultados) {
  const licenca = LICENCAS[r.nome] ?? "licença não verificada";
  if (r.ok) {
    console.log(
      `  OK    ${r.nome.padEnd(13)} ${String(r.quantos).padStart(4)} componentes  ` +
        `${String(r.ms).padStart(5)} ms  [${licenca}]`,
    );
  } else {
    console.log(
      `  FALHA ${r.nome.padEnd(13)} ${r.erro ? r.erro : `HTTP ${r.status}`}  [${licenca}]`,
    );
  }
}

const caidos = resultados.filter((r) => !r.ok);
if (caidos.length > 0) {
  console.log(
    `\n${caidos.length} registry(s) inacessível(is): ${caidos.map((c) => c.nome).join(", ")}`,
  );
  if (process.argv.includes("--ci")) {
    console.log("design-registries: FALHOU (--ci)");
    process.exit(2);
  }
  console.log("(rode com --ci para falhar o build quando isso acontecer)");
} else {
  console.log("\ndesign-registries: todos os registries declarados responderam.");
}
