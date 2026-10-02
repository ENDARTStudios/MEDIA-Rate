# DEFINE_THE_USER — Personas e papéis

## Usuários finais (produto)

| Persona | Quem é | O que faz no produto |
|---|---|---|
| **Visitante** | Navegador anônimo | Browse público: home, discover, busca, página de obra; login/cadastro |
| **Free** | Usuário cadastrado | Watchlist (limite 50), biblioteca 4-status, dashboard com **4 previews** gated (T402) |
| **Plus** | Assinante (ou trial) | **2 previews** na dashboard; radar/taxonomia Plus |
| **Premium** | Assinante | Sem previews; pulso/evolução de gosto completos |
| **Curador/Admin** | Equipe | CRUD de mídia/score, upload R2, curadoria, flags, `/admin/stats`, alertas |
| **Titular LGPD** | Qualquer usuário | Export/exclusão de dados, consentimento granular (T432), revogação |

**Gating canônico da dashboard (T402):** radar/taxonomia=Plus, evolução/pulso=Premium →
**Free=4 previews, Plus=2, Premium=0**. Demo rotulada com `demoBadge` (F17) —
convenção real-vs-demo: sem dado → "—", nunca inventar número.

## Papéis internos (operação)

| Papel | Quem | Responsabilidade |
|---|---|---|
| **Operador** | Dono do produto | Decisões de infra/secrets/legal (PENDENCIAS_OPERADOR.md), produção, rotação de segredos |
| **Thinker** | Agente de planejamento | Emite TAREFAs com escopo/critérios/restrições; aprova com REVIEW |
| **Doer** | Agente executor | Implementa com TDD/evidência; abre PR; reporta STATUS; NUNCA mergeia sem autorização |
| **Auditor/Revisor** | Review sênior | Audita diff, exigências de segurança/contrato antes de merge |

## Papéis no banco (RBAC)

`usuario` + `roles`/`user_roles` (USER, ADMIN/CURADOR) + planos via `usuarioPlano`
(FREE/PLUS/PREMIUM). Guards: `AuthGuard` (sessão), `RolesGuard` (`@Roles`),
`PlanGuard` (`@RequirePlan`). Permissions granulares: postergadas (PLANO 2.4).
Verificação de e-mail obrigatoria no login (403 `EMAIL_NOT_VERIFIED`).
