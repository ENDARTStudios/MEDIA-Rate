# CHANGELOG-JURIDICO — alterações desde a última revisão legal

Lista factual das alterações nos documentos canônicos (Termos de Uso e
Política de Privacidade, 3 idiomas) relevantes para a revisão legal de
2026-09-15. Commit de origem do pacote: `467657f`.

## 1. Trial e cobrança

- Trial do plano pago passa a exigir **confirmação afirmativa** do usuário
  antes do início da cobrança; **não há conversão automática** de trial em
  assinatura paga sem ação explícita de checkout.

## 2. Cancelamento de assinatura

- Cancelamento **interrompe a renovação** (nenhuma cobrança futura);
- O acesso aos benefícios do plano persiste **até o fim do ciclo já pago**;
- Ficam ressalvados o **direito de arrependimento** (art. 49 do CDC) e o
  reembolso de **cobranças indevidas**.

## 3. Identificação do fornecedor

- Rodapé e documentos identificam **END ART Studios** com **CNPJ** e canal
  de contato formal.

## 4. Cookies e tecnologias

- A Política traz **tabela de cookies por tecnologia**, com finalidade e
  **base legal declarada** por linha (ex.: estritos = execução de contrato/
  legítimo interesse; analíticos/monitoramento = consentimento).

## 5. Perfil de gosto e IA

- Seções dedicadas ao **perfil de gosto** e ao uso de **IA**, declarando que
  o tratamento é **algorítmico (recomendação por regras/pesos), não IA
  generativa**; finalidade de personalização descrita com base legal
  informada e mecanismo de controle do usuário.

## 6. Menores

- Seção específica sobre **menores de 18 anos**: produto não direcionado a
  crianças; usuários de 14–17 anos com tratamento diferenciado (ver
  `PERGUNTAS-ABERTAS.md`, pergunta 3, sobre fluxo de autorização de
  responsáveis).

## 7. Retenção

- **Prazos de retenção por categoria de dado** (conta, conteúdo de usuário,
  logs, registros de consentimento), com critério de eliminação/anonimização
  ao fim de cada prazo.

## 8. Consentimento granular e auditável

- Consentimento registrado de forma **granular por finalidade** (analytics,
  monitoramento) e **auditável**: cookie `mr_consent` (estado do usuário) +
  tabela `consent_logs` (append-only no banco) + endpoint
  `/consent/history` para acesso pelo titular.
