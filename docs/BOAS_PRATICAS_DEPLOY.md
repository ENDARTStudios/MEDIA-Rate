# Boas práticas — Deploy (Vercel)

> Registro permanente do incidente P0 de 2026-08 (D-385/D-386): um `vercel deploy`
> a partir de `apps/web` usou um vínculo local órfão e sobrescreveu a produção de
> OUTRO projeto (`almanaque-dos-clubes`). O projeto foi recuperado promovendo o
> deploy anterior via `vercel promote`.

## Regra (obrigatória)

1. **NUNCA** executar `vercel deploy` sem antes confirmar o projeto alvo:
   - `vercel link` mostra o projeto vinculado ao diretório atual, ou
   - `vercel inspect <url-do-deploy>` mostra o projeto de um deploy, ou
   - `Get-Content .vercel/project.json` (raiz do monorepo deve ser `media-rate`).
2. Em caso de dúvida, **sempre** rodar `vercel deploy --prod` a partir da **raiz do monorepo**
   (`media-rate` está corretamente vinculado lá), nunca de dentro de `apps/web`.
3. `apps/web/.vercel/project.json` deve apontar para `media-rate`
   (`prj_4cS36A1QBOiM7iInnwPAhSTSAOFm`). Se apontar para outro `projectId`, corrigir.

## Por quê

O repositório teve dois vínculos Vercel simultâneos (raiz → `media-rate`, e
`apps/web/.vercel` → `almanaque-dos-clubes`). O CLI usa o vínculo mais próximo
do diretório corrente — e um `.vercel` órfão em `apps/web` fez o deploy ir para
o projeto errado. `.vercel/` é gitignored (não vai em commit); a proteção é o
**hábito de validar o alvo**, não um arquivo versionado.

## Rollback (se ocorrer de novo)

- `vercel ls` (no diretório do projeto errado) lista o histórico.
- `vercel promote <deployment-url-anterior>` devolve o alias de produção ao
  deploy anterior. Ex.: `vercel promote almanaque-dos-clubes-lsg926irg-end-art-studios.vercel.app`.

## Checklist rápido antes de deploy manual

- [ ] `vercel link` aponta para `media-rate`?
- [ ] `Get-Content .vercel/project.json` mostra `prj_4cS36A1QBOiM7iInnwPAhSTSAOFm`?
- [ ] Rodando a partir da raiz do monorepo?
