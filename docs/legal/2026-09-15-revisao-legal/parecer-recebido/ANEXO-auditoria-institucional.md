# MEDIA Rate — auditoria atualizada de Termos, Privacidade e páginas institucionais

**Data da verificação:** 1º de setembro de 2026, GMT−3  
**URLs analisadas:** `/pt-BR/privacy`, `/pt-BR/terms`, `/pt-BR/about` e `/pt-BR`.

> **Ressalva jurídica:** sou uma IA, não um advogado. O que segue é uma análise de trabalho, não parecer jurídico formal. A equipe da MEDIA Rate/END ART Studios deve validar a versão final com advogado habilitado no Brasil e, se houver direcionamento a usuários europeus, com profissional familiarizado com GDPR e contratos digitais na UE.

## Conclusão executiva

**Não é possível afirmar que o conjunto atual esteja plenamente adequado.** A Política de Privacidade melhorou em relação à versão anteriormente observada, especialmente ao identificar a END ART Studios, mencionar a ANPD e descrever medidas de segurança e transferências internacionais. Contudo, permanecem falhas materiais nos Termos e divergências entre páginas que devem ser corrigidas antes de tratar o site como juridicamente consistente.

Os riscos prioritários são: **(P0) Termos publicados com placeholders de fornecedor, CNPJ/CPF, endereço e contato; (P0) trial com conversão automática em assinatura paga sem preço, moeda, periodicidade, data e fluxo de cancelamento detalhados; (P0) divergência sobre “grátis para sempre”, categorias cobertas, catálogo e cancelamento; (P1) Política que não descreve IA, perfil de gosto, prompts, recomendações, cookies por fornecedor, prazos por categoria ou procedimento concreto de contestação; (P1) cláusula de aceitação tácita e presunção de recebimento; e (P1) afirmação de que “APIs públicas gratuitas” autorizariam uso de conteúdo, sem prova de licença individual.

A legislação brasileira exige informação clara, adequada e ostensiva nas relações de consumo e no comércio eletrônico, incluindo identificação do fornecedor, condições da oferta, preço, restrições, sumário contratual, atendimento, cancelamento e exercício do arrependimento [1] [2]. A LGPD exige finalidade, adequação, necessidade, transparência, segurança, prevenção, não discriminação e responsabilização, além de direitos do titular [3]. O Marco Civil impõe regras específicas sobre registros e exclusão ao término da relação, ressalvadas hipóteses legais de guarda [4].

## 1. Escopo e limitações da verificação

A verificação foi feita sobre o conteúdo público retornado pelas URLs indicadas. A página inicial `/pt-BR` foi parcialmente truncada na extração, embora tenha sido possível verificar seus claims principais, planos, categorias, números de catálogo e FAQ. Não foi realizado login, contratação, fornecimento de cartão, teste de cancelamento, exercício real de exportação/exclusão, inspeção de headers/cookies de uma sessão autenticada, nem auditoria de contratos com Stripe, Vercel, Railway, fontes de catálogo ou provedores de IA.

Assim, os achados abaixo são divididos entre **falhas textuais diretamente visíveis** e **pontos que precisam de validação técnica/contratual**. Uma política correta no papel não substitui prova de que o fluxo efetivamente bloqueia cookies, cancela cobrança, exclui dados e propaga pedidos aos operadores.

## 2. Achados críticos nos Termos de Uso

