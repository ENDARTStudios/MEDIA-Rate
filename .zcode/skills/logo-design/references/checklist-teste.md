# Checklist de teste do logo

> Um logo só termina depois de sobreviver a esta lista. Parte é determinística
> (`logo-audit.mjs`, `logo-render.mjs`); o resto é julgamento — renderize o PNG e
> **olhe**, principalmente em 16 e 32 px.

## 1. Escala

- [ ] **16 px (favicon):** a ideia sobrevive; nenhum detalhe vira borrão. Se não,
      desenhe uma **versão pequena** (menos elementos, vão maior, traço mais grosso).
- [ ] **24–32 px** (avatar, lista de apps): reconhecível de relance.
- [ ] **Muito grande:** curvas sem "lombada", ângulos exatos; defeito invisível
      pequeno fica gritante.
- [ ] **Tamanho mínimo documentado:** encolha até perder a identidade; o tamanho
      logo acima é o mínimo (px digital / mm impresso).

## 2. Cor e valor

- [ ] Funciona em **uma cor** (tinta sobre papel e luz sobre mesa).
- [ ] Funciona **reverso** e não parece mais pesado que o positivo — luz sobre
      escuro "irradia". Aplicar **fino de ~2–5%** no reverso.
- [ ] Sobre a mesa (`#08080C`), sobre papel (`#F4F1EA`), sobre a cor de trabalho
      e sobre foto/padrão — se não houver contraste, use um dispositivo (contorno
      ou container).
- [ ] **Greyscale** separa por valor; nada depende só de matiz.
- [ ] Cores reproduzem em CMYK (e Pantone se a cor for crítica).

## 3. Forma

- [ ] **Squint/blur:** só a silhueta já é distintiva.
- [ ] **Espelho:** virar revela proporção errada que o olho já tinha aceitado.
- [ ] **Rotações 90°/180° e tamanho minúsculo:** sem letra, corpo, símbolo
      religioso/político, placa de perigo ou leitura ofensiva acidental.
- [ ] **Correções ópticas:** overshoot de curvas/ápices, irradiação no reverso,
      horizontais levemente mais finas, centro óptico acima do geométrico.
- [ ] **Geometria limpa:** primitivos perfeitos, ângulos inteiros, raios e traços
      consistentes (`logo-audit` sinaliza near-miss).
- [ ] **Equilíbrio:** não parece tombado; peso distribuído; pegada perto de
      quadrada (0,8–1,25:1).
- [ ] **Teste da letra:** cada letra modificada ainda lê como a letra pretendida
      de primeira (um K que lê como h volta pra mesa).
- [ ] **Junções:** sem entalhe, rebarba, caroço, fresta de 1 px ou "ink trap" nos
      encontros de traço.
- [ ] **Peer test:** ao lado de 3–4 marcas resolvidas no mesmo tamanho, a nossa
      parece igualmente resolvida.

## 4. Distinção e originalidade

- [ ] **Shelf test:** entre concorrentes (ou entre as marcas de referência que
      você estudou), destaca em vez de se misturar.
- [ ] **Familiaridade:** não lembra uma marca existente. Se parece familiar e não
      é nossa, é de alguém.
- [ ] **Nada copiado** de biblioteca/repertório; sem traço, asset ou "inspiração
      próxima" de terceiro.
- [ ] **Trademark:** recomendar busca profissional (INPI/USPTO/EUIPO) e imagem
      reversa. **Não damos clearance.**

## 5. Significado e encaixe

- [ ] A ideia se explica em **uma frase**.
- [ ] Tom bate com os adjetivos do brief (seco/redondo, pesado/leve, quente/frio).
- [ ] **Identifica, não explica:** funciona sem tagline e, para símbolo, sem o nome.
- [ ] Continua fazendo sentido se o produto crescer (não trava em uma feature).
- [ ] Leitura cultural de cor/símbolo conferida para o público.

## 6. Mídia e produção

- [ ] Uma cor na impressão, bordado (vão ≥ ~1 mm no peito), gravação, corte
      vinil, sinalização, dark mode, animação.
- [ ] Ícone de app opticamente dimensionado no tile (52–58%), sem detalhe fino.
- [ ] Avatar sobrevive a recorte circular.
- [ ] Master vetorial puro, texto em contorno, sem filtro/raster, viewBox limpo
      (`logo-audit.mjs` sem FAIL).
- [ ] PNGs conferidos: 16/24/32/64/512 com dimensão certa (`logo-render.mjs`).

## 7. Contexto

- [ ] 5–6 **mockups reais do negócio** (ficha de obra, header, e-mail, cartão
      social, tile do app — não "sacola de ginástica" genérica), no mesmo estilo.
- [ ] Lockups horizontal/vertical/símbolo testados nos tamanhos de uso.
- [ ] Aplicação na UI real não introduz anti-padrão D-065 (glow, glass, gradiente).

## Como registrar o resultado

Ao apresentar/entregar, resuma em tabela:

| Teste | Resultado | Ajuste |
|---|---|---|
| 16 px | passa | vão mantido em 16 u = 1 px |
| reverso | passou após fino de 3% | irradiação |
| shelf | destaca | — |
| trademark | **pendente** | busca profissional |

Diga o que passou, o que foi ajustado (com número: "vão de 6 → 10 u para
sobreviver a 16 px") e o que fica pendente com quem. **Nunca afirme teste que
não rodou.**
