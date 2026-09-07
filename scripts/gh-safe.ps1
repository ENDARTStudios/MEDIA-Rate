#Requires -Version 5.1
<#
.SYNOPSIS
  gh-safe (T046/D-481) — executa `gh` sem o GITHUB_TOKEN sombreado.

.DESCRIPTION
  O harness injeta GITHUB_TOKEN inválido (40 chars) no escopo Process de cada
  shell; por precedência (GH_TOKEN > GITHUB_TOKEN > keyring) ele invalida o
  `gh`, embora o login do keyring (ENDARTStudios) esteja válido. Este wrapper
  remove APENAS a variável sombra do processo-filho e repassa os argumentos
  ao `gh` real. Nunca seta, exibe ou persiste credencial. Usar em todo
  comando `gh` até o P010 morrer (ver MANUAL_DO_OPERADOR.md).
  Se o keyring não tiver login, o `gh` falha sozinho → re-auth interativo
  é ação do Operador (STATUS BLOCKED PERMISSION_DENIED).
.EXAMPLE
  powershell -File scripts/gh-safe.ps1 auth status
  powershell -File scripts/gh-safe.ps1 pr view 74 --json number,state
#>
Remove-Item Env:GITHUB_TOKEN -ErrorAction SilentlyContinue
& gh @args
exit $LASTEXITCODE