| Prioridade | Local | Achado atual | Risco | Correção imediata |
|---|---|---|---|---|
| P0 | 1.1 | “pessoa [física/jurídica]”, “[CPF/CNPJ]” e “[endereço completo]” | Contrato incompleto e falha de identificação do fornecedor | Preencher nome jurídico/civil, CPF/CNPJ, endereço físico, e-mail e canal de atendimento |
| P0 | 5.5 | Trial “converte-se automaticamente em Assinatura paga” | Cobrança surpresa, chargeback, alegação de oferta enganosa/consentimento deficiente | Preferir confirmação afirmativa após trial; alternativamente, checkout destacado com preço, moeda, data, periodicidade e cancelamento |
| P0 | 5.1 | Preços remetidos genericamente à página de Planos | Oferta pode mudar sem incorporar preço/moeda/tributos ao aceite | Repetir no checkout e confirmação: plano, preço total, moeda, tributos, periodicidade e renovação |
| P1 | 5.4 | Cancelamento “ao final do ciclo” e “sem reembolso proporcional” | Pode conflitar com arrependimento, cobrança indevida, falha da oferta ou cancelamento de renovação | Separar cancelamento de renovação, cancelamento imediato, estorno legal e reembolso por cobrança indevida |
| P1 | 5.3 | Arrependimento correto em linhas gerais, mas sem fluxo e confirmação | Direito pode ser inexequível se não houver botão/canal simples | Permitir pelo mesmo ambiente da contratação, emitir protocolo e interromper cobrança futura |
| P1 | 11.1(c) | Inadimplência prevê tentativas de cobrança, mas não prazo nem limites | Suspensão ou nova tentativa incompatível com cancelamento | Informar prazo, número/critério de tentativas, suspensão proporcional e bloqueio após cancelamento |
| P1 | 12.1 | Comunicações presumem-se recebidas em 48h | Não deve criar consentimento, renúncia ou validar cobrança sem prova de comunicação | Tratar como regra operacional, não como presunção absoluta de ciência ou aceite |
| P1 | 13.2 | Uso continuado é aceitação tácita de mudanças | Vulnerável em alterações materiais, preço, renovação ou finalidade de dados | Exigir nova confirmação quando mudança for material; permitir encerramento sem penalidade quando aplicável |
| P1 | 9.2 | Limite de responsabilidade ao valor pago nos últimos 12 meses | Pode ser abusivo se aplicado a direitos indisponíveis, dados, fraude, cobrança ou dano não limitável | Limitar expressamente a hipóteses permitidas e excluir dolo, culpa grave, dados, consumidor e obrigações legais |
| P1 | 6.3 | “APIs públicas gratuitas” descritas como licença/permissão | API pública não equivale a licença para imagens, textos, marcas ou republicação comercial | Mapear termos de cada fonte e declarar atribuição, escopo, cache, uso comercial e remoção |
| P2 | 2 | Conta “intransferível” e uso por maiores de 14 anos | Falta de regras para menores, responsável e recursos de IA/assinatura | Criar política de menores e exigir adulto/responsável para assinatura, conforme desenho jurídico |
| P2 | 4.3 | Funcionalidades podem variar conforme plano, sem matriz contratual | Alteração unilateral e publicidade inconsistente | Anexar comparativo dos planos e definir alterações materiais |

### 2.1 Trial e cobrança: risco mais urgente

A cláusula 5.5 é a principal vulnerabilidade. O site declara na landing page **“Grátis para sempre · Sem cartão”**, enquanto os Termos autorizam trial que se converte automaticamente em assinatura paga. Essas expressões podem se referir a recursos diferentes, mas, sem distinção clara entre **conta Free**, **trial promocional** e **assinatura paga**, o consumidor pode entender que não haverá cobrança.

Recomendação: substituir 5.5 por uma das seguintes estruturas:

> **Opção preferencial — sem conversão automática:** “O período de teste não será convertido em assinatura paga sem confirmação afirmativa do usuário em etapa própria. A tela exibirá plano, preço total, moeda, periodicidade, primeira cobrança, renovação e cancelamento. Sem confirmação, o acesso pago será encerrado ou retornará ao plano Free, sem cobrança.”

> **Opção de maior risco — conversão automática:** “Ao iniciar o trial de [X] dias, o usuário é informado de que, salvo cancelamento até [data/hora], será cobrado [R$ valor] por [mês/ano], com renovação automática. A autorização é obtida em campo/ação específico, sem pré-seleção, e o usuário recebe confirmação imediata e lembrete pré-cobrança com link direto para cancelar.”

A segunda opção não deve ser usada se o checkout atual só apresenta “Continuar”, “Experimentar” ou “Criar conta” sem destacar a obrigação de pagamento futuro.

## 3. Achados na Política de Privacidade

### 3.1 Melhorias constatadas

A Política atualmente identifica a END ART Studios e indica Osasco/SP, apresenta e-mail de privacidade, descreve dados de conta, pagamento tokenizado via Stripe, uso, dados técnicos, bases legais, segurança, direitos, transferências internacionais e a ANPD. Também evita um prazo genérico único de seis anos e declara que dados de assinatura e auditoria podem ser retidos por fundamento específico.

