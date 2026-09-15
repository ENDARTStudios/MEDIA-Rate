# scripts/verify-prod/ — verificações MANUAIS contra deploy real (T462/D-493)

Estes specs **NÃO são testes de CI**. Foram triados do corpus `e2e/` no
T462: têm valor como verificação manual pontual (evidência visual, paridade
de busca, fluxo de checkout real), mas dependem de ambiente deployado e
nunca devem apontar para produção com dados reais de usuários.

## Uso

```bash
cd apps/web
E2E_BASE_URL=https://mediarate.app \
  npx playwright test -c scripts/verify-prod/playwright.verify.config.ts \
  scripts/verify-prod/<arquivo>.spec.ts
```

- `E2E_BASE_URL` aponta para **staging ou preview** por padrão de higiene;
  produção só com conta de teste e ciência do Operador.
- Credenciais, quando o spec autentica, vêm de env (`E2E_TEST_EMAIL`,
  `E2E_TEST_PASSWORD`) — nunca commitadas.

## Arquivos

| Script | O que verifica |
|---|---|
| `search-topo.spec.ts` | Paridade de busca no topo: `acao` (sem acento) e `ação` retornam o mesmo conjunto no /discover |
| `screenshot-paleta.spec.ts` | Evidência visual da paleta de ação (D-244) |
| `t246-ctrlk.spec.ts` | Paleta de busca Ctrl+K (T246) |
| `teste-fechado.spec.ts` | Varredura dos 11 fluxos do teste fechado (T079) |
| `trial-checkout.spec.ts` | Fluxo real de checkout/trial (Stripe) |

`playwright.verify.config.ts` existe para que estes specs rodem fora do
`testDir` da suíte principal (retries=0, sem reporters de CI).
