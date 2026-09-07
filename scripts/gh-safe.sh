#!/bin/sh
# gh-safe.sh (T046/D-481) — executa `gh` sem o GITHUB_TOKEN sombreado.
#
# O harness injeta GITHUB_TOKEN inválido no ambiente de cada shell; por
# precedência ele invalida o `gh`, embora o login do keyring esteja válido.
# Este wrapper remove APENAS a variável sombra (unset, processo-filho) e
# repassa os argumentos ao `gh` real. Nunca seta, exibe ou persiste credencial.
# Uso: sh scripts/gh-safe.sh auth status  (até o P010 morrer)
unset GITHUB_TOKEN
exec gh "$@"
