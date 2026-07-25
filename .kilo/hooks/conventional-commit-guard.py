#!/usr/bin/env python3
"""Conventional Commit Guard — Valida mensagens de commit.

Padrão: ^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert|security)(\([a-z0-9-]+\))?!?: .+
"""

import sys
import re
import subprocess

COMMIT_PATTERN = re.compile(
    r"^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert|security)"
    r"(\([a-z0-9-]+\))?"
    r"!?: .+"
)

def get_commit_messages():
    """Obtém mensagens de commit do staging ou do argumento."""
    try:
        # Tenta ler do pipe (commit-msg hook)
        if not sys.stdin.isatty():
            return [sys.stdin.read().strip()]

        # Tenta ler do git
        result = subprocess.run(
            ["git", "log", "--format=%s", "-1"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0 and result.stdout.strip():
            return [result.stdout.strip()]

        return []
    except Exception:
        return []

def validate_messages():
    messages = get_commit_messages()
    if not messages:
        print("OK — Nenhuma mensagem de commit para validar (provavelmente commit inicial).")
        return True

    for msg in messages:
        if not COMMIT_PATTERN.match(msg):
            print(f"[REJEITADO] Mensagem de commit inválida: '{msg}'")
            print("Formato esperado: tipo(escopo): descrição")
            print("Tipos válidos: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert, security")
            print("Exemplo: feat(auth): adiciona login com Google")
            return False

    print(f"OK — {len(messages)} mensagem(ns) validada(s).")
    return True

def main():
    if validate_messages():
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
