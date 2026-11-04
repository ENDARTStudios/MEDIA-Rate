# Custo de build na Vercel — diagnóstico e o que foi feito

> Levantado em 2026-11-04, depois de o Operador relatar **Build CPU Minutes** estourando o
> limite do plano PRO. Toda afirmação aqui tem medição; o que é estimativa está marcado.

## 1. O que foi medido

Contagem de deployments nos **últimos 30 dias**, por projeto, via API da Vercel
(`/v6/deployments`, time `end-art-studios`). A API devolve no máximo 100 por página, então
**"100+" quer dizer que bateu o teto da consulta** — o número real é maior.

| Projeto | Builds (30d) | Produção | Preview |
|---|---|---|---|
| auto-trader | 100+ | 29 | 71+ |
| curriculo-politico | 100+ | 52 | 48+ |
| almanaque-dos-clubes | 100+ | 56 | 44+ |
| **media-rate** | **100** | **43** | **57** |
| nexus-alpha | 89 | 66 | 23 |
| shop-finder | 4 | 1 | 3 |
| tank-wallet | 4 | 0 | 4 |
| **total** | **≥497** | **≥247** | **≥250** |

**Conclusão 1 — o limite não é só do MEDIA Rate.** Quatro dos sete projetos já batem 100
builds/mês. Otimizar só o MEDIA Rate corta, no melhor caso, ~20% da conta. A decisão de
plano/hospedagem é do Operador; o que dá para fazer sem trocar de plataforma está abaixo.

**Conclusão 2 — no MEDIA Rate, o peso está dividido:** 43 builds de produção (um por push
em `main`) e **57 de preview** (um por push em qualquer branch, incluindo cada push de
Dependabot).

## 2. Por que cada build é caro aqui

O projeto é um monorepo Next 16 com ~100 rotas, três locales e `next build` de App Router:

| Fator | Situação | Custo |
|---|---|---|
| `ignoreCommand` | **não existia** → todo push em qualquer branch builda o app inteiro | commit só de API/docs/CI rebuildava o site |
| preview por branch | **habilitado para todas** | 57 builds/mês só de preview |
| `typescript` no build | ativo (padrão) | checagem de tipos de todo o app em cada build |
| `productionBrowserSourceMaps` | `true` | gera source maps do browser em cada build |
| `installCommand` | `cd apps/web && npm install` | instala dependências a cada build, sem cache de lockfile (`npm ci` seria mais rápido) |

## 2.1 A causa do "deploy travado" (achado que muda o diagnóstico)

O projeto **está pausado na Vercel**. Medido na API do projeto
(`GET /v9/projects/prj_4cS36A1QBOiM7iInnwPAhSTSAOFm`): `"paused": true`. Consequência
direta nos deployments: os últimos do MEDIA Rate saem `readyState: BLOCKED` /
`readySubstate: STAGED` — é isso que aparece no PR como **"Deployment was blocked"**, e
não falha de código nem do `ignoreCommand`.

Comparação no mesmo período: `auto-trader` → `READY` em todos; `almanaque-dos-clubes` →
1 `BLOCKED` e o resto `READY`; **media-rate → `BLOCKED` nos 4 mais recentes**.

Ou seja: **nenhuma mudança de código faz o deploy voltar sozinho.** Enquanto o projeto
estiver pausado (efeito do limite de gastos), preview e produção ficam bloqueados. Sair
disso é decisão de cobrança do Operador (retomar o projeto e/ou elevar o limite, ou
reduzir o consumo). O `ignoreCommand` deste PR é o que impede o problema voltar **depois**
que o limite for resolvido.

> Verificação rápida: `vercel api "/v9/projects/<id>?teamId=<team>"` e procurar `"paused"`.
> Deploy bloqueado por pausa **não** gasta Build CPU Minutes — o custo para aqui.
## 3. O que foi aplicado neste PR

`apps/web/vercel.json`:

```json
{
  "ignoreCommand": "ROOT=$(git rev-parse --show-toplevel) || exit 1; git -C \"$ROOT\" diff --quiet HEAD^ HEAD -- apps/web package.json package-lock.json || exit 1",
}
```