Esses pontos são positivos, mas a Política deve refletir integralmente o produto real e permitir que o titular compreenda o caminho de seus dados, não apenas as categorias gerais.

### 3.2 Lacunas materiais

| Prioridade | Trecho/tema | Lacuna | Correção |
|---|---|---|---|
| P0 | Dados coletados | Não menciona expressamente perfil de gosto, inferências, insights, prompts, respostas IA, embeddings ou comparações entre perfis | Criar seção própria para dados observados, inferidos e gerados |
| P0 | Compartilhamento | Declara apenas Stripe, Vercel e Railway | Incluir autenticação social, e-mail, analytics, monitoramento, suporte, IA, backups e subprocessadores reais |
| P1 | Bases legais | Lista bases em bloco, sem matriz finalidade/base legal | Informar base por finalidade e documentar legítimo interesse |
| P1 | Cookies | Declara apenas cookies essenciais, mas não apresenta inventário por nome, provedor, duração e tecnologia | Publicar Cookie Policy e Privacy Center; validar produção com scanner |
| P1 | Direitos | Indica endpoints `GET/DELETE /user/data`, mas não explica autenticação, prazo, protocolo, escopo da exportação ou exceções | Criar fluxo público/conta com acesso, correção, exportação, eliminação, oposição e contestação |
| P1 | Decisões automatizadas | Não há explicação de lógica, revisão, contestação ou efeitos do perfil | Informar que recomendações são personalizadas, fatores gerais, ausência de decisão de alto impacto e canal de revisão |
| P1 | Retenção | “Período necessário” é insuficiente sem prazos ou critérios por categoria | Publicar tabela de retenção, inatividade, backups, legal hold e dados derivados |
| P1 | Transferências | Menciona mecanismos, mas não lista importadores, países, categorias e salvaguardas | Publicar informação por operador e manter registro conforme LGPD/ANPD |
| P1 | Menores | Não descreve idade, responsável, perfilização ou IA | Criar seção de menores, controles e exclusão especial |
| P2 | Encarregado | “canal do encarregado/contato” não esclarece se há encarregado formal ou canal de comunicação | Identificar encarregado quando aplicável ou designar canal de privacidade com função e prazo |
| P2 | Alterações | “email” deve ser “e-mail” e comunicação precisa ter versão/histórico | Publicar versão, data, resumo de mudanças e histórico |

A Política também deve evitar declarar “nunca usamos cookies de publicidade ou rastreamento de terceiros” sem confirmar a situação real de scripts, pixels, analytics, autenticação e ferramentas de monitoramento. Essa afirmação deve ser auditada no ambiente de produção, não apenas no texto.

## 4. Divergências internas entre as páginas

| Tema | Página/afirmação A | Página/afirmação B | Avaliação |
|---|---|---|---|
| Categorias cobertas | `/about`: foco atual em três categorias; livros/HQs/mangás aparecem como progressivos | `/pt-BR`: seis categorias “já vivas no catálogo” e seis tipos cobertos | Divergência material de oferta e cobertura |
| Cobertura | `/about`: livros, HQs e mangás não aparecem como categorias atuais na primeira seção | Landing: seis categorias, com cards e números de catálogo | Unificar linguagem por categoria e declarar cobertura real |
| Preço/contratação | Landing: “Grátis para sempre · Sem cartão” | Termos: trial pode converter automaticamente em plano pago | Alto risco de expectativa contraditória |
| Cancelamento | Landing/FAQ: cancelamento imediato, sem multa/aviso; plano ajustado proporcionalmente em mudança | Termos 5.4: efeito ao fim do ciclo, sem reembolso proporcional | Divergência sobre efeito financeiro e timing |
| Planos | Landing: Free com catálogo limitado; Plus/Premium com recursos pagos | Landing também diz catálogo/busca/MEDIA Score gratuitos; FAQ diz recursos ilimitados pagos | Necessária matriz única Free/Plus/Premium |
| Score e escalas | Landing/FAQ: games 0–100 e demais 0–10 | About descreve score normalizado 0–100; não explica conversão e exibição por tipo | Documentar fórmula, escala de exibição e categorias |
| Fontes | About lista TMDB, IMDb, Rotten Tomatoes, Metacritic, TVMaze, IGDB, OpenCritic e Steam | Landing/methodology menciona também Letterboxd, Trakt e SteamSpy | Lista única, atualizada e com licenças/atribuições |
| IA e perfil | Landing descreve recomendações IA e perfil avançado | Privacy não descreve esses tratamentos; Terms não possui capítulo específico | Divergência de produto e privacidade |
| Suporte | Landing anuncia suporte prioritário no Premium | Termos não descrevem SLA, escopo ou limites | Definir serviço e expectativa |

