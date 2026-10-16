# Template de especificação de UI-UX (obrigatório)

Toda spec de sessão usa **exatamente** estas 12 seções, nesta ordem. O objetivo é que duas sessões
diferentes possam ser comparadas linha a linha e que a implementação seja verificável por gate.

Regras de escrita:

1. **Ancoragem obrigatória.** Todo bloco aponta o componente real (`caminho/Arquivo.tsx:linha`). Se não
   existe implementação, marque **A CRIAR** e diga o que falta.
2. **Token, não valor.** Cor/espaço/raio/duração citados devem existir em `design-tokens.ts` ou nas
   variáveis de `globals.css`. Valor fora de token é **pendência**, não escolha.
3. **Estado é parte do desenho.** Os 7 estados da §5 são obrigatórios; "não se aplica" precisa de motivo.
4. **Nada de conceito novo.** A linguagem visual atual é a base. Melhoria entra como pendência datada,
   ligada a um achado ou a uma medição.
5. **Mensurável ou não entra.** Cada pendência tem severidade (P0 bloqueia AA/uso; P1 degrada; P2 polimento)
   e, quando possível, o número medido (contraste, ocorrências, rotas afetadas).
6. **Evidência reprodutível.** Comandos e caminhos das capturas, no fim.

---

## 1. Identidade da sessão

- **Objetivo do usuário** em uma frase (o que ele veio fazer aqui).
- **Persona/estado de conta**: anônimo · free · plus · premium · admin (diga o que muda por plano).
- **Rotas reais** e papel de cada uma (entrada, detalhe, resultado).
- **Entradas** (de onde se chega: nav, CTA da home, e-mail, deep link) e **saídas** (para onde se vai).
- **Fora de escopo** explícito (o que não é desta sessão).

## 2. Arquitetura de informação

Hierarquia de blocos, na ordem de leitura, com o componente que renderiza cada um (`arquivo:linha`).
Inclua o que é **above the fold** e o que é progressivo.

## 3. Layout, grid e densidade

- Containers e larguras máximas (com o padrão real do produto: `max-w-3xl`, `max-w-5xl`, `max-w-[38rem]`…).
- Grid de cards (colunas por breakpoint) e densidade.
- Regras de alinhamento e medida de leitura (limite de caracteres por linha).

## 4. Tokens em uso

Tabela: papel visual → token canônico → onde é aplicado. Separe **tokens** de **valores legados**
(hex/classe fora de token) e liste estes últimos como pendência.

## 5. Estados obrigatórios (os 7)

Para cada um: o que o usuário vê, o componente, e o que falta.

| Estado | O que se vê hoje | Componente | Falta |
|---|---|---|---|
| 1. Carregando (primeira carga) | | | |
| 2. Vazio (sem dados, com CTA) | | | |
| 3. Erro de rede (com retry) | | | |
| 4. Não encontrado (404 honesto) | | | |
| 5. Sem permissão / plano insuficiente | | | |
| 6. Dados parciais ou desatualizados | | | |
| 7. Offline / degradado | | | |

## 6. Micro-interações e movimento

Para cada animação: gatilho, propriedade (`transform`/`opacity` sempre que possível), duração e easing
**do token**, e o comportamento em `prefers-reduced-motion: reduce`.

## 7. Acessibilidade AA

- Hierarquia de títulos (h1→h6) da página.
- Foco visível, ordem de tabulação, atalhos.
- ARIA e regiões vivas (`aria-live` para resultado de ação).
- Contraste: pares medidos (mínimo 4,5:1 texto, 3:1 texto grande/ícone).
- Alvo de toque mínimo e rótulos de ícone.

## 8. Copy e i18n

- Namespace(s) de mensagem e chaves principais.
- Tom de voz por locale; o que **não** pode aparecer (promessa de "em breve" como disponível, PT em EN/ES).
- Textos que faltam (chaves A CRIAR) e textos que precisam mudar (com motivo).

## 9. Responsivo e plataformas

O que muda em 375 / 768 / 1024 / 1440; comportamento de teclado no mobile; uso de `viewport-fit=cover`.

## 10. Métricas de sucesso

O que medir (Core Web Vitals da rota, taxa de conclusão da tarefa, uso de cada filtro/seção, abandono).
Se não há instrumentação, diga o que falta instrumentar.

## 11. Pendências e achados

Tabela: severidade (P0/P1/P2) · descrição · evidência (número, `arquivo:linha`, rota) · dono
(eu / outro agente / Operador) · decisão ligada (`D-xxx`).

## 12. Evidência e reprodução

Comandos para reproduzir o que a spec afirma e caminho das capturas 1440/375.
