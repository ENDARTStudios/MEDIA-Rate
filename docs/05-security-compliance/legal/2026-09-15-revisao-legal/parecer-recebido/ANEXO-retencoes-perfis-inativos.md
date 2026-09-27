# MEDIA Rate — impactos operacionais, Política de Retenção e exclusão de perfis inativos

**Minuta de trabalho para revisão jurídica, de privacidade e de engenharia.**

> Sou uma IA, não um advogado. Este documento é uma análise e minuta operacional, não aconselhamento jurídico formal. A publicação da política e a ativação do fluxo automatizado devem ser revisadas por advogado habilitado, responsável de proteção de dados e equipe técnica.

## 1. Resumo executivo

A implementação do Consent/Privacy Center, do mecanismo de contestação de IA e da exclusão automática de perfis inativos exige mudanças coordenadas em **produto, frontend, backend, banco de dados, e-mail, suporte, segurança, contratos com fornecedores e governança**. Não é recomendável implementar apenas um botão visual de consentimento ou um job de exclusão sem inventário de dados e sem mecanismo de preservação legal.

Para a exclusão de perfis inativos, a recomendação é utilizar um modelo de **retenção por finalidade e por categoria**, com exclusão em etapas: classificação, aviso, período de recuperação, anonimização/eliminação, limpeza de derivados e verificação posterior. O critério de inatividade deve ser objetivo e não pode ser aplicado a contas pagas ativas, disputas, obrigações legais, incidentes, pedidos de direitos, investigações ou solicitações expressas de preservação.

A LGPD exige necessidade, finalidade, transparência, segurança, prevenção, não discriminação e responsabilização; a eliminação deve ser compatível com a finalidade e com hipóteses legais de conservação [1]. O GDPR exige limitação da conservação, proteção de dados desde a concepção e, quando aplicável, direito ao apagamento e restrição do tratamento [2]. O Marco Civil também prevê exclusão definitiva dos dados pessoais fornecidos ao término da relação, ressalvadas hipóteses legais de guarda [3].

## 2. Impactos operacionais e de desenvolvimento

### 2.1 Matriz de impacto

| Área | Impacto | Trabalho necessário | Risco se não implementado |
|---|---|---|---|
| Produto/UX | Alto | Desenhar banner, centro de privacidade, estados de consentimento, perfil, IA, contestação e exclusão | Consentimento inválido, dark patterns, direitos inexequíveis |
| Frontend | Alto | CMP/Privacy Center, bloqueio prévio de scripts, preferências por categoria, telas de exportação/exclusão e contestação | Cookies opcionais antes da escolha; fluxo inconsistente |
| Backend/API | Alto | Serviços de consentimento, direitos, inatividade, retenção, deleção e auditoria | Exclusão parcial, reconstituição de perfil, ausência de prova |
| Banco de dados | Alto | Mapeamento de tabelas, relações, soft delete, hard delete, anonimização e cascatas | Dados órfãos, perfil derivado permanecendo após exclusão |
| Dados/IA | Alto | Apagar embeddings, features, prompts, respostas, caches, recomendações e logs derivados | Perfilização continua após revogação ou exclusão |
| E-mail | Médio/alto | Avisos de consentimento, trial, inatividade, confirmação e recuperação | Usuário não consegue prevenir perda de dados |
| Suporte | Médio/alto | Scripts, protocolos, escalonamento, revisão humana e tratamento de exceções | Respostas incompatíveis e violações de prazo |
| Segurança | Alto | Controle de acesso, criptografia, logs imutáveis, jobs idempotentes, segregação | Exclusão indevida, abuso do endpoint ou perda de evidência |
| Jurídico/privacidade | Alto | Inventário, bases legais, política, contratos, RIPD/DPIA e matriz internacional | Retenção excessiva e incapacidade de demonstrar conformidade |
| Financeiro | Médio | Separar conta inativa de assinatura, faturas, chargebacks e obrigações fiscais | Exclusão de prova financeira ou cobrança indevida |
| Operações | Médio | Monitoramento do job, métricas, alertas e procedimento de rollback | Exclusões silenciosamente falhas |

### 2.2 Componentes de produto

