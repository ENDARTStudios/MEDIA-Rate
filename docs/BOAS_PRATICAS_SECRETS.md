# Boas práticas de secrets (MEDIA Rate)

Registrado por **D-344** (2026-08-20), após o incidente do client ID do Google
(typo `539` vs `559`) e da exposição acidental de secrets no transcript.

## Regras obrigatórias

1. **Comparar secrets programaticamente, nunca visualmente.**
   Ao colar um secret (client ID, token, chave), extraia o valor efetivamente
   embarcado (grep no bundle JS, leitura via CLI) e compare com o valor da
   fonte de verdade usando um diff caractere por caractere (ex.: comparar os
   hashes SHA-256 dos dois valores). O olho humano não detecta `539` vs `559`
   quando o restante é idêntico.

2. **Nunca imprimir secrets em transcript/log.**
   Evite `railway variables --json` sem filtro (ele despeja todos os valores,
   inclusive sensíveis). Prefira leitura pontual de UMA variável e, ainda
   assim, nunca imprima o valor — apenas o hash SHA-256 (para auditoria).

3. **Usar `railway variables set` (não `echo`/`cat`).**
   Para escrever secrets, gere o valor dentro do próprio comando (ex.:
   `openssl rand -hex 32` ou `node -e crypto.randomBytes`) e passe diretamente
   ao `railway variables set` — o valor vive só em memória, sem aparecer no
   histórico.

4. **Rotacionar em qualquer exposição.**
   Secret que apareceu em log/transcript/changelog deve ser rotacionado
   imediatamente (NIST SP 800-57). O valor antigo é invalidado e o novo é
   registrado apenas pelo hash SHA-256.

5. **Configuração correta ≠ integração funcionando (D-345).**
   Ter o client_id/segredo "igual ao Console" NÃO prova que a integração
   externa funciona. A única evidência válida de conclusão é o **fluxo real
   de ponta a ponta** (ex.: popup do Google abre + login cria sessão, testado
   em janela anônima). Erros como `401 invalid_client / "The OAuth client was
   not found"` são inequívocos: o valor enviado não existe no provedor —
   reextraia o valor vivo, compare caractere a caractere e corrija a fonte
   divergente; só declare pronto com confirmação do usuário no fluxo real.

6. **Número do projeto ≠ prefixo do client ID (D-347).**
   Em IDs OAuth do Google (`<prefixo>-<sufixo>.apps.googleusercontent.com`),
   o prefixo pode **diferir** do número do projeto (ex.: projeto
   `824768632559`, client `824768632539-…`). Não "corrija" um valor porque
   ele parece divergir do número do projeto — a fonte autoritativa é a
   **página Clientes → "ID do cliente"** (copiado via botão, nunca redigitado).
   IDs parecidos (539 vs 559) são armadilha de leitura visual; usar cópia ou
   extração programática.

7. **Endpoint de auth anônimo novo exige checklist (D-348).**
   Toda rota nova de auth que aceita request SEM sessão deve: (a) entrar na
   allowlist de rotas públicas do `AuthGuard` (`isDefaultPublicPath`), (b)
   ganhar teste de regressão de rota pública no `auth-guard.spec.ts`, e (c)
   ter log de diagnóstico mascarado distinto do erro genérico (o `401
   "Autenticação necessária"` do guard é diferente do `401 "Credencial Google
   inválida"` do validador jose — sem isso, o debug confunde as camadas).

## Procedimento de rotação (exemplo: ADMIN_TOKEN)

```powershell
# 1. Gera 256 bits de entropia (hex, 64 chars) e seta SEM imprimir o valor
$token = (node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))")
$hash  = (node -e "process.stdout.write(require('crypto').createHash('sha256').update(process.argv[1]).digest('hex'))" $token)
railway variables set "ADMIN_TOKEN=$token"
Write-Output "SHA256=$hash"   # só o hash vai para o transcript

# 2. Railway redeploya automaticamente ao mudar variável; senão: railway restart

# 3. Verificação (sem imprimir o valor):
$vars = railway variables --json | ConvertFrom-Json
$actualHash = (node -e "...sha256(argv[1])..." $vars.ADMIN_TOKEN)
# comparar actualHash == hash registrado
```

## Classificação de sensibilidade

- **Rotação obrigatória em exposição:** `ADMIN_TOKEN`, `COOKIE_SECRET`,
  `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `COLUMN_ENCRYPTION_KEY`, `TWITCH_CLIENT_SECRET`.
- **Rotação opcional (chave de leitura pública, sem write/delete):**
  `COMICVINE_API_KEY`, `TMDB_API_KEY`, `OMDB_API_KEY`, `OPENCRITIC_API_KEY`,
  `GOOGLE_BOOKS_API_KEY`, `TWITCH_CLIENT_ID` — verificar as permissões do
  provedor antes de decidir.
- **Público (pode circular, nunca o segredo):** client IDs OAuth
  (`GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`), `NEXT_PUBLIC_*`.
