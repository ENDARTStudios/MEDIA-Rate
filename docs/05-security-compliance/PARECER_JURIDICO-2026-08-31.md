# Parecer Jurídico Preliminar — MEDIA Rate (2026-08-31)

> **Classificação:** documento de trabalho. Revisar com advogado habilitado antes
> de publicar ou usar como instrumento contratual.
> **Advertência:** análise/minuta de IA (não advogado) — não é aconselhamento
> jurídico formal. Origem: revisão pública de mediarate.app (Termos, Privacidade,
> Metodologia, Planos, fluxo de dados).

## 1. Conclusão executiva (risco atual: ALTO)

A documentação tem boa intenção (arrependimento reconhecido, LGPD citada,
fornecedores listados), mas **não está pronta para publicação** como conjunto
contratual/regulatório. Os riscos não vêm de uma cláusula, mas da combinação de:

1. **Identidade empresarial incompleta/divergente** — Termos usam placeholders
   (CPF/CNPJ, endereço, foro, contato); Privacidade identifica pessoa física
   ("45.370.930 EDINALDO SOARES DA SILVA"); rodapé usa "END ART Studios". Em
   contratação eletrônica, fornecedor/endereço/canais devêm estar claros (CDC;
   Decreto 7.962/2013). **P0.**
2. **Propriedade intelectual e licenciamento de fontes** — "APIs públicas
   gratuitas" ≠ licença comercial para republicar imagens/sinopses/avaliações/
   marcas/bases derivadas. TMDB exige acordo escrito p/ uso comercial;
   IMDb limita a não comercial; IGDB distingue uso não comercial de parceria.
   **P0 — bloqueante para planos pagos e IA.**
3. **Proteção de dados** — bases legais em bloco; sem matriz por finalidade;
   encarregado/canal ausente; perfil de gosto/insights/IA não explicados;
   transferências ("cláusulas-padrão quando aplicável") insuficientes frente à
   Resolução CD/ANPD 19/2024; retenção de 6 anos sem justificativa. **P1.**

## 2. Divergências P0/P1 (tabela de correção)

| Tema | Evidência | Risco | Correção | Prioridade |
|---|---|---|---|---|
| Identidade do fornecedor | placeholders nos Termos; pessoa física na Privacidade; "END ART Studios" no rodapé | invalidade de informação/atendimento | definir fornecedor único; nome empresarial/civil + CPF/CNPJ + endereço + e-mail + canais | **P0** |
| Escopo de categorias | home afirma 6 categorias; /about alterna 3 e 6 | publicidade potencialmente enganosa | matriz por categoria (disponível/fontes/fórmula/limitações) | **P0** |
| Fontes de dados | home "14 fontes"; metodologia lista 14 com duplicidades | licença/atribuição | registro por fonte (finalidade, campos, licença, território, cache, atribuição) | **P0** |
| Método do score | pesos 40/40/20 e 55/35/10 divulgados; fórmula Bayesiana/realimentação não reproduzível | transparência contestável | especificação técnica resumida (sem segredo industrial) | P1 |
| Planos e preço | "$" sem moeda; preço final/tributos ausentes; trial converte automático | dever de informação/cobrança contestável | R$ + total + tributos + periodicidade + renovação + pós-trial + cancelamento antes do clique | **P0** |
| Dados do usuário | /user/data público exibe login; Política promete exportação/exclusão | direito prometido sem fluxo | painel autenticado + canal manual com protocolo/prazos | P1 |
| Retenção | "exclusão 30 dias" + "logs 6 anos" sem discriminar | retenção excessiva | tabela por dado/finalidade/base/evento/descarte/backup/obrigação | P1 |
| Internacional | "EUA/UE + cláusulas-padrão quando aplicável" | mecanismo indeterminado | país/importador/mecanismo LGPD/ANPD/subprocessador/salvaguardas | P1 |
| IA e perfil | Premium tem Assistente IA + perfil de gosto + insights; Política não explica | profiling/automatização não informada | aviso específico (dados, finalidade, retenção, revisão humana, opt-out, sem decisões sensíveis) | P1 |

## 3. Alterações urgentes (Termos + checkout — trial)

- **5.1** Planos/preço: sumário obrigatório antes da confirmação (plano,
  recursos, preço total, moeda, tributos, periodicidade, renovação, 1ª cobrança,
  trial, meios, cancelamento, reembolso/arrependimento). pt-BR → R$.
- **5.2** Stripe: MEDIA Rate permanece responsável pela oferta/cobrança/
  cancelamento/arrependimento; usuário também sujeito aos termos do processador.
- **5.3** Arrependimento (art. 49 CDC): mesmo canal da contratação, confirmação
  imediata, estorno.
- **5.4/5.5** Trial: **menor risco = sem conversão automática** (confirmação
  afirmativa destacada; sem confirmação → volta ao Free). Alternativa = conversão
  automática com autorização destacada + checkbox desmarcado + lembrete
  pré-cobrança com valor/data/link de cancelamento.
- **5.6** Autorização de renovação recorrente (campo próprio, sem pré-seleção).
- **5.7** Falha de pagamento: aviso + prazo de regularização; sem cobrança
  incompatível; suspensão não apaga dados sem aviso/exportação.
