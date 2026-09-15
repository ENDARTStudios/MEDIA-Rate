# Pacote de revisão legal — 2026-09-15 (T464/D-504)

Pacote **datado e reproduzível** enviado à revisão legal externa. O parecer
deve citar estes arquivos (não URLs vivas, que mudam).

| Metadado | Valor |
|---|---|
| Commit de origem | `467657f` (main — merge do PR #96) |
| Data de exportação | 2026-09-15 |
| Destinatário | Revisão legal externa (gate legal da Política — D-498/D-504) |
| Origem dos exports | Páginas canônicas de **produção** (`mediarate.app`), deploy contínuo do commit acima |

## Índice

| Arquivo | Documento canônico | URL |
|---|---|---|
| `termos-pt-BR.pdf` | Termos de Uso (pt-BR) | https://mediarate.app/pt-BR/terms |
| `termos-en-US.pdf` | Terms of Service (en-US) | https://mediarate.app/en-US/terms |
| `termos-es-ES.pdf` | Términos de Uso (es-ES) | https://mediarate.app/es-ES/terms |
| `privacidade-pt-BR.pdf` | Política de Privacidade (pt-BR) | https://mediarate.app/pt-BR/privacy |
| `privacidade-en-US.pdf` | Privacy Policy (en-US) | https://mediarate.app/en-US/privacy |
| `privacidade-es-ES.pdf` | Política de Privacidad (es-ES) | https://mediarate.app/es-ES/privacy |

Documentos de apoio: `CHANGELOG-JURIDICO.md` (alterações desde a última
revisão) e `PERGUNTAS-ABERTAS.md` (4 perguntas + resolvidas por configuração).

## Regeneração

Os PDFs são exportações Chromium (`page.pdf`, A4, com backgrounds) das URLs
canônicas. Para reproduzir após novo deploy, a partir de `apps/web`
(playwright disponível):

```js
// exportar-legal.mjs
import { chromium } from "@playwright/test";
const [url, saida] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(2500);
await page.pdf({ path: saida, format: "A4", printBackground: true,
  margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" } });
await browser.close();
```

```bash
node exportar-legal.mjs https://mediarate.app/pt-BR/terms termos-pt-BR.pdf
```

Registrar sempre: commit de origem, data e URL exportada.