- **`ignoreCommand`** — a convenção da Vercel é **exit 0 = pular build, exit ≥1 = buildar**
  ([KB oficial](https://vercel-docs.vercel.sh/kb/guide/how-do-i-use-the-ignored-build-step-field-on-vercel)).
  O comando compara `HEAD^` com `HEAD` restrito a
  `apps/web`, `package.json` e `package-lock.json`. Commit que só mexe em `apps/api`,
  `docs/`, `.github/` ou testes **não gera build de web**. Se o git falhar, o comando cai
  em "buildar" (default seguro — nunca pula por erro).
  - Efeito medido localmente no histórico real: dos últimos commits, os que tocam
    `apps/web` dão `exit 1` (buildam) e os de API dão `exit 0` (pulam).
- **`git.deploymentEnabled: { "dependabot/**": false }`** — branches do Dependabot deixam de
  gerar preview. A Vercel aceita [minimatch](https://vercel.com/docs/project-configuration/git-configuration#ignorecommand),
  então `dependabot/**` cobre todos os bumps. PR de dependência continua testado pelo CI
  do GitHub; o que se perde é a URL de preview.

**Estimativa de economia:** com a distribuição atual (~43 produção + 57 preview), o filtro
de `ignoreCommand` deve remover boa parte dos builds de produção que hoje são de commits
sem mudança de web (números recentes mostram maioria de commits `fix(api)`/`chore(deps)`),
e o bloqueio de Dependabot remove ~10–20 previews/mês. Estimativa conservadora: **30–40%
dos builds do MEDIA Rate**, sem perda de qualidade.

## 3.1 Verificação depois da retomada (2026-11-04)

O Operador atualizou o limite e o projeto foi **retomado por API** — o `PATCH` do projeto
não aceita `paused`, o endpoint correto é:

```powershell
vercel api -X POST "/v1/projects/<PROJECT_ID>/unpause?teamId=<TEAM_ID>"
# conferir:  vercel api "/v9/projects/<PROJECT_ID>?teamId=<TEAM_ID>"  → "paused": false
```

Com o projeto retomado, o filtro foi exercitado ponta a ponta:

| Commit | Toca `apps/web`? | Deployment | Custo |
|---|---|---|---|
| `docs(web)` (README) | sim | **BUILDING → READY**, check "Vercel" **pass** | build normal |
| `chore(deploy)` (vazio) | não | **CANCELED** | **zero** Build CPU |
| doc fora de `apps/web` | não | **CANCELED** | **zero** Build CPU |

É a prova de que o `ignoreCommand` corta exatamente o que deveria cortar e que o caminho
de build continua saudável depois da retomada.

**Efeito colateral esperado e documentado**: em PR que não toca `apps/web`, o check
"Vercel" aparece como *canceled/blocked*. Não é falha — é o filtro. A explicação ficou
também em `apps/web/README.md` para quem abre o PR sem esse contexto.
## 4. Opções que ficaram para decisão do Operador (com o número na mesa)

| Opção | Economia estimada | Custo / risco |
|---|---|---|
| **Desabilitar preview para todas as branches** (`"git": { "deploymentEnabled": false }`) | 57 builds/mês | perde URL de preview em PR; revisão visual passa a depender de ambiente local |
| **`productionBrowserSourceMaps: false` no ambiente Vercel** | ~5–10% do build | exige confirmar que o upload de sourcemaps ao Sentry roda só no CI (`ci.yml` → "Sentry sourcemaps"), não na Vercel |
| **`installCommand: "npm ci"`** (hoje é `npm install` em `apps/web`) | ~5–15% do build | muda o comando de instalação; precisa validar que o monorepo resolve no workspace certo |
| **Remover `typescript` do build** | ~10–20% | **não recomendo**: hoje o `tsc` só roda no `deploy.yml` (pós-merge). Tirar do build elimina o último gate de tipos antes do deploy |
| **Consolidar/limpar projetos** (auto-trader, curriculo-politico, almanaque, nexus-alpha) | até 60% da conta | decisão de produto/negócio: são projetos diferentes |
| **Levar build do web para GitHub Actions + artefato** | ~todos os minutos pagos | migração relevante; CI já tem cache e o build é o mesmo |

### Recomendação

1. Aplicar o que está neste PR (feito).
2. Medir por 2 semanas: a tela de *Usage* da Vercel mostra Build CPU Minutes por projeto —
   comparar com a linha de base de ~100 builds/30d.
3. Se ainda estourar, a próxima alavanca de maior efeito é **desligar preview em branch**
   (57 builds/mês) — mas isso muda o fluxo de revisão, então é sua decisão.
4. Em paralelo, vale um gate de tipos nos PRs (hoje o `tsc` só roda pós-merge): sem ele,
   "tirar tipos do build" vira tentador e perigoso.

## 5. Como verificar o efeito

```powershell
# builds do MEDIA Rate nos últimos 30 dias (o teto da API é 100 por página)
$team = "team_5RWuK4Qt0MCv81w2zGY0UPub"
$proj = "prj_4cS36A1QBOiM7iInnwPAhSTSAOFm"
$desde = [DateTimeOffset]::UtcNow.AddDays(-30).ToUnixTimeMilliseconds()
vercel api "/v6/deployments?projectId=$proj&teamId=$team&since=$desde&limit=100"
```

Sinais esperados depois do merge: menos deployments com `target: null` (preview de
Dependabot) e menos builds de produção em commits que não tocam `apps/web` — a Vercel
marca esses como **Skipped** em vez de **Ready**, e eles não consomem Build CPU Minutes.