O painel deve possuir uma área permanente no menu da conta, além de link no rodapé. As decisões devem ser apresentadas em linguagem simples e com ações equivalentes. “Aceitar”, “Recusar” e “Gerenciar” devem estar disponíveis no primeiro nível; as categorias opcionais não podem ser pré-selecionadas; e revogar deve ser tão fácil quanto aceitar. A ANPD recomenda que cookies não estritamente necessários sejam desativados quando o titular rejeita cookies [4].

O perfil de gosto deve ser separado do consentimento de cookies. Parte do perfil pode decorrer de dados da conta e não de cookies; por isso, uma única chave “cookies” não é suficiente. O usuário deve controlar, separadamente, o uso de histórico, avaliações, favoritos, insights, comparação entre perfis e Assistente IA.

O mecanismo de contestação deve aparecer na própria recomendação, no perfil e no Privacy Center. O usuário deve poder indicar “não reconheço este dado”, “recomendação inadequada”, “resultado discriminatório”, “quero saber por que recebi isto” e “quero revisão”. Cada caso deve receber protocolo, estado, prazo estimado e resultado.

### 2.3 Arquitetura mínima sugerida

```text
Browser/app
  │
  ├─ Consent Manager ──> Consent API ──> Consent ledger
  │                                  └─> regras de carregamento de tags
  │
  ├─ Privacy Center ──> Rights API ──> fila de solicitações
  │                                    ├─ acesso/exportação
  │                                    ├─ correção/oposição
  │                                    ├─ revogação
  │                                    └─ exclusão
  │
  ├─ Recomendação ──> Recommendation API
  │                   └─> explicação + fatores + versão do modelo
  │
  ├─ Contestação ──> Case API ──> fila de revisão humana
  │                              └─> correção de dado/regra/modelo
  │
  └─ Inatividade ──> Retention Worker ──> classificação e notificações
                                      └─> Deletion Worker idempotente

Dados protegidos:
- conta e autenticação
- histórico e watchlist
- perfil e features derivadas
- prompts e respostas IA
- consentimentos e provas
- pagamentos e documentos fiscais
- logs de segurança e legal hold
```

## 3. Minuta da Política de Retenção de Dados

### 3.1 Finalidade e escopo

> **1. Finalidade.** Esta Política estabelece os critérios pelos quais a MEDIA Rate conserva, restringe, anonimiza ou elimina dados pessoais, dados de uso, perfis inferidos, prompts, respostas do Assistente IA, registros de consentimento, dados de assinatura, logs e cópias de segurança. A retenção será limitada ao período necessário para a finalidade informada, o cumprimento de obrigação legal, a segurança, a prevenção de fraude ou o exercício regular de direitos.

> **2. Escopo.** A Política aplica-se ao site, aplicações, APIs, bancos de dados, ferramentas de analytics, serviços de autenticação, processadores de pagamento, provedores de e-mail, infraestrutura em nuvem, provedores de IA e demais operadores que tratem dados em nome da MEDIA Rate. Contratos com operadores devem estabelecer instruções de retenção, exclusão, assistência, segurança, incidentes e retorno de dados.

### 3.2 Princípios

> **3. Princípios.** A MEDIA Rate observará finalidade, adequação, necessidade, livre acesso, qualidade, transparência, segurança, prevenção, não discriminação, responsabilização e prestação de contas. A existência de capacidade técnica para conservar um dado não constitui justificativa para conservá-lo. Dados derivados, agregados ou pseudonimizados continuam sujeitos a avaliação de identificabilidade e risco.

### 3.3 Categorias e prazos recomendados

Os prazos abaixo são uma proposta inicial. O jurídico deve confirmar a legislação fiscal, consumerista, contratual e processual aplicável à estrutura real da empresa.

