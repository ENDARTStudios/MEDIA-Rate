# MEDIA Rate — auditoria atualizada de termos, privacidade, cookies e segurança

**Verificação:** 4 de setembro de 2026, GMT−3  
**URLs:** `/pt-BR/privacy`, `/pt-BR/terms`, `/pt-BR/about` e `/pt-BR`.

> **Ressalva:** sou uma IA, não um advogado. Este documento é análise de trabalho, não parecer jurídico formal. A versão final deve ser revisada por advogado habilitado e pelas equipes de privacidade, engenharia e segurança.

## 1. Dados empresariais considerados

| Campo | Informação confirmada |
|---|---|
| Nome Fantasia | END ART Studios |
| CNPJ | 45.370.930/0001-75 |
| Localidade | Osasco, São Paulo — Brasil |
| Contato | endart.studios@gmail.com |

A Política, os Termos e o rodapé público atualmente exibem esses dados de forma consistente. Portanto, os placeholders de CNPJ e fornecedor observados anteriormente foram corrigidos.

## 2. Veredito geral

A versão atual melhorou substancialmente. Os Termos passaram a prever confirmação afirmativa para contratação paga após o trial; a Política passou a detalhar PostHog, Sentry, perfil de gosto, fatores de recomendação, retenção, menores e cookies opcionais; e o rodapé exibe CNPJ e contato.

**Ainda não recomendo declarar conformidade plena com LGPD, CDC ou GDPR.** A ausência de endereço físico completo é o principal ponto documental remanescente. Há também uma inconsistência técnica que precisa ser esclarecida: os controles opcionais PostHog/Sentry aparecem desmarcados, mas a sessão pública persistida apresentava um cookie `ph_*_posthog` e a chave genérica `lgpd-consent-v1 = accepted` no `localStorage`. Além disso, permanecem divergências entre Termos, landing page e página Sobre sobre cobertura, cancelamento e descrição de planos.

| Área | Status |
|---|---|
| Identificação e CNPJ | **Consistente**, mas endereço limitado à cidade/estado pode ser insuficiente para comércio eletrônico |
| Trial e cobrança | **Boa redação atual**, sujeita a teste do checkout real |
| Política de Privacidade | **Melhorada**, ainda incompleta em governança, direitos operacionais e prova de cookies |
| Cookies | **Estrutura básica adequada**, implementação deve ser auditada em sessão limpa |
| Segurança pública | **Headers positivos e declarações razoáveis**, sem prova de segurança integral do backend |
| Coerência entre páginas | **Ainda parcial** |
| GDPR internacional | **Não demonstrado**, requer análise territorial e controles próprios |

## 3. Endereço físico limitado a “Osasco, São Paulo — Brasil”

A informação foi refletida no site e corresponde ao dado fornecido. Contudo, para uma operação de comércio eletrônico no Brasil, o Decreto nº 7.962/2013 exige divulgação, em local de destaque, do nome empresarial, CNPJ quando aplicável e endereço físico e eletrônico, além de informações para localização e contato do fornecedor [2]. O CDC também exige identificação e informação clara na oferta [1].

Consequentemente, **não é possível afirmar plena conformidade documental enquanto o site informar somente “Osasco, São Paulo — Brasil”**, porque isso pode não permitir localização física suficiente do fornecedor. A ausência de estabelecimento aberto ao público não elimina necessariamente a necessidade de manter um endereço cadastral ou de contato exigido pela legislação.

A MEDIA Rate não deve inventar um endereço. As opções juridicamente mais seguras são: utilizar o endereço cadastral/fiscal efetivamente vinculado ao CNPJ, caso permitido e validado pelo contador/advogado; utilizar endereço de domicílio empresarial ou serviço de recebimento de correspondência juridicamente válido; ou confirmar com advogado se, dadas as atividades e o modelo de contratação, existe forma legal de apresentar a localidade combinada com canal formal de atendimento. Até essa validação, manter “Osasco, São Paulo — Brasil” é transparente, mas deve ser classificado como **risco documental P1**, não como plena conformidade.

## 4. Termos de Uso

### Pontos positivos atuais

Os Termos identificam END ART Studios e CNPJ; informam que preço, moeda, tributos, periodicidade e renovação devem aparecer na página de Planos, checkout e confirmação; preservam o arrependimento de sete dias; impedem conversão automática do trial sem confirmação afirmativa; melhoram o tratamento de cobrança indevida; ressalvam direitos irrenunciáveis; limitam a aceitação tácita em alterações materiais; e excluem do limite de responsabilidade o tratamento indevido de dados, dolo, culpa grave e hipóteses não limitáveis.

### Pontos que ainda exigem correção

