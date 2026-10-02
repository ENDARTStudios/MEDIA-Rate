# PERGUNTAS-ABERTAS — revisão legal 2026-09-15

Perguntas ao parecerista. Contexto completo nos PDFs deste pacote e em
`CHANGELOG-JURIDICO.md`.

---

## 1. Endereço físico vs Decreto 7.962/2013 (CDC — e-commerce)

Os documentos informam a localidade **"Osasco, São Paulo — Brasil"** como
referência do fornecedor. O Decreto 7.962/2013 exige, no site, informações
completas do fornecedor. Como devemos tratar o endereço?

**Opções em avaliação (NÃO inventaremos dado):**
- (a) endereço cadastral completo do CNPJ;
- (b) domicílio empresarial (cidade/UF já exibida + CNPJ consultável);
- (c) canal formal de contato satisfazendo o Decreto, sem endereço físico.

**Pergunta:** qual das opções atende o Decreto sem expor dado desnecessário?

## 2. Base legal do perfil avançado (Premium) com opt-out sem perda de função básica

O **perfil de gosto** (algoritmo de recomendação, ver CHANGELOG §5) é
tratado como diferencial do plano Premium. A base legal adotada é
**consentimento com opt-out** em que a retirada não remove funções básicas
do produto. Pergunta: essa composição (legitimidade da personalização paga
com opt-out parcial, mantendo núcleo funcional) está robusta à leitura da
LGPD/ANPD, ou recomendam outro arranjo (ex.: legítimo interesse com balanceamento documentado)?

## 3. Autorização de responsáveis para usuários de 14–17 anos

Para usuários **14–17 anos** nos fluxos **pagos** e de **personalização**,
qual fluxo de autorização de responsável o parecer recomenda (verificação
documental, consentimento por e-mail do responsável, ou outro mecanismo
proporcional), considerando que o produto não é direcionado a crianças e a
seção de menores já está na Política?

## 4. Transferências internacionais — redação por operador vs Resolução CD/ANPD nº 19/2024

A Política redige as transferências internacionais na perspectiva de
**operador** (ferramentas de infraestrutura terceirizadas, ex.:
monitoramento de erros). A redação atual atende a **Resolução CD/ANPD nº
19/2024** (escopo, salvaguardas e documentação), ou recomendam cláusula
específica (ex.: cláusulas-padrão contratuais por fornecedor)?

---

## Resolvidas por configuração (sem alteração de texto)

- **Envio de dados de erro (Sentry) com dados pessoais?** Resolvido por
  configuração da ferramenta, **decisão D-499**: privacidade em nível de
  organização com **scrubbing de dados obrigatório, sem coleta de endereços
  IP e enhanced privacy controls** ativados. O fornecedor não recebe IP dos
  titulares nem conteúdo livre de eventos de erro.