| Categoria | Evento inicial | Retenção recomendada | Destino ao final | Exceções |
|---|---|---:|---|---|
| Conta e autenticação | Encerramento da conta ou confirmação de inatividade | 30 dias de recuperação + até 90 dias de limpeza operacional | Eliminação; credencial invalidada imediatamente | Segurança, fraude, legal hold |
| Nome e e-mail da conta | Encerramento ou exclusão solicitada | Até conclusão do fluxo + lista mínima de supressão | Eliminação; manter hash mínimo apenas para impedir reimportação de marketing, se documentado | Obrigação legal/defesa |
| Watchlist, favoritos e histórico | Exclusão da conta ou pedido de apagar dados | 30 dias de recuperação após aviso; exclusão ao final | Eliminação ou anonimização irreversível | Backup temporário, disputa |
| Perfil de gosto e inferências | Desligamento da personalização, exclusão ou inatividade | Eliminação prioritária; no máximo 30 dias após evento | Eliminação de features, embeddings e caches | Dados anonimizados de forma comprovada |
| Prompts e respostas IA | Uso ou criação do conteúdo | Retenção curta, preferencialmente até 30 dias, salvo histórico solicitado pelo usuário | Eliminação do conteúdo e caches | Segurança, abuso, disputa |
| Contestação de IA | Encerramento do caso | Prazo necessário para atendimento e defesa, sugerido 24 meses após encerramento | Anonimização ou eliminação | Litígio, incidente ou ordem |
| Consentimentos e revogações | Cada evento de escolha | Enquanto necessário para prova, auditoria e defesa | Eliminação ou anonimização conforme matriz legal | Obrigação de prova |
| Assinatura e transações | Fim da relação financeira | Prazo fiscal/contábil e de defesa aplicável | Restrição de acesso; eliminação após prazo | Chargeback, litígio, obrigação legal |
| Logs de segurança e acesso | Criação do log | Prazo definido por tipo, risco e guarda legal; não adotar seis anos automaticamente | Eliminação ou anonimização | Ordem judicial, incidente, investigação |
| Tickets de suporte | Encerramento do atendimento | Sugestão: 24 meses, salvo necessidade documentada | Eliminação ou anonimização | Disputa/defesa |
| Backups | Criação do backup | Ciclo técnico documentado, sugerido até 90 dias após exclusão do sistema primário | Sobrescrita segura | Legal hold e recuperação de desastre |
| Métricas agregadas | Geração | Sem prazo fixo somente se irreversivelmente anônimas | Preservação estatística | Reavaliar risco de reidentificação |

A política deve evitar afirmar que logs serão retidos por seis anos “por recomendação da ANPD” sem indicar fundamento específico. Prazos diferentes podem ser necessários, mas devem ter finalidade e justificativa documentadas.

### 3.4 Inatividade

> **4. Definição de inatividade.** Considera-se inativa a conta gratuita sem login bem-sucedido, uso autenticado de funcionalidade, atualização de preferência, solicitação de suporte ou outra interação significativa por **18 meses consecutivos**, desde que não exista assinatura ativa, saldo, disputa, obrigação legal, pedido de direitos, investigação de segurança ou bloqueio de preservação. A mera abertura de e-mail, carregamento de cookie ou evento técnico automático não reinicia o prazo.

O prazo de 18 meses é uma proposta equilibrada, não um prazo legal universal. Se o produto entender que precisa de 24 meses para preservar listas pessoais, a escolha deve ser documentada por necessidade e expectativa do usuário. Para contas pagas, o relógio de inatividade não deve iniciar nem produzir exclusão enquanto houver assinatura, obrigação de serviço ou transação pendente.

> **5. Inatividade de perfil, não de pessoa.** A ausência de login não prova que o titular deseja perder seus dados. Antes da eliminação, a MEDIA Rate enviará avisos e oferecerá acesso, exportação, reativação e exclusão voluntária. O usuário poderá solicitar que a conta seja mantida ou que determinados dados sejam apagados imediatamente.

### 3.5 Avisos e período de recuperação

> **6. Avisos.** Aos 12 meses de inatividade, a MEDIA Rate enviará aviso informativo. Aos 17 meses, enviará aviso de pré-exclusão com as categorias afetadas, data estimada, link de reativação, link de exportação, link de exclusão e canal de suporte. Aos 18 meses, se não houver resposta ou exceção, a conta será marcada para exclusão. A mensagem deve informar que clicar no link de reativação interrompe o processo.

> **7. Período de recuperação.** Após a marcação, haverá período adicional de recuperação de 30 dias, durante o qual a conta permanecerá bloqueada para novos tratamentos não necessários, mas poderá ser reativada pelo titular. Não serão feitas recomendações personalizadas, marketing ou envio de prompts durante esse período.