| Prioridade | Ponto | Recomendação |
|---|---|---|
| P1 | Cláusula 4.1 ainda diz que livros, HQs e mangás entram progressivamente; 4.4 trata categorias como “em breve”, enquanto About e landing dizem que seis categorias já estão cobertas | Escolher uma descrição única e sincronizar todas as páginas |
| P1 | Landing/FAQ afirma cancelamento imediato e acesso até o fim do ciclo; Termos dizem cancelamento da renovação com efeito ao fim do ciclo | Explicar separadamente cancelamento da renovação, término de acesso e reembolso |
| P1 | Cláusula 5.2 remete aos termos Stripe | Acrescentar que a MEDIA Rate continua responsável pela oferta, autorização, cancelamento e cobrança perante o usuário |
| P1 | Limite de responsabilidade ao valor pago em 12 meses | Manter apenas em extensão permitida; não limitar direitos consumeristas, restituição, dados, segurança e obrigações legais |
| P1 | Fontes de terceiros descritas como uso sob “licença ou permissão de APIs públicas gratuitas” | API pública não equivale automaticamente a licença de conteúdo, imagem, marca ou uso comercial; manter matriz por fonte |
| P2 | Alterações não substanciais podem ser aceitas pelo uso continuado | Definir exemplos e nunca usar essa regra para preço, renovação, dados ou redução material de recursos |
| P2 | Contato e endereço | Incluir canal de atendimento e solução juridicamente validada para endereço cadastral/físico |

## 5. Política de Privacidade

### Pontos positivos atuais

A Política identifica controlador e CNPJ, informa contato, descreve dados de conta, assinatura, uso e dados técnicos, lista Stripe/Vercel/Railway/Google/Sentry, indica retenções gerais, descreve soft delete com carência de 30 dias, oferece direitos de acesso/portabilidade/correção/exclusão, menciona segurança com Argon2id/HTTPS/column encryption/auditoria append-only, descreve transferências internacionais, trata de perfil de gosto, recomendações, menores e cookies opcionais.

### Pontos remanescentes

| Tema | Avaliação |
|---|---|
| Perfil de gosto | Melhor descrito, mas a base “contrato” para todo perfil avançado Premium deve ser validada quanto à necessidade e possibilidade de desligamento sem impedir funções básicas |
| IA | A Política diz que não há IA generativa, enquanto a landing diz “recomendações IA”; explicar que se trata de algoritmo/recomendação não generativa ou corrigir a afirmação comercial |
| Cookies | A tabela é positiva, mas deve refletir exatamente o que é criado e carregado em cada rota e antes/depois do consentimento |
| Sentry | A expressão “dados técnicos anonimizados” deve ser confirmada pela configuração real, incluindo IP, user ID, breadcrumbs, stack trace, replay e retenção |
| Retenção | Faltam prazos específicos para perfil derivado, features, caches, prompts, embeddings, backups e registros de contestação |
| Direitos | Endpoints `/user/data` devem ter autenticação, protocolo, rate limiting, prazo, resultado verificável e tratamento de legal hold |
| Transferências | Informar países/importadores, categorias, mecanismo e salvaguardas por operador; referência genérica não basta |
| Menores | Texto existe, mas deve ser acompanhado por controles técnicos e procedimento de responsável |
| Encarregado | Esclarecer se existe encarregado formal ou se o e-mail é canal de privacidade designado |

## 6. Cookies e Privacy Center

O banner público apresenta “Aceitar todos”, “Recusar” e “Gerenciar”, com categorias “Analytics (PostHog)” e “Monitoramento (Sentry)” e necessários sempre ativos. Isso é uma boa estrutura inicial e acompanha a orientação de que cookies opcionais dependem de escolha efetiva do titular [5].

Na sessão persistida de verificação, os checkboxes PostHog e Sentry estavam desmarcados. Porém, `document.cookie` continha um cookie `ph_*_posthog` com identificador anônimo de dispositivo/sessão, e `localStorage` continha `lgpd-consent-v1 = accepted` e dados PostHog. Não foram observados recursos de performance com nomes PostHog/Sentry/analytics/tracking/google naquele instante.

O achado não prova sozinho que o site carregou analytics antes do consentimento, porque o navegador possuía estado anterior e recursos podem ter sido criados em outra página ou sessão. Entretanto, **há uma inconsistência que precisa ser resolvida**. A flag genérica “accepted” deve ser substituída por registro granular, por exemplo: categorias aceitas, versão do banner, data/hora, idioma, país, fornecedor e revogação. O teste deve ser feito em perfil limpo, antes da escolha, após recusar, após aceitar apenas uma categoria, após aceitar tudo e após revogar.

## 7. Segurança pública

