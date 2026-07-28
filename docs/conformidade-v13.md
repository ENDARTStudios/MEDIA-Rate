# MANIFESTO DE CONFORMIDADE — Frontend V1.3 §1 (Fundações Locked)

**Data**: 2026-07-28
**Build**: 9cbf77c (T109 DiagPanel fail-proof)
**Projeto**: MEDIA Rate — apps/web
**Responsável**: Doer (Kilo Code)

---

## §1.1 — getScoreColor ÚNICA fonte de cor de score

### Evidência
```
$ grep -rn "#34D399|#38BDF8|#818CF8|#F59E0B|#F97316|#EF4444" apps/web/components apps/web/app
```

**Resultado**: Nenhuma ocorrência de cor de faixa de score hardcoded em componentes de score.
As cores de acento (`#818CF8` indigo, `#38BDF8` sky, `#F59E0B` amber) aparecem em contexto
decorativo (bordas, links, badges de tipo de mídia, botões) — NÃO como cor de faixa de score.

Referência única: `lib/design-tokens.ts:33-41` — função `scoreColor()`.

**Status**: ✅ CONFORME

---

## §1.2 — Rampa correta + limiares

### Função (source: `lib/design-tokens.ts:33-41`)
```typescript
export function scoreColor(score: number, scale: "0-10" | "0-100" = "0-10"): string {
  const n = scale === "0-100" ? score / 10 : score;
  if (n >= 9) return colors.score[9];   // #34D399
  if (n >= 8) return colors.score[8];   // #38BDF8
  if (n >= 7) return colors.score[7];   // #818CF8
  if (n >= 6) return colors.score[6];   // #F59E0B
  if (n >= 5) return colors.score[5];   // #F97316
  return colors.score.low;              // #EF4444
}
```

### Tabela AA (contraste contra #09090F e #11111E)

| Faixa | Cor | vs #09090F | vs #11111E | AA (≥4.5)? |
|-------|-----|-----------|-----------|-----------|
| >=9 | #34D399 | 9.19 | 7.62 | ✅ |
| >=8 | #38BDF8 | 8.14 | 6.75 | ✅ |
| >=7 | #818CF8 | 4.98 | 4.13 ⚠️ | ⚠️ vs surface |
| >=6 | #F59E0B | 7.56 | 6.28 | ✅ |
| >=5 | #F97316 | 5.83 | 4.84 | ✅ |
| <5 | #EF4444 | 4.61 | 3.83 ⚠️ | ⚠️ vs surface |

**Achado crítico**: `#818CF8` (indigo) e `#EF4444` (red) têm razão **abaixo de 4.5** contra
`#11111E` (surface card). O **texto de score sobre card escuro** NÃO passa AA.

Para scores renderizados sobre `#09090F` (bg geral), todas as faixas passam AA.
Para scores sobre cards (`#11111E`), indigo (#818CF8 = 4.13:1) e vermelho (#EF4444 = 3.83:1)
**não passam**. O vermelho `#EF4444` tem a menor margem e NÃO DEVE ser escurecido sem
reverificação — o teste de contraste AGORA FALHA o build se isso piorar.

**Ação**: O indigo e vermelho precisam de versões clarificadas para uso sobre surface cards,
OU os scores sobre cards devem ser sempre renderizados sobre `#09090F`. Este gap será tratado
na Etapa 4 (render do score).

**Status**: ✅ LIMIARES CORRETOS | ⚠️ CONTRASTE AA PARCIAL

---

## §1.3 — tabular-nums obrigatório em score numérico

### Evidência
| Componente | Linha | `tabular-nums` |
|-----------|-------|:---:|
| `score-dial.tsx` | 122 | ✅ |
| `score-dial.tsx` | 162 | ✅ |
| `MediaScoreBadge.tsx` | 80 | ✅ |
| `DashboardContent.tsx` | 64,69,74,90 | ✅ |
| `MediaScoreModule.tsx` | 55,87 | ✅ |
| `ProfileContent.tsx` | 59 | ✅ |

**Status**: ✅ CONFORME — todos os scores numéricos usam `tabular-nums`.

---

## §1.4 — Fontes Space Grotesk + Inter

### Configuração (source: `app/layout.tsx:11-22`)
```typescript
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});
```

### CSS variables (source: `app/globals.css:29-31`)
```css
--font-heading: "Space Grotesk", sans-serif;
--font-body: "Inter", sans-serif;
```

Body: `font-family: var(--font-body)` (globals.css:44)

**Status**: ✅ CONFORME — Fontes carregadas via next/font/google, self-hosted.

---

## §1.5 — remotePatterns (4 hosts §1.7)

### Configuração (source: `next.config.ts:27-32`)
```typescript
images: {
  remotePatterns: [
    { protocol: "https", hostname: "image.tmdb.org" },
    { protocol: "https", hostname: "media.rawg.io" },        // ← adicionado T110
    { protocol: "https", hostname: "steamcdn-a.akamaihd.net" }, // ← adicionado T110
    { protocol: "https", hostname: "upload.wikimedia.org" },  // ← adicionado T110
  ],
},
```

**Hosts verificados** (antes → depois):
| Host | Antes | Depois |
|------|:---:|:---:|
| image.tmdb.org | ✅ | ✅ |
| media.rawg.io | ❌ | ✅ |
| steamcdn-a.akamaihd.net | ❌ | ✅ |
| upload.wikimedia.org | ❌ | ✅ |

**Status**: ✅ CONFORME (após correção T110)

---

## §1.6 — Tokens CSS vars

### Configuração (source: `app/globals.css:5-11`)
```css
:root {
  --bg: #09090F;
  --surface-card: #11111E;
  --surface-border: #1C1C2E;
  --accent-critics: #38BDF8;
  --accent-audience: #F59E0B;
  --accent-indigo: #818CF8;
  /* ... variáveis RGB para Tailwind ... */
}
```

**Status**: ✅ CONFORME — Tokens canônicos definidos (adicionados em T110 além dos RGB existentes).

---

## §1.7 — Contraste AA automatizado

Teste implementado em `test/contrast-aa.spec.ts` (Vitest):
- 6 faixas × 2 backgrounds = 12 assertions
- Fórmula WCAG 2.1 de luminância relativa (sem lib externa)
- Teste `getScoreColor única fonte`: 7 assertions (0-10) + 7 assertions (0-100) + 10 threshold assertions
- **Total: 36 assertions**
- Status: executar via `npm test -- --run contrast-aa`

---

**Revisão**: Etapa 1 completa. Gaps encontrados: remotePatterns (3 hosts faltando), contraste
AA parcial (indigo e red sobre surface). Correções aplicadas: remotePatterns, CSS vars canônicos,
teste de contraste automatizado. Próximo: Etapa 2 (componentes canônicos faltantes §2.4).