## 5. Confronto jurídico

### 5.1 Código de Defesa do Consumidor e comércio eletrônico

O fornecedor deve apresentar identificação completa e informações claras sobre características, preço, condições e restrições da oferta. O checkout deve mostrar preço total, moeda, periodicidade, renovação, trial, primeira cobrança e cancelamento antes do clique final. A cláusula 5.5 atual não contém esses elementos.

O direito de arrependimento deve ser exercível pelo meio adequado e sem criar barreira. O cancelamento de renovação deve ser separado da exclusão da conta. A limitação de responsabilidade não pode esvaziar direitos do consumidor nem validar cobrança que não tenha sido claramente autorizada.

### 5.2 LGPD

A Política precisa demonstrar finalidade e base legal por tratamento. A descrição atual é suficiente apenas para um produto simples de catálogo e conta; não é completa para produto que anuncia recomendações IA, perfil avançado, histórico, insights e exportação. Perfil de gosto pode gerar inferências sensíveis por associação, ainda que o dado de origem seja apenas uma lista de títulos. É necessário proibir criação e uso de categorias sensíveis, implementar minimização e fornecer controle, acesso, correção, eliminação e contestação.

A MEDIA Rate também precisa documentar: registro de operações, operadores, transferências, retenção, segurança, incidentes, matriz de bases legais, legítimo interesse, privacy by design e avaliação de impacto quando o risco justificar. A Resolução CD/ANPD nº 19/2024 deve ser refletida com identificação do fluxo internacional, mecanismo e salvaguardas efetivos [5].

### 5.3 GDPR, quando aplicável

Se a MEDIA Rate oferecer serviços a pessoas na União Europeia ou monitorar seu comportamento, o GDPR pode ser aplicável independentemente de o processamento ocorrer no Brasil. O perfil de gosto deve ser informado como profiling; decisões exclusivamente automatizadas com efeitos jurídicos ou impacto significativamente semelhante exigem salvaguardas específicas. Consentimento deve ser específico, informado, inequívoco e revogável com facilidade. Cookies opcionais, analytics, marketing, personalização e IA devem ser separados quando suas finalidades forem distintas [6] [7].

O site não deve anunciar “conformidade internacional plena” antes de confirmar representante, canal europeu, DPA com operadores, transferências, direitos, retenção, DPIA e eventual aplicação de regras de serviços digitais.

## 6. Correções prioritárias em ordem de execução

| Prazo | Correção | Critério de conclusão |
|---|---|---|
| Imediato | Remover todos os placeholders dos Termos | Nome, CPF/CNPJ, endereço, foro e contato reais e coerentes em todo o site |
| Imediato | Suspender conversão automática do trial ou corrigir checkout | Nenhum usuário é cobrado sem confirmação/preço/renovação claramente apresentados |
| 48h | Harmonizar claims comerciais | Free, trial, categorias, cobertura, cancelamento e preços têm uma única matriz |
| 7 dias | Atualizar Termos 5.1–5.5, 9, 11–13 | Oferta, cancelamento, arrependimento, IA, dados e alterações coerentes |
| 7 dias | Acrescentar capítulo IA/perfil | Erros, vieses, fontes, explicabilidade, revisão, dados sensíveis e limites |
| 14 dias | Reescrever Política de Privacidade | Perfil, IA, prompts, operadores, cookies, retenção, menores e direitos |
| 14 dias | Auditar produção | Cookies, scripts, APIs, logs, bancos, backups e fornecedores conferidos |
| 21 dias | Implementar Privacy Center | Aceitar/recusar/gerenciar, granularidade, revogação e prova auditável |
| 30 dias | Formalizar contratos e registros | DPA, subprocessadores, transferências, matriz de bases e retenção |
| 30–45 dias | Testar direitos e exclusão | Exportação, correção, eliminação, legal hold e propagação aos operadores |