### 3.6 Exclusão, anonimização e dados derivados

> **8. Eliminação.** A eliminação abrangerá dados cadastrais, histórico, watchlist, favoritos, preferências, perfil de gosto, embeddings, features derivadas, prompts, respostas, caches, tokens de sessão e cópias aplicáveis em sistemas de operadores. Os registros de consentimento, transações, logs e tickets serão tratados conforme seus prazos próprios e poderão ser segregados, anonimizados ou mantidos com acesso restrito quando houver fundamento legal.

> **9. Anonimização.** Dados somente serão classificados como anonimizados quando, considerando meios razoáveis e disponíveis, não puderem ser associados direta ou indiretamente a pessoa identificada ou identificável. Pseudonimização, hash reversível, identificador interno ou remoção do nome não equivalem automaticamente à anonimização.

### 3.7 Legal hold e exceções

> **10. Preservação excepcional.** A exclusão será suspensa, limitada ou adaptada quando necessário para cumprir ordem judicial ou administrativa, atender obrigação legal, preservar prova de incidente, investigar fraude, responder a reclamação ou exercer regularmente direitos. A preservação deverá ser específica, documentada, aprovada por responsável e revisada periodicamente. Dados sob preservação não poderão ser usados para finalidade incompatível.

### 3.8 Operadores e transferências

> **11. Operadores.** A MEDIA Rate instruirá Stripe, Vercel, Railway, provedores de autenticação, e-mail, analytics, IA e demais operadores sobre prazos e exclusão. A Política de Privacidade informará suas funções e países de processamento. Transferências internacionais deverão possuir hipótese legal e mecanismo válido nos termos da LGPD e da regulamentação da ANPD, com transparência e medidas de segurança [5].

### 3.9 Segurança e governança

> **12. Segurança.** Processos de retenção e exclusão utilizarão controle de acesso por função, autenticação forte para operações administrativas, criptografia, segregação de ambientes, logs de execução, revisão de permissões, backups com expiração e monitoramento de falhas. Nenhum administrador poderá exportar ou excluir em massa sem autorização compatível com o risco.

> **13. Revisão.** Esta Política será revisada no mínimo anualmente, ou antes quando houver nova categoria de dado, provedor, modelo de IA, finalidade, jurisdição, incidente ou alteração legal. A MEDIA Rate manterá registro da versão, aprovação, data de vigência e alterações materiais.

## 4. Fluxo automatizado de exclusão de perfis inativos

### 4.1 Estados do processo

| Estado | Descrição | Tratamento permitido |
|---|---|---|
| ACTIVE | Conta em uso ou dentro do prazo | Serviço normal |
| OBSERVE | 12 meses sem atividade significativa | Serviço normal; aviso de retenção |
| WARNED | 17 meses sem atividade | Aviso, exportação e reativação; reduzir marketing |
| PENDING_DELETION | 18 meses + critérios atendidos | Bloquear personalização e novos tratamentos opcionais |
| GRACE_PERIOD | 30 dias de recuperação | Reativação possível; sem exclusão definitiva |
| DELETING | Job de exclusão em andamento | Operação idempotente e monitorada |
| DELETED | Conta eliminada | Login inválido; confirmação se contato ainda existir |
| LEGAL_HOLD | Exclusão suspensa | Acesso restrito; revisão periódica |
| EXEMPT | Exceção documentada | Regra própria e data de revisão |

### 4.2 Critério determinístico

Uma conta gratuita pode entrar em `OBSERVE` quando:

```text
last_meaningful_activity_at <= now - 12 months
AND no active subscription
AND no pending payment or chargeback
AND no open rights request
AND no legal hold
AND no active security investigation
AND no preservation obligation
```

A atividade significativa deve incluir login bem-sucedido, uso autenticado de catálogo que exija conta, alteração de watchlist/favorito, atualização de preferência, abertura de solicitação ou uso do Assistente IA. Não incluir pixels, abertura de e-mail ou eventos automáticos como atividade, porque isso poderia frustrar a intenção de exclusão.

### 4.3 Pseudocódigo de alto nível

