origin/main

## [2026-09-28] T110 - spec de medicao robustecido (BETA-GAP-13/14)
- apps/web/e2e/layout-plans-library.spec.ts: espera deterministica via waitForFunction (bbox NAO NULO de TODOS os cards/CTAs), emulateMedia(reducedMotion=reduce) para neutralizar animacoes do Motion/React, scrollIntoViewIfNeeded + document.fonts.ready + rAF duplo; falha reporta INDICE+SELETOR exatos; sem sleep/skip/fixme. Biblioteca permanece apenas como BASELINE (sem assert de densidade - BETA-GAP-14 fica para T111).
- Hygiene L1 aplicada (eslint --fix + tsc no arquivo alterado): eslint 0 erros; tsc OK.
- Branch fix/t107-beta-gap-13-14-layout atualizada com origin/main via merge commit (conflito only em worklog.md, resolvido preservando ambos os lados).