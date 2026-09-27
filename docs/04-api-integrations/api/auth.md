# API Auth — MEDIA Rate

## Endpoints

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| `POST` | `/api/v1/auth/register` | Não | Cria conta (FREE + USER role) |
| `POST` | `/api/v1/auth/login` | Não | Autentica e define cookie `sess` |
| `GET` | `/api/v1/auth/me` | Sim | Retorna usuário autenticado |
| `POST` | `/api/v1/auth/logout` | Sim | Revoga sessão + limpa cookie |
| `POST` | `/api/v1/auth/forgot-password` | Não | Solicita reset de senha |
| `POST` | `/api/v1/auth/reset-password` | Não | Confirma reset com token |

## Segurança

- Senhas: argon2id (custo ≥ 12, 19MiB memory)
- Tokens de sessão: opacos 256-bit, SHA-256 no banco
- Cookie: httpOnly, SameSite=Lax, secure em produção
- Lockout progressivo: 5 falhas → 30s, 10 → 2min, 15 → 10min, 20+ → 30min
- Rate limit: 6 req/min em `/auth/*`
- Sliding session: TTL estendido automaticamente nas últimas 24h

## Audit Log

Eventos registrados (imutável, hash SHA-256 encadeado):
- `register` — criação de conta
- `login` — autenticação bem-sucedida
- `logout` — revogação de sessão
- `password_reset_requested` — solicitação de reset
- `password_reset_completed` — reset concluído