```text
for account in eligible_accounts:
    if account.active_subscription:
        continue
    if account.legal_hold or account.open_rights_request:
        mark(account, LEGAL_HOLD)
        continue
    if account.security_investigation or account.pending_payment:
        mark(account, EXEMPT)
        continue

    age = now - account.last_meaningful_activity_at

    if age >= 12 months and account.state == ACTIVE:
        mark(account, OBSERVE)
        send_inactivity_notice(account, template="12_months")

    if age >= 17 months and account.state in [ACTIVE, OBSERVE]:
        mark(account, WARNED)
        suppress_marketing(account)
        send_inactivity_notice(account, template="pre_deletion")

    if age >= 18 months and account.state == WARNED:
        mark(account, PENDING_DELETION)
        disable_personalization(account)
        send_recovery_notice(account)
        schedule(account, delete_after=30 days)

for account in grace_expired_accounts:
    if account.reactivated or account.legal_hold or account.open_rights_request:
        restore_or_hold(account)
    else:
        enqueue_idempotent_deletion(account)
```

### 4.4 Ordem de exclusão

A ordem deve evitar que dados derivados ou operadores recriem o perfil:

| Ordem | Ação | Resultado |
|---:|---|---|
| 1 | Invalidar sessões, tokens e credenciais | Impede acesso durante exclusão |
| 2 | Bloquear marketing, personalização e IA | Interrompe novos tratamentos opcionais |
| 3 | Exportar snapshot de auditoria não pessoal ou identificador interno | Permite comprovar execução sem copiar conteúdo desnecessário |
| 4 | Excluir perfil, features, embeddings e recomendações armazenadas | Remove derivados |
| 5 | Excluir prompts, respostas e caches IA | Remove contexto enviado/gerado |
| 6 | Excluir watchlist, favoritos, histórico e reações | Remove conteúdo funcional |
| 7 | Excluir dados de conta e login | Impede reativação indevida |
| 8 | Propagar instrução aos operadores | Stripe, e-mail, analytics, IA e infraestrutura |
| 9 | Aplicar regras próprias a transações, logs, consentimentos e tickets | Preserva somente o necessário |
| 10 | Marcar estado DELETED e emitir relatório | Auditoria e monitoramento |

### 4.5 Idempotência, rollback e falhas

Cada etapa deve poder ser executada mais de uma vez sem causar dano adicional. O job deve registrar `deletion_request_id`, conta, versão da política, timestamp, etapa, resultado, erro e operador técnico. Não se deve fazer rollback restaurando dados pessoais já eliminados sem nova autorização do titular; o rollback deve significar interromper etapas futuras e colocar a conta em investigação, não reconstruir dados apagados.

Falhas em operador externo devem gerar fila de retry com backoff, alerta e prazo máximo. A exclusão no banco principal não deve ser considerada completa enquanto houver dado pessoal identificável em cache, índice de busca, vetor/embedding, exportação, bucket, ferramenta de monitoramento ou provedor externo relevante.

### 4.6 Notificação ao usuário

Após a exclusão, enviar confirmação somente se existir canal legítimo ainda preservado. A mensagem deve dizer o que foi excluído, o que foi mantido e por quê, sem expor dados desnecessários. Se o e-mail foi eliminado, registrar apenas o status operacional conforme a política de prova.

## 5. Contestação de IA: impacto adicional no desenho

O mecanismo de contestação deve compartilhar a infraestrutura de direitos, mas ter fila e SLA próprios. Cada caso deve preservar a recomendação contestada, os fatores gerais exibidos, versão do modelo, data, dados de entrada usados e resultado da análise, com minimização e retenção limitada.

| Etapa | Operação |
|---|---|
| Abertura | Usuário seleciona recomendação e motivo |
| Triagem automática | Classifica erro factual, dado desconhecido, viés, segurança ou pedido de revisão |
| Bloqueio preventivo | Se risco alto, suspende recomendação/modelo para o usuário ou para todos |
| Análise | Equipe revisa dados, regra, cobertura, modelo e fonte |
| Resposta | Explica resultado, corrige dado/perfil ou mantém com justificativa |
| Recurso | Encaminha a revisor diferente quando a contestação persistir |
| Aprendizado | Atualiza regra/dado/modelo sem usar o caso para treinamento incompatível |
| Encerramento | Retém o mínimo necessário para prova e métricas agregadas |

