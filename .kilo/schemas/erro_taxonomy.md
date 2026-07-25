# Schema: Taxonomia de Erros
## Classificação padronizada de falhas para STATUS BLOCKED

### Categorias

| Código | Categoria | Descrição |
|---|---|---|
| `ENVIRONMENT` | Ambiente | Falta de recursos (disco, RAM, rede), permissões, SO incompatível |
| `DEPENDENCY` | Dependência | Pacote não encontrado, versão incompatível, conflito de peer dependencies |
| `BUILD` | Compilação | Erro de TypeScript, bundler, transpilação, ou parsing |
| `RUNTIME` | Execução | Erro em tempo de execução (crash, exceção não tratada) |
| `TEST` | Teste | Falha em teste automatizado (unit, integration, e2e) |
| `SECURITY` | Segurança | Vulnerabilidade detectada, segredo exposto, violação de política |
| `DATA` | Dados | Dados corrompidos, migração falhou, schema inconsistente |
| `NETWORK` | Rede | Timeout, DNS, conexão recusada, API externa indisponível |
| `PROTOCOL` | Protocolo | Violação do formato de comunicação Thinker-Doer |
| `EXTERNAL` | Externo | Falha em serviço terceiro (API key inválida, rate limit, quota) |

### Subcategorias Comuns

#### ENVIRONMENT
- `ENOSPC`: Sem espaço em disco
- `EPERM`: Permissão negada
- `ENOENT`: Arquivo/diretório não encontrado

#### DEPENDENCY
- `ERESOLVE`: Conflito de dependência
- `ENOTFOUND`: Pacote não encontrado no registry

#### BUILD
- `TS_ERROR`: Erro de TypeScript
- `PARSE_ERROR`: Erro de parsing de arquivo

#### SECURITY
- `GITLEAKS`: Segredo detectado no código
- `AUDIT_HIGH`: Vulnerabilidade high/critical no npm audit

### Regras de Uso
1. `erro_codigo` deve usar uma das categorias acima como prefixo (ex: `ENVIRONMENT:ENOSPC`)
2. `erro_mensagem` deve descrever o erro em português claro
3. `erro_stack` deve incluir o stack trace completo, truncado se > 500 linhas
