#!/usr/bin/env node
/**
 * T211/D-620 — censo de **texto hardcoded em português no código-fonte**.
 *
 * Por que existe: o gate `test/i18n-leak.spec.ts` só compara as **chaves** dos catálogos de
 * mensagem (`pt-BR`/`en-US`/`es-ES`). Ele passa feliz enquanto um componente escreve
 * `"Diagnóstico"`, `"Erro ao carregar watchlist"` ou `alert("Tentar novamente")` direto no
 * JSX — e aí o produto fica em português para quem usa EN/ES. Foram encontrados casos no
 * checkout, no shell do admin, no store da watchlist e num "retry" que só mostra alerta.
 *
 * O que faz: varre `src/**` procurando **texto visível ao usuário** com marca de português
 * (acento ou palavra típica) em posições que chegam à tela:
 *   1. nós de texto em JSX (`<h1>Olá</h1>`);
 *   2. atributos que o usuário lê (`placeholder`, `title`, `aria-label`, `alt`, `label`);
 *   3. literais passados a `alert`/`confirm`/`prompt`.
 *
 * Baseline: como há dívida legada (parte dela em arquivos de outra frente), os achados
 * atuais estão congelados em `i18n-source-baseline.json` — o gate **falha apenas em achado
 * novo**, e `--update` regrava o baseline com justificativa no PR. Mesmo padrão do
 * `hex-baseline.json` (D-584), que já provou funcionar neste repositório.
 *
 * Uso: `npm run i18n:source` · `npm run i18n:source -- --update` · `--list`
 */
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = fileURLToPath(new URL(".", import.meta.url));
const WEB = join(AQUI, "..");
const SRC = join(WEB, "src");
const BASELINE = join(AQUI, "i18n-source-baseline.json");

const args = new Set(process.argv.slice(2));
const LISTAR = args.has("--list");
const ATUALIZAR = args.has("--update");

/** Palavras que denunciam português (evita marcar inglês legítimo como `Search`, `Score`). */
const PALAVRAS_PT =
  /\b(não|voce|você|para|com|sem|erro|falha|falhou|sucesso|entrar|sair|salvar|excluir|voltar|buscar|carregar|carregando|tentar|novamente|nenhum|nenhuma|lista|listas|mídia|midia|título|titulo|ainda|usuário|usuario|sessão|sessao|configurações|configuracoes|sobre|planos|preço|preco|assinar|cancelar|obrigatório|obrigatorio|preencha|inválido|invalido|encontrado|encontrada|pois|está|esta\s+disponível)\b/i;
const ACENTO_PT = /[áàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÇ]/;

const IGNORAR_DIR = new Set(["node_modules", ".next", "__snapshots__", "coverage"]);
const IGNORAR_ARQ = /\.(spec|test)\.(ts|tsx)$|\.d\.ts$/;

/** Remove comentários e o conteúdo de `className`/`href`/`src` (não é texto de leitor). */
function limpar(fonte) {
  return fonte
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1")
    .replace(/\bclassName\s*=\s*"[^"]*"/g, "")
    .replace(/\bclassName\s*=\s*\{`[^`]*`\}/g, "")
    .replace(/\bhref\s*=\s*"[^"]*"/g, "")
    .replace(/\bsrc\s*=\s*"[^"]*"/g, "");
}

function arquivos(dir) {
  const saida = [];
  for (const nome of readdirSync(dir)) {
    if (IGNORAR_DIR.has(nome)) continue;
    const completo = join(dir, nome);
    if (statSync(completo).isDirectory()) saida.push(...arquivos(completo));
    else if (/\.(tsx|ts)$/.test(nome) && !IGNORAR_ARQ.test(nome)) saida.push(completo);
  }
  return saida;
}

function parecePortugues(texto) {
  const t = texto.trim();
  if (t.length < 3) return false;
  if (!/[a-zA-ZÀ-ÿ]/.test(t)) return false;
  // Chave de tradução (`t("...")`, `common.cancel`) não é texto literal.
  if (/^[a-z0-9_.-]+$/i.test(t) && !/\s/.test(t) && !ACENTO_PT.test(t)) return false;
  if (ACENTO_PT.test(t) && /\s/.test(t)) return true;
  return PALAVRAS_PT.test(t) && /\s/.test(t);
}

function achadosDoArquivo(caminho) {
  const fonte = limpar(readFileSync(caminho, "utf8"));
  const linhas = fonte.split("\n");
  const achados = [];
  const padroes = [
    { tipo: "jsx-texto", re: />([^<>{}\n]{4,160})</g },
    { tipo: "atributo", re: /\b(?:placeholder|title|aria-label|alt|label)\s*=\s*"([^"]{3,160})"/g },
    { tipo: "alerta", re: /\b(?:alert|confirm|prompt)\s*\(\s*"([^"]{3,160})"/g },
  ];
  linhas.forEach((linha, i) => {
    for (const { tipo, re } of padroes) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(linha)) !== null) {
        if (parecePortugues(m[1])) {
          achados.push({
            arquivo: relative(WEB, caminho).split(sep).join("/"),
            linha: i + 1,
            tipo,
            texto: m[1].trim().slice(0, 80),
          });
        }
      }
    }
  });
  return achados;
}

const todos = arquivos(SRC).flatMap(achadosDoArquivo);
const chave = (a) => `${a.arquivo}:${a.texto}`;
const atuais = [...new Set(todos.map(chave))].sort();

if (ATUALIZAR) {
  writeFileSync(
    BASELINE,
    JSON.stringify(
      { motivo: "D-620 — dívida de texto PT hardcoded congelada", chaves: atuais },
      null,
      2,
    ) + "\n",
  );
  console.log(`i18n-source: baseline atualizado com ${atuais.length} chave(s)`);
  process.exit(0);
}

const baseline = existsSync(BASELINE)
  ? (JSON.parse(readFileSync(BASELINE, "utf8")).chaves ?? [])
  : [];
const conjunto = new Set(baseline);
const novos = todos.filter((a) => !conjunto.has(chave(a)));

if (LISTAR) {
  console.log(`i18n-source: ${todos.length} achado(s) (baseline ${baseline.length})\n`);
  for (const a of todos)
    console.log(
      `${conjunto.has(chave(a)) ? "  legado" : "  NOVO  "} ${a.arquivo}:${a.linha} [${a.tipo}] ${a.texto}`,
    );
  process.exit(0);
}

if (novos.length > 0) {
  console.error(`i18n-source: ${novos.length} texto(s) em português hardcoded fora do baseline:\n`);
  for (const a of novos) console.error(`  ${a.arquivo}:${a.linha} [${a.tipo}] ${a.texto}`);
  console.error(
    `\nUse as mensagens de next-intl (paridade nos 3 locales). Legado: ${baseline.length} chave(s).`,
  );
  process.exit(1);
}

console.log(
  `i18n-source: OK — nenhum texto PT hardcoded novo (legado congelado: ${baseline.length} chave(s), ${todos.length} ocorrência(s))`,
);
