# DEFERIDOS_APROVACAO.md — MEDIA Rate

> **STATUS (2026-08-19, D-326):**
> - ✅ **T328** (FORCE RLS catálogo) — **APLICADO** (migration `20260819_rls_catalogo_force`
>   + `media.service` refatorado para `comContextoRls`). Typecheck + 42 testes verdes.
> - ✅ **T330** (slug indexado) — **APLICADO** (migration `20260819_midia_slug` +
>   `db:seed:slugs` backfill + `getBySlug`/`list` usam slug + web usa slug do servidor).
>   Typecheck + 57 testes verdes.
> - ⏳ **T327** (CSP sem `unsafe-inline`) — **PENDENTE de validação em browser**
>   (nonce no App Router + PostHog/Sentry inline exigem Playwright/staging).

> Regra de ouro: migrations deste arquivo NÃO vão para `apps/api/prisma/migrations/`
> sem o refactor prévio correspondente — o `Dockerfile` roda `prisma migrate deploy`
> no boot. (T328/T330 já têm refactor + testes; T327 não é migration.)

---

## T327 — CSP sem `unsafe-inline` (nonce no App Router)

**Achado (HIGH):** `apps/web/next.config.ts:81` emite
`script-src 'self' 'unsafe-inline' https://us-assets.i.posthog.com` — contradiz
o comentário do próprio arquivo (`:11-14`) que promete `strict-dynamic` + nonce.
`unsafe-inline` neutraliza boa parte da CSP contra XSS inline.

**Correção planejada:**
1. Remover `unsafe-inline` de `script-src` e mover a CSP para um `middleware.ts`
   que gera um nonce por requisição (Next.js injeta o nonce nos scripts que ele
   mesmo emite) e o expõe via header `Content-Security-Policy` +
   `x-nonce` (consumido pelo PostHog/Sentry).
2. `script-src 'self' 'nonce-<value>' 'strict-dynamic' https://us-assets.i.posthog.com`.
3. `PostHogProvider` / `SentryClientInit` precisam injetar o nonce nos snippets
   inline que geram (hoje dependem de `unsafe-inline`).

**Por que não aplicar às cegas:** nonce no App Router + PostHog/Sentry inline é
delicado — um nonce não propagado quebra o site inteiro (scripts bloqueados).
Exige ciclo de teste dedicado (Playwright + prod smoke).

**Critério de aceite:** `script-src` sem `unsafe-inline` em produção; PostHog e
Sentry capturando eventos; Playwright verde; sem erro de console de script
bloqueado.

---

## T328 — FORCE ROW LEVEL SECURITY no catálogo + role de aplicação

**Achado (HIGH):** as tabelas de catálogo/curadoria têm RLS com `ENABLE` mas
**sem `FORCE`** — `apps/api/prisma/migrations/20260811_z_rls/migration.sql`
(`midia` :40, `classificacao_regiao` :58, `premio` :67, `temporada` :75).
Sem `FORCE`, o **owner** da tabela (a role com que a app conecta) **burla** as
policies — o isolamento por `tenant_id` do catálogo não é efetivo.

**Migration pronta (aplicar manualmente — NÃO via migrate deploy):**

```sql
-- T328: FORCE RLS no catálogo/curadoria (owner passa a respeitar as policies).
ALTER TABLE "midia" FORCE ROW LEVEL SECURITY;
ALTER TABLE "classificacao_regiao" FORCE ROW LEVEL SECURITY;
ALTER TABLE "premio" FORCE ROW LEVEL SECURITY;
ALTER TABLE "temporada" FORCE ROW LEVEL SECURITY;
```

**⚠️ Pré-requisito OBRIGATÓRIO antes de aplicar (senão quebra o CRUD admin):**
as escritas de `apps/api/src/modules/media/media.service.ts` (`create` :85,
`update` :102, `remove` :112) usam `this.prisma.midia.*` **direto, sem contexto
RLS**. Com `FORCE`, as policies de escrita exigem
`current_setting('app.current_user_role') IN ('CURATOR','ADMIN')` — sem contexto
a escrita é **bloqueada**. Refatorar para rodar dentro de `comContextoRls`:

```ts
// media.service.ts
import { comContextoRls } from "../../common/rls-context.js";

async create(dto: CreateMediaDto) {
  await this.verificarUnicidade(dto);
  return comContextoRls(this.prisma, { role: "ADMIN" }, (tx) =>
    tx.midia.create({ data: mapCreateDto(dto) }),
  );
}
// update/remove: idem, com role ADMIN (endpoints já são @Roles(ADMIN)).
```

**Leituras:** `midia_select` já tem fallback `COALESCE(..., default tenant)`
(`00000000-...-0001`), então leituras sem contexto continuam vendo o tenant
default. Confirmar que todo o catálogo vive no tenant default (T289 foi aditivo,
sem multi-tenant real ainda) antes de aplicar.

**Nota:** `recommendations.service.ts` já foi corrigido (`role:"ADMIN"` →
`"USER"`, e `this.prisma` → `tx`) na auditoria — não repetir.

**Teste (obrigatório):** `apps/api/test/rls-usuario-plano.e2e.spec.ts` é o
modelo; criar análogo para `midia` validando que: escrita admin com contexto
passa, escrita sem contexto falha, e leitura isolada por tenant.

---

## T330 — Coluna `slug` indexada (elimina full scan no getBySlug)

**Achado (perf HIGH):** `apps/api/src/modules/media/media.controller.ts:355-364`
— `getBySlug` faz `midia.findMany` **sem where** e roda `slugify()` por linha em
JS a cada requisição de ficha (O(n) + slugify JS). O slug não é persistido.

**Correção planejada (migration + backfill + código):**
1. `schema.prisma` (`model Midia`): adicionar
   `slug String? @unique @map("slug") @db.VarChar(300)`.
2. Migration aditiva: `ADD COLUMN "slug"` + `CREATE UNIQUE INDEX`.
3. Backfill via script Node (o `slugify` é JS — não dá para fazer em SQL puro):
   percorrer mídias, calcular `slugify(titulo)` e, em colisão, aplicar o sufixo
   discriminado `{slug}-{tipo}` (mesma regra de `parseSlugDiscriminado`, T251).
4. `media.service.create/update`: persistir `slug` no write.
5. `getBySlug`: trocar o full scan por `findFirst({ where: { slug } })` +
   fallback `findUnique({ id })` (legado).
6. Listagem (`list`): incluir `slug` no select e no retorno; `apps/web` passa a
   usar o slug do servidor em vez de recomputar (`mediaFromList` em `api.ts`).

**Por que não aplicar:** exige migration + backfill testado contra o banco real
(a colisão de slugs muda a URL canônica de títulos homônimos).

---

## Checklist de aplicação (Operador)

1. Subir Postgres de teste em 5434 (docker-compose já parametrizado — T349).
2. Aplicar **T328** só depois do refactor de `media.service.ts` + teste A≠B.
3. Aplicar **T330** após rodar o backfill e conferir slugs colididos.
4. **T327** não é migration — é deploy de `middleware.ts` + ajuste em
   PostHog/Sentry; validar em preview da Vercel antes de `main`.
5. Commits atômicos por item (`security(T328): ...`, `perf(T330): ...`).