- **11–13** Inadimplência/encerramento/aceitação tácita/48h: alinhar com
  proporcionalidade, aviso, recurso, sem presunção de consentimento; alteração
  material → cancelável sem multa.
- **Checkout A–B:** oferta → trial explícito → autorização recorrente separada →
  links Termos/Privacidade → sumário final → confirmação → lembrete → cancelamento
  mesmo fluxo → pós-cancelamento sem apagar dados sem respeito à retenção.

## 4. IA, perfil de gosto e assistente (controles)

- Perfil = personalização de **baixo impacto**: reversível, sem efeitos jurídicos,
  sem crédito/preço individual/elegibilidade/emprego/seguro/saúde/direitos; sem
  dados sensíveis; apagável; explicável; IA recebe contexto mínimo.
- Proibido criar/exibir perfil sobre religião, política, saúde, orientação sexual,
  origem (mesmo inferido). Prompt: não enviar dados sensíveis/de terceiros;
  minimização + pseudonimização; DPA com provedor; sem treinamento sem base;
  retenção curta; versão do modelo documentada.
- Decisões automatizadas: recomendações são de baixo impacto; se houver decisão
  relevante automatizada → lógica + revisão humana + contestação.
- Menores: Termos dizem 14+ mas sem controles; recomendado: 18+ para planos pagos,
  gate de idade, bloqueio de recursos avançados para menores.
- Viés: testes por idioma/país/categoria; canal de correção; não prometer
  neutralidade absoluta.

## 5. Política de Privacidade (reestruturação) + Privacy Center

- Substituir narrativa por **matriz de tratamento** (dados × fonte × finalidade ×
  base × destinatários × transferência × retenção × direitos).
- Seções obrigatórias: identidade/controlador, escopo territorial, dados
  (fornecidos/observados/inferidos/terceiros), finalidades separadas, bases
  legais, perfil/IA, compartilhamento (Stripe/Vercel/Railway/e-mail/login/IA/
  analytics/suporte), transferências, cookies, retenção, segurança, direitos,
  atendimento, menores, alterações.
- **Privacy Center**: banner Aceitar/Recusar/Gerenciar equivalentes (sem dark
  patterns); categorias separadas (necessários/preferências/analytics/perfil/marketing/IA);
  toggle próprio de personalização/IA; registro de consentimento auditável
  (versão, timestamp, país/idioma, categorias, ação); revogação tão fácil quanto
  aceitar; bloqueio prévio de tags opcionais.

## 6. Retenção e exclusão de perfis inativos (ciclo de vida)

- Tabela de retenção por categoria (conta/auth, cadastro, watchlist/histórico,
  perfil/inferências, prompts IA, contestação, consentimentos, assinatura,
  logs, suporte, backups, métricas) — prazo + evento + destino + exceções.
- Inatividade (proposta): 12m aviso informativo → 17m pré-exclusão → 18m
  PENDING + 30d recuperação → exclusão idempotente. Sem contar e-mail aberto/
  eventos automáticos. **Nunca** excluir conta paga, com disputa, legal hold,
  pedido de direitos, investigação.
- Ordem de exclusão: sessões/tokens → marketing/perfil → embeddings/features →
  prompts/caches IA → watchlist/histórico → conta/login → operadores → transações/
  logs (segregado) → estado DELETED + relatório.
- Idempotência, retry/backoff, alertas; sem rollback reconstruindo dados apagados.

## 7. Plano de implementação (do parecer)

| Prazo | Medida |
|---|---|
| 0–7 d | placeholders → dados reais; harmonizar fornecedor/marca/contatos (Termos/rodapé/checkout); corrigir moeda/tributos/trial/renovação/cancelamento |
| 0–14 d | matriz pública de categorias × fontes; auditoria de licenças TMDB/IMDb/IGDB/Rotten/Steam/etc. |
| 0–21 d | Política de Privacidade reestruturada + tabela de retenção + transferências; painel de exportação/exclusão com protocolo |
| 15–30 d | políticas de cookies, conteúdo de usuário, moderação, IA |
| 30–60 d | metodologia documentada (exemplos/changelog/correção); RIPD/DPIA proporcional |
| 60–90 d | estratégia UE/EUA (suplementos ou limitar mercados) + decisão documentada |

## 8. Checklist de aceite (resumo)

Consumidor sabe quem contrata? Preço claro (R$/total/tributos/trial/renovação)?
Arrependimento exercitável (mesmo canal)? Oferta = produto (categorias/fontes)?
Usuário controla dados (acesso/correção/oposição/exclusão/portabilidade)?
Perfil/IA transparente? Transferências legais (países/mecanismo/ANPD)? Dados de
terceiros licenciados? Moderação previsível? Coerência PT/EN/ES?

## 9. Referências

[1] Lei 8.078/1990 (CDC) · [2] Decreto 7.962/2013 · [3] Lei 13.709/2018 (LGPD) ·
[4] Lei 12.965/2014 (Marco Civil) · [5] ANPD · [6] Resolução CD/ANPD 19/2024 ·
[7] TMDB ToS · [8] IMDb · [9] IGDB · [10] GDPR · [11] Diretiva (UE) 2019/770 ·
[12] DSA
