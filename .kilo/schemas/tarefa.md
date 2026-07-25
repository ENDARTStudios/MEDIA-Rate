# Schema: TAREFA
## Protocolo de handoff entre Thinker e Doer

### Campos Obrigatórios
| Campo | Tipo | Descrição |
|---|---|---|
| `tarefa_id` | string | Identificador único (ex: T000-setup-inicial) |
| `fase` | string | Fase do projeto (ex: F01-api-core) |
| `objetivo` | string | Descrição clara do que deve ser executado |
| `arquivos_afetados` | string[] | Lista de paths relativos que serão modificados |
| `depende_de` | string[] | IDs de tarefas que devem estar concluídas antes |
| `restricoes` | string[] | Regras que NÃO podem ser violadas |
| `criterio_de_pronto` | string | Condição objetiva para considerar concluída |
| `verificacao` | string | Comando ou procedimento para validar |
| `risco` | "baixo" \| "medio" \| "alto" \| "critico" | Nível de risco da tarefa |

### Campos Opcionais
| Campo | Tipo | Descrição |
|---|---|---|
| `paralelizavel` | boolean | Se pode rodar em paralelo com outras tarefas (default: false) |
| `requires_tdd` | boolean | Se exige TDD antes da implementação (default: false) |
| `seguranca` | object | `{ aplicavel: boolean, controles: string[] }` |
| `resultado_esperado` | string | Descrição do estado final esperado |
| `responsavel` | "Doer" \| "Thinker" | Quem executa esta tarefa |

### Regras de Validação
1. `tarefa_id` deve seguir o padrão `T<numero>-<descricao-curta>`
2. `fase` deve corresponder a uma fase existente no PLANO_MESTRE.md
3. `depende_de` não pode conter a própria tarefa (circular)
4. `risco` "critico" exige aprovação explícita do Operador
5. `arquivos_afetados` não pode conter paths fora do workspace