## 7. Redações mínimas recomendadas

### 7.1 Identificação do fornecedor

> **Fornecedor e contato.** A MEDIA Rate é operada por **[nome completo da pessoa jurídica ou pessoa natural]**, inscrita no **[CNPJ/CPF]**, com endereço em **[endereço completo]**, e-mail **[contato]** e canal de atendimento **[URL]**. O canal para proteção de dados é **[e-mail/URL]**. A END ART Studios é **[marca/nome empresarial/entidade contratual — confirmar]** e sua relação com a MEDIA Rate é descrita de forma coerente em todos os documentos.

### 7.2 Recomendações e IA

> **Recomendações automatizadas.** A MEDIA Rate utiliza dados de catálogo, preferências, avaliações, watchlist e histórico para sugerir obras. As recomendações são auxiliares de descoberta e podem conter erros, omissões, defasagens, vieses de cobertura ou resultados inadequados ao usuário. O serviço não usa esse perfil para crédito, emprego, seguro, saúde, preço individual, elegibilidade ou acesso a direitos. O usuário pode consultar fatores gerais da recomendação, corrigir dados, desligar a personalização, apagar o perfil e contestar resultado pelo canal **[URL]**. Se uma decisão automatizada produzir efeito jurídico ou impacto significativamente semelhante, serão asseguradas intervenção humana, manifestação e contestação conforme a legislação aplicável.

### 7.3 Consentimento e cookies

> **Preferências de privacidade.** Cookies e tecnologias estritamente necessários podem ser utilizados para autenticação, segurança, sessão e funcionamento solicitado. Cookies de analytics, marketing, personalização e tecnologias de Assistente IA serão tratados separadamente, com escolha livre, específica e revogável. O usuário pode aceitar, recusar ou gerenciar categorias pelo **[Privacy Center URL]**. A revogação não prejudica a legalidade do tratamento realizado antes dela e produzirá o bloqueio das finalidades opcionais no menor prazo técnico.

## 8. Veredito por página

| Página | Situação | Veredito |
|---|---|---|
| `/pt-BR/terms` | Identificação incompleta, trial automático, aceitação tácita e divergências de cancelamento | **Não aprovar sem correção** |
| `/pt-BR/privacy` | Melhor estruturada, mas incompleta sobre IA, perfil, cookies, operadores e retenção | **Aprovação condicionada a complementação e auditoria técnica** |
| `/pt-BR/about` | Boa explicação do score, mas contradiz a landing sobre categorias e fontes | **Corrigir inconsistências antes de usar como material institucional** |
| `/pt-BR` | Claims comerciais relevantes, mas conflita com Termos e FAQ | **Corrigir antes de campanhas, tráfego pago ou cobrança** |

## 9. Conclusão final

O site apresenta uma base promissora, porém **não está juridicamente pronto para ser classificado como plenamente conforme**. A falha mais grave é a combinação de Termos com placeholders e conversão automática do trial com a mensagem comercial “Grátis para sempre · Sem cartão”. A segunda é a divergência entre o produto anunciado — que inclui recomendações IA e perfil avançado — e a Política, que não descreve esses tratamentos de modo suficientemente específico.

A correção mais urgente é: **preencher a identificação do fornecedor; suspender a cobrança pós-trial até corrigir o consentimento; harmonizar Free/trial/planos/cancelamento; atualizar a Política para IA/perfil; e testar tecnicamente o Privacy Center, exclusão e propagação aos operadores**. Só depois dessa etapa deve ser feita uma declaração pública de conformidade LGPD/GDPR.

## Referências

[1]: https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm "Lei nº 8.078/1990 — Código de Defesa do Consumidor"

[2]: https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm "Decreto nº 7.962/2013 — comércio eletrônico"

[3]: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm "Lei nº 13.709/2018 — LGPD"

[4]: https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm "Lei nº 12.965/2014 — Marco Civil da Internet"

[5]: https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024 "Resolução CD/ANPD nº 19/2024 — transferências internacionais"

[6]: https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02016R0679-20160504 "GDPR — texto consolidado"

[7]: https://www.edpb.europa.eu/documents/guideline/guidelines-052020-on-consent-under-regulation-2016679_en "EDPB — Guidelines 05/2020 on consent"
