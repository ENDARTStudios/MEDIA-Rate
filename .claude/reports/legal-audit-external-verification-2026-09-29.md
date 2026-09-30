# Verificação da auditoria jurídica externa — 2026-09-29 (T151)

Auditoria jurídica externa (recebida do Operador) foi verificada **contra o
código real** (`main` @ 1fae3d00) e contra **produção** (mediarate.app — que a
auditoria externa não conseguiu acessar). Este relatório registra verificado/
refutado/ampliado por achado, com referências exatas.

## Veredito por achado (material/verificável)

| ID | Claim externa | Veredito | Evidência |
|---|---|---|---|
| J-001 (P0) | Política declara column encryption não implementada | **CONFIRMADO** | `apps/web/src/messages/pt-BR.json:727` (s7b, nas 3 línguas) promete "criptografia de campos sensíveis (column encryption)"; D-557/T137/P017 registram cifragem **adiada pós-Beta** e `ColumnEncryptionService` sem wiring |
| J-002 (P0) | Exclusão +30 dias prometida, worker inexistente | **CONFIRMADO** | `lgpd.service.ts:154`: "Após prazo, job executa DELETE em cascata (**implementar em tarefa futura**)"; sem `@Cron`/`@Interval` em apps/api; nenhum código executa DELETE por `dados_para_exclusao_at` (só contagens em admin/diagnostics) |
| J-003 (P1) | Termos citam Apple login sem implementação | **CONFIRMADO** | Termos §3.5 (`pt-BR.json:751`) "(Google, Apple)"; `google-auth.service.ts:15`: "Apple foi adiada (custo do Developer Program) — D-335"; chave i18n `continueWithApple` existe sem backend |
| J-005 (P1) | Inventário de cookies omite `mr_consent` | **CONFIRMADO E AMPLIADO** | Política lista sess/refresh/mr_auth/ph_/Sentry/Google/Stripe mas omite **4 cookies reais**: `mr_consent` (use-consent-store), `x-mr-uid` (middleware.ts:30, bucket D-507), `mediarate_watchlist` (CarouselInteractions:69), `NEXT_LOCALE` (next-intl); e lista "Sentry SDK" como cookie **não observado** em produção |
| J-013 (P2) | LICENSE diz "confidential" em repo público | **CONFIRMADO** | `LICENSE:5` "proprietary and confidential" |
| J-014 (P2) | Datas divergentes Política × Termos | **CONFIRMADO** | Política: "30 de julho de 2026" (`pt-BR.json:707`); Termos: "13 de agosto de 2026 · Versão: 1.0" (`:745`) |
| J-015 (P1 validação) | Cookies Sentry/produção não validados | **FECHADO COM PRODUÇÃO** | Verificação live 2026-09-29 (aba limpa, pré-consentimento): cookies reais = `x-mr-uid`, `mr_consent {analytics:false, monitoring:false, v:2, ts, lang, country}`, `mediarate_watchlist=[]`, `NEXT_LOCALE`; localStorage `mr_consent_v2`. **Zero cookies ph_\*** (analytics recusado → PostHog no-op ✓) e **zero cookies Sentry** (o item "cookie Sentry" da Política não se observa — inventário impreciso nos dois sentidos) |

Não re-verificados linha a linha (lacunas documentais/governança pura — triagem
do Operador com gate legal): J-004 (endereço), J-006/J-007 (art. 18/portabilidade),
J-008 (retenção), J-009 (transferências), J-010 (encarregado), J-011 (menores),
J-012 (licenças de fontes).

## Observação sobre LGPD/consentimento (positivo, validado em produção)

Sem consentimento: nenhum cookie de analytics/monitoring é gravado (`ph_*`
ausente); o consentimento negado é persistido (`mr_consent` false/false) —
postura correta e auditável.

## Caminhos de correção (decisões em PENDENCIAS_OPERADOR §T151)

- **J-001**: corrigir o texto s7b nas 3 línguas (remover a promessa de column
  encryption até D-557 reverter) — **gate legal do Operador** (AGENTS.md veda
  alteração de texto legal pelo agente). Alternativa: antecipar cifragem
  (contraria D-557).
- **J-002**: (A recomendado) **implementar o worker de eliminação** (tarefa de
  código: job diário que executa o DELETE em cascata após
  `dados_para_exclusao_at`, conforme MATRIZ-PROPAGACAO-OPERADORES.md, com
  testes) — mantém a promessa da Política; ou (B) alterar o texto (gate legal).
- **J-003**: remover Apple do §3.5 + tratar `continueWithApple` (gate legal;
  backend já documenta D-335).
- **J-005/J-015**: atualizar inventário com os 4 cookies reais + corrigir o
  item Sentry (gate legal).
- **J-013/J-014**: LICENSE sem "confidential"; reversionar a Política quando os
  ajustes materiais entrarem (gate legal).

---

# Adendo T152 — segunda auditoria externa: novos achados verificados (2026-09-30)

Segunda auditoria externa (commit 631c5072) confirmou T151 e adicionou
J-016..J-020. Verificação própria:

| ID | Claim | Veredito | Evidência |
|---|---|---|---|
| J-016 (P1) | Resend trata e-mail e não consta na Política | **CONFIRMADO** | `apps/api/src/modules/mailer/resend-mail.transport.ts` + `mailer.module.ts:22-23` (MAIL_PROVIDER=resend + RESEND_API_KEY); política não lista Resend (as 4 ocorrências "resend" em pt-BR.json são chaves de UI `verifyResend*` = "Reenviar link", falso positivo verificado) |
| J-017 (P1) | PostHog recebe user.id mas Política diz "anônimo" | **CONFIRMADO** | `PostHogProvider.tsx:61` `posthog.identify(user.id, { plan })` (comentário T452: "sem PII — apenas id + plano"); Política usa "anonimizado(s)" (linhas 711/721/723). Tecnicamente: **pseudonimizado**, não anônimo; mitigação real (e-mail/nome não enviados) |
| J-018 (P1) | Sentry pode receber user.id; Política diz "anonimizados" | **CONFIRMADO** | `apps/api/src/common/sentry.ts:67-68` (`sendDefaultPii: false`, "identificação explícita via user.id (não email)") e `:144` (`out.user = { id }`); redaction web em `sentry-redact.ts`. Controles bons; claim jurídico excessivo |
| J-020 (P2) | Aceite dos Termos grava timestamp, não versão | **CONFIRMADO** | `schema.prisma:105` só `termos_aceitos_em`; sem campo de versão |
| J-019 | Item de teste R2 no catálogo público | **Já registrado** | = B1 (T146) + reforço T150 (1ª URL de mídia do sitemap) |

## Proposta: revisão jurídica CONSOLIDADA (uma única autorização de gate)

Os ajustes de texto se acumulam nos mesmos documentos. Em vez de edições
parceladas, propõe-se **um ciclo único de revisão jurídica** que o Operador
autoriza e o agente executa num PR, cobrindo: J-001 (remover claim de
encryption), J-003 (remover Apple), J-005 (inventário de cookies real: 4
próprios + corrigir Sentry), J-016 (incluir Resend como operador),
J-017/J-018 ("anônimo" → "pseudonimizado/identificador interno"), J-006/J-007
(art. 18 completo + separar acesso de portabilidade), J-004 (endereço), J-010
(encarregado), J-013 (LICENSE), J-014 (reversionar Política). Em paralelo, duas
tarefas de CÓDIGO não dependem do gate: **worker de eliminação (J-002-A)**
e **`terms_version_accepted` (J-020)** — schema+migration (pede label
`migration-review`).
