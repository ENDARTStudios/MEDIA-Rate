# Schema: REVIEW
## Revisão do Thinker sobre STATUS do Doer

### Campos Obrigatórios
| Campo | Tipo | Descrição |
|---|---|---|
| `review_id` | string | Identificador único (ex: R001-api-core) |
| `tarefa_id` | string | ID da tarefa sendo revisada |
| `fase` | string | Fase correspondente |
| `resultado` | "APPROVED" \| "REJECTED" \| "BLOCKED" | Decisão da revisão |

### Gates (Checklist de Verificação)
| Gate | Estado | Descrição |
|---|---|---|
| `schema_valido` | "pass" \| "fail" \| "na" \| "skipped_com_justificativa" | STATUS segue o formato do schema? |
| `evidencia_real` | "pass" \| "fail" \| "na" \| "skipped_com_justificativa" | A evidência é concreta e verificável? |
| `testes` | "pass" \| "fail" \| "na" \| "skipped_com_justificativa" | Testes passaram? |
| `lint` | "pass" \| "fail" \| "na" \| "skipped_com_justificativa" | Lint limpo? |
| `typecheck` | "pass" \| "fail" \| "na" \| "skipped_com_justificativa" | TypeScript OK? |
| `audit` | "pass" \| "fail" \| "na" \| "skipped_com_justificativa" | npm audit limpo? |
| `sast` | "pass" \| "fail" \| "na" \| "skipped_com_justificativa" | Análise de segurança estática? |
| `gitleaks` | "pass" \| "fail" \| "na" \| "skipped_com_justificativa" | Nenhum segredo exposto? |
| `protocol_integrity` | "pass" \| "fail" \| "na" \| "skipped_com_justificativa" | DECISOES.md e worklog.md atualizados? |
| `ci_green` | "pass" \| "fail" \| "na" \| "skipped_com_justificativa" | CI pipeline verde? |
| `seguranca` | "pass" \| "fail" \| "na" \| "skipped_com_justificativa" | Controles de segurança aplicados? |
| `redteam` | "pass" \| "fail" \| "na" \| "skipped_com_justificativa" | Red team review? |
| `premortem` | "pass" \| "fail" \| "na" \| "skipped_com_justificativa" | Análise de risco pré-mortem? |

### Campos Opcionais
| Campo | Tipo | Descrição |
|---|---|---|
| `evidencias` | object[] | Lista de evidências coletadas `[{ tipo, valor }]` |
| `commit` | string | Hash do commit revisado |
| `notas` | string | Observações da revisão |

### Regras de Validação
1. `resultado: "APPROVED"` exige todos os gates aplicáveis como "pass"
2. `resultado: "REJECTED"` deve incluir `notas` com justificativa
3. Gates `skipped_com_justificativa` exigem o campo `justificativa`
