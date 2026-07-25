# Schema: STATUS
## Resposta do Doer após execução de tarefa

### Campos Obrigatórios
| Campo | Tipo | Descrição |
|---|---|---|
| `tarefa_id` | string | ID da tarefa executada |
| `fase` | string | Fase correspondente |
| `status` | "DONE" \| "BLOCKED" \| "IN_PROGRESS" | Estado da execução |
| `evidencia` | object | `{ tipo: string, resumo: string, dados: object }` |
| `arquivos_alterados` | string[] | Lista de arquivos efetivamente modificados |

### Campos para BLOCKED
| Campo | Tipo | Descrição |
|---|---|---|
| `erro_codigo` | string | Código do erro conforme erro_taxonomy.md |
| `erro_mensagem` | string | Descrição detalhada do bloqueio |
| `erro_stack` | string? | Stack trace (se aplicável) |

### Campos Opcionais
| Campo | Tipo | Descrição |
|---|---|---|
| `commit` | string | Hash do commit gerado |
| `metricas` | object | `{ inicio_utc, fim_utc, duracao_minutos }` |
| `proxima_acao` | string | Próximo passo recomendado |
| `responsavel` | "Thinker" \| "Operador" | Quem deve agir em seguida |

### Regras de Validação
1. `status: "DONE"` exige `evidencia.dados` não vazio
2. `status: "BLOCKED"` exige `erro_codigo` e `erro_mensagem`
3. `arquivos_alterados` deve conter apenas paths reais do workspace
4. `commit` deve ser um hash git válido (7-40 caracteres hex)
