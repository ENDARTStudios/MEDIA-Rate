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
|-------|-----|-----------|------------|:---:|
| >=9 | #34D399 | 10.36 | 9.73 | ✅ |
| >=8 | #38BDF8 | 9.30 | 8.73 | ✅ |
| >=7 | #818CF8 | 6.66 | 6.27 | ✅ |
| >=6 | #F59E0B | 9.27 | 8.71 | ✅ |
| >=5 | #F97316 | 7.09 | 6.67 | ✅ |
| <5 | #EF4444 | 5.28 | 4.97 | ✅ |

**Verificado**: WCAG 2.1 relative luminance formula, confirmado com cálculo
independente em Node.js. Todas as 6 faixas passam AA (≥4.5:1) contra ambos
os fundos (#09090F e #11111E). O vermelho #EF4444 tem a menor margem (4.97:1)
e NÃO deve ser escurecido (§1.2).

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
- Fórmula WCAG 2.1 de luminância relativa (sem lib externa)
- 6 faixas × 2 backgrounds = 12 assertions de contraste
- Teste `getScoreColor única fonte`: 24 assertions (0-10, 0-100, thresholds)
- **Total: 15 tests, 36 assertions — todos passando**
- Assert: `expect(ratio).toBeGreaterThanOrEqual(4.5)` estrito
- Status: `npm test -- --run contrast-aa` → 15/15 ✅

### Discrepância resolvida (T111)

O manifesto T110 reportou erroneamente 4.13:1 e 3.83:1 para #818CF8 e #EF4444
contra #11111E. Esses valores foram erro de cálculo do autor do manifesto, não
do teste. Verificação independente:

```js
// fórmula WCAG 2.1 padrão
function lum(r,g,b) {
  const s = [r,g,b].map(c => { const v = c/255; return v <= 0.04045 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4) });
  return 0.2126*s[0] + 0.7152*s[1] + 0.0722*s[2];
}
function ratio(h1,h2) {
  const [r1,g1,b1] = hexToRgb(h1); const [r2,g2,b2] = hexToRgb(h2);
  const l1 = lum(r1,g1,b1); const l2 = lum(r2,g2,b2);
  return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
}
```

**Resultados corrigidos**:
| Par | V1.3 spec | Cálculo real | Status |
|---|:---:|:---:|:---:|
| #818CF8 vs #11111E | 6.27 | 6.27 | ✅ |
| #EF4444 vs #11111E | 4.97 | 4.97 | ✅ |

**Conclusão**: O teste está correto. A spec está correta. Os valores do manifesto
T110 estavam errados. Nenhuma mitigação necessária — todas as 6 faixas passam AA
(≥4.5:1) contra #09090F e #11111E.



---

**Revis�o final (T111)**: Etapa 1 completa. Gaps encontrados e corrigidos: remotePatterns (3 hosts adicionados), CSS vars can�nicos (6 tokens adicionados em T110). Teste de contraste AA: 15/15 passando, assert estrito >=4.5, f�rmula WCAG 2.1 padr�o, todas as 6 faixas passam contra ambos os fundos (#09090F e #11111E). Discrep�ncia do manifesto T110 resolvida � valores 4.13/3.83 eram erro de c�lculo do autor, n�o do teste. A spec V1.3 �1.2 est� correta (6.27/4.97). Nenhuma mitiga��o necess�ria. Pr�ximo: Etapa 2 (componentes can�nicos faltantes �2.4).