O usuário não deve ser obrigado a aceitar perfilização para abrir contestação. O canal também deve estar disponível quando a personalização estiver desativada, para corrigir dados utilizados no serviço.

## 6. Monitoramento e indicadores

| Indicador | Meta inicial |
|---|---|
| Contas excluídas sem aviso válido | Zero |
| Contas pagas excluídas indevidamente | Zero |
| Solicitações de reativação atendidas dentro do período | 100% automatizável |
| Exclusões com falha em operador | Alertar em até 24h |
| Perfis/embeddings remanescentes após exclusão | Zero identificável fora de exceção documentada |
| Revogações sem bloqueio de tratamento opcional | Zero; alerta imediato |
| Contestação sem protocolo | Zero |
| Casos de alto risco revisados por humano | 100% |
| Jobs de exclusão idempotentes e testados | 100% |

## 7. Checklist de implementação

| Prioridade | Entrega | Dono sugerido |
|---|---|---|
| P0 | Inventário de tabelas, buckets, caches, vetores, prompts, logs e operadores | Engenharia + Privacidade |
| P0 | Bloqueio de exclusão de contas pagas, legal hold e solicitações abertas | Backend + Financeiro |
| P0 | Critério de atividade significativa e estados do ciclo de vida | Produto + Jurídico |
| P0 | Notificações de 12/17/18 meses e período de recuperação | Produto + E-mail |
| P0 | Job idempotente, auditável e com retry | Backend/SRE |
| P1 | Privacy Center com perfil e IA separados de cookies | Frontend + Privacidade |
| P1 | Contestação com protocolo, SLA e revisão humana | Produto + Suporte |
| P1 | DPA e instruções de exclusão a todos os operadores | Jurídico |
| P1 | Política de Retenção publicada e matriz interna aprovada | Privacidade |
| P2 | Testes de reidentificação, restauração, backups e exclusão ponta a ponta | Segurança |
| P2 | Auditoria anual e revisão de prazos | Jurídico + DPO/encarregado |

## 8. Alternativas de implementação

| Abordagem | Trade-offs | Custo | Complexidade de configuração |
|---|---|---|---|
| Job diário no backend com fila e dashboard interno | Melhor auditabilidade e controle; exige engenharia de dados e observabilidade | Médio, sem custo por execução relevante em infraestrutura existente | Média/alta |
| Job semanal com funções agendadas e painel mínimo | Mais simples e barato; menor capacidade de diagnóstico e resposta rápida | Baixo | Média |
| Processo manual mensal com relatório | Serve apenas como contingência inicial; risco alto de erro humano e escala limitada | Baixo no início, alto operacionalmente | Baixa |

Para a MEDIA Rate, a primeira alternativa é a mais adequada se houver volume crescente, IA e múltiplos operadores. A alternativa semanal pode ser usada como primeira entrega se o volume for pequeno. A execução deve ocorrer em infraestrutura persistente do próprio produto, não depender de uma sessão manual ou de um navegador aberto.

## 9. Referências

[1]: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm "Lei nº 13.709/2018 — LGPD"

[2]: https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02016R0679-20160504 "Regulamento (UE) 2016/679 — GDPR consolidado"

[3]: https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm "Lei nº 12.965/2014 — Marco Civil da Internet"

[4]: https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf/@@display-file/file "ANPD — Cookies e proteção de dados pessoais"

[5]: https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024 "Resolução CD/ANPD nº 19/2024 — transferências internacionais"

## Conclusão

A implementação deve ser tratada como projeto de **governança de ciclo de vida dos dados**, não apenas como automação de limpeza. A sequência recomendada é: inventariar onde os dados existem; aprovar prazos por finalidade; implementar avisos e recuperação; bloquear exceções; excluir dados primários e derivados; propagar a exclusão a operadores; monitorar falhas; e manter apenas a evidência mínima legalmente necessária.

A exclusão automática pode ser compatível com LGPD e GDPR quando for previsível, informada, reversível antes da destruição, tecnicamente completa e sujeita a exceções documentadas. O principal risco da MEDIA Rate seria excluir o perfil errado, excluir dados ainda necessários à prestação da assinatura ou deixar perfil, embedding, prompt ou cache identificável ativo após a exclusão declarada.