A verificação pública anterior observou HTTPS/HSTS, CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` e Permissions Policy restringindo câmera, microfone e geolocalização. A CSP limita scripts/conexões e inclui `frame-ancestors 'none'` e `object-src 'none'`.

Esses sinais são positivos, mas não comprovam Argon2id, column encryption, auditoria append-only, segurança do banco, autorização dos endpoints de dados, CSRF, rate limiting, gestão de chaves, backups, isolamento entre usuários ou configuração dos operadores. A Política deve manter apenas declarações que a equipe consiga demonstrar por documentação e testes.

## 8. About e landing page

A página Sobre agora afirma seis categorias e lista fontes específicas para filmes, séries, games, livros, HQs e mangás. Isso está mais alinhado com a landing, mas ainda conflita com os Termos, que mencionam categorias progressivas e “em breve”.

A landing agora escreve “Plano Free: grátis para sempre · Sem cartão”, o que é melhor do que o claim genérico anterior. Ainda assim, a matriz de Planos deve deixar explícito que a frase se refere exclusivamente ao Free e não a trial ou assinatura Plus/Premium.

A landing afirma que o cancelamento interrompe a renovação imediatamente e mantém acesso até o fim do ciclo sem reembolso proporcional. Os Termos devem reproduzir exatamente essa regra e diferenciar: cancelamento da renovação; acesso residual; arrependimento legal; cobrança indevida; upgrade/downgrade e eventual ajuste proporcional.

## 9. Fundamentação jurídica

A análise considera o CDC e o Decreto nº 7.962/2013, especialmente informação, identificação do fornecedor, oferta, preço, cancelamento e arrependimento [1] [2]; a LGPD, incluindo princípios, direitos, segurança, eliminação e revisão de decisões automatizadas [3]; o Marco Civil [4]; a regulamentação de transferências internacionais da ANPD [6]; e, quando houver direcionamento efetivo a pessoas na UE, o GDPR e orientações do EDPB sobre consentimento e perfilização [7] [8].

## 10. Prioridades

| Prioridade | Ação |
|---|---|
| P0 | Testar em sessão limpa se PostHog/Sentry são carregados antes da escolha e se a revogação bloqueia o tratamento |
| P0 | Alterar `lgpd-consent-v1` para estado granular e auditável |
| P1 | Validar juridicamente o endereço cadastral/físico exigido; não inventar endereço |
| P1 | Harmonizar Terms 4.1/4.4 com About e landing sobre seis categorias |
| P1 | Harmonizar cancelamento imediato da renovação com cláusula 5.4 |
| P1 | Explicar algoritmo não generativo versus “IA” em todas as páginas |
| P1 | Completar matriz de retenção e transferências por operador |
| P1 | Testar `/user/data`, exclusão, exportação, autenticação, legal hold e propagação aos operadores |
| P2 | Documentar licenças e atribuições de todas as fontes de dados, imagens e marcas |
| P2 | Realizar revisão de segurança autenticada ou teste independente |

## 11. Conclusão

Com os dados empresariais fornecidos, **a identificação exibida nas páginas está consistente**: END ART Studios, CNPJ 45.370.930/0001-75, Osasco, São Paulo — Brasil e endart.studios@gmail.com.

No entanto, a limitação do endereço à cidade/estado **não permite afirmar plena conformidade com os requisitos de identificação do comércio eletrônico**; o risco deve ser validado com advogado/contador sem inserir informação falsa. Os Termos e a Política estão em evolução e apresentam melhorias relevantes, mas a conformidade depende de corrigir a implementação de consentimento, harmonizar páginas e comprovar as declarações de segurança e exclusão.

O resultado atual é: **parcialmente adequado, com risco P0 técnico em cookies/consentimento e riscos P1 documentais e de coerência**. Não recomendamos divulgar ainda uma afirmação ampla de “conformidade plena LGPD/GDPR”.

## Referências

[1]: https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm "Lei nº 8.078/1990 — Código de Defesa do Consumidor"

[2]: https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm "Decreto nº 7.962/2013 — comércio eletrônico"

[3]: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm "Lei nº 13.709/2018 — LGPD"

[4]: https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm "Lei nº 12.965/2014 — Marco Civil da Internet"

[5]: https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf/@@display-file/file "ANPD — Cookies e proteção de dados pessoais"

[6]: https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024 "Resolução CD/ANPD nº 19/2024 — transferências internacionais"

[7]: https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02016R0679-20160504 "GDPR — texto consolidado"

[8]: https://www.edpb.europa.eu/documents/guideline/guidelines-052020-on-consent-under-regulation-2016679_en "EDPB — Guidelines 05/2020 on consent"
