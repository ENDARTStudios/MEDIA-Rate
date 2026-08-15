# UI Motion Principles (D-318)

> Referência: github.com/kylezantos/design-principles. Padrão obrigatório de UI
> no MEDIA Rate. Objetivo: feedback visual rico em todos os elementos —
> percepção de rapidez e confiança mesmo em rede lenta — sem regredir
> Lighthouse (performance > 90 é gate).

## 1. Regras inegociáveis

1. **Skeleton proporcional** — toda lista/grid tem skeleton com a MESMA
   proporção do conteúdo real (nunca um retângulo genérico).
2. **Lazy-load nativo** — toda imagem usa `loading="lazy"` + placeholder blur;
   dimensões (`width`/`height`) sempre presentes (anti-CLS).
3. **Transições de rota** — saída 150ms + entrada 200ms `ease-out` (View
   Transitions API; fallback para browsers sem suporte).
4. **Botão async** — todo botão com ação assíncrona tem estado `loading` (spinner
   inline) + `disabled`; reverte em erro.
5. **Progresso não-bloqueante** — todo conteúdo assíncrono tem indicador de
   progresso discreto (spinner), nunca um overlay bloqueante.

## 2. Componentes base (apps/web/src/components/ui)

| Componente | Função | Status |
|---|---|---|
| `skeleton.tsx` | placeholder com variantes text/card/circle/rect | ✅ (T059) |
| `spinner.tsx` | spinner de carregamento (sm/md/lg) | ✅ (T059) |
| `lazy-image.tsx` | `loading=lazy` + blur + fade-in + fallback | ✅ (T351) |
| `progress.tsx` | indicador não-bloqueante (spinner + rótulo) | ✅ (T351) |

Hook `use-motion-pref.ts` (T351): retorna `"full" | "reduced" | "none"`.

- `full` → animações completas.
- `reduced` → `prefers-reduced-motion: reduce` → fade curto 100ms.
- `none` → override explícito (`localStorage["mediarate:motion"]="none"`) → só
  transição de estado.

## 3. Inventário (35 rotas)

Classificação do que cada página precisa (`S` = skeleton, `L` = lazy-load,
`A` = animação). "Públicas primeiro" (o que o usuário vê antes de logar).

| Rota | Público | S | L | A | Observação |
|---|---|---|---|---|---|
| `/` (home) | ✅ | ✅ | ✅ | ✅ | hero já animado (T296) |
| `/catalog` | ✅ | ✅ | ✅ | ✅ | grid com initialData SSR (D-063) |
| `/discover` | ✅ | ✅ | ✅ | ✅ | idem |
| `/media/[slug]` | ✅ | ✅ | ✅ | ⬜ | ficha |
| `/game/[id]` / `/movie/[id]` | ✅ | ✅ | ✅ | ⬜ | legadas → redirect (T338) |
| `/pricing` / `/faq` / `/methodology` / `/sources` / `/about` / `/terms` / `/privacy` | ✅ | ⬜ | ⬜ | ⬜ | conteúdo estático |
| `/compare` / `/feedback` / `/user/[id]` / `/design-system` | ✅ | ⬜ | ⬜ | ⬜ | — |
| `/login` / `/register` / `/checkout/[plan]` | ✅ | ⬜ | ⬜ | ⬜ | forms (botão async = regra 4) |
| `/dashboard` / `/dashboard/discoveries` | ⬜ | ✅ | ✅ | ✅ | charts já animam (T295) |
| `/watchlist` / `/historico` / `/listas` / `/listas/[slug]` | ⬜ | ✅ | ✅ | ⬜ | kanban (T200) |
| `/profile` / `/settings` / `/assistant` / `/discoveries` / `/user/data` / `/onboarding` | ⬜ | ⬜ | ⬜ | ⬜ | — |
| `/admin` / `/admin/diagnostics` | ⬜ | ⬜ | ⬜ | ⬜ | interno |

## 4. Aplicação faseada

1. **Fase 1 (públicas):** home, catalog, discover, media/[slug] — as 4 que o
   usuário vê primeiro.
2. **Fase 2 (privadas):** dashboard, watchlist, listas.
3. **Fase 3 (resto):** static/auth/admin.

Cada fase: aplicar componentes base + testes visuais Playwright (antes/depois)
+ Lighthouse (gate > 90).

## 5. Regras de acessibilidade

- `prefers-reduced-motion` sempre respeitado via `useMotionPref`.
- Nunca eliminar feedback de ESTADO (spinner/skeleton) — só suavizar/remover
  a ANIMAÇÃO decorativa.
- Foco visível e `aria-live="polite"` nos indicadores de progresso.
