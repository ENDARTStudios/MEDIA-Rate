#!/usr/bin/env node
/* global console */
// T115 - self-test deterministico do linkcheck (sem rede; fixtures em memoria/arquivos reais).
import { fileURLToPath } from "node:url";
import { extrairLinks, slug, ancorasDe, validar } from "./linkcheck.mjs";

const este = fileURLToPath(import.meta.url);
let ok = 0,
  fail = 0;
const t = (n, c) => {
  if (c) {
    ok++;
    console.log("ok - " + n);
  } else {
    fail++;
    console.error("FAIL - " + n);
  }
};

t("extrai link relativo", extrairLinks("[x](a.md)").includes("a.md"));
t("ignora link dentro de code fence", extrairLinks("```\n[x](a.md)\n```").length === 0);
t("mantem URL externa para ser ignorada depois", extrairLinks("[x](https://a.b)").length === 1);
t(
  "slug normaliza acento e espaco",
  slug("Precificacao e Monetizacao") === "precificacao-e-monetizacao",
);
t("ancora existente", ancorasDe("## Objetivo\n").has("objetivo"));
t("ancora inexistente", !ancorasDe("## Objetivo\n").has("escopo"));
t("link relativo quebrado detectado", validar(este, "[x](./nao-existe-xyz.md)").length === 1);
t("link relativo valido (mesmo diretorio)", validar(este, "[x](./linkcheck.mjs)").length === 0);
t("ancora quebrada no mesmo arquivo", validar(este, "[x](#nao-existe)").length === 1);
t("URL externa ignorada", validar(este, "[x](https://exemplo.invalid)").length === 0);
t("link em code fence ignorado", validar(este, "```\n[x](./nao-existe-xyz.md)\n```").length === 0);

console.log(`self-test linkcheck: ${ok} ok, ${fail} fail`);
process.exit(fail ? 1 : 0);
