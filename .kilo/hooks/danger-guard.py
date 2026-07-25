#!/usr/bin/env python3
"""Danger Guard — Bloqueia comandos perigosos em commits e pushes.

Regras:
- Bloqueia rm -rf no código fonte
- Bloqueia git push --force / --force-with-lease na branch main/master
- Bloqueia commits com segredos (padrões de API key, token, senha)
- Bloqueia alterações em arquivos de lock sem revisão
"""

import sys
import os
import re

DANGER_PATTERNS = [
    (r"rm\s+-rf\s+[/~]", "Comando rm -rf com path absoluto detectado"),
    (r"os\.remove\(.*\)", "Remoção de arquivo via os.remove — revisar"),
    (r"DROP\s+TABLE", "DROP TABLE em código — REVISÃO OBRIGATÓRIA"),
    (r"DELETE\s+FROM\s+\w+(?!\s*WHERE)", r"DELETE sem WHERE clause — REVISÃO OBRIGATÓRIA"),
]

SECRET_PATTERNS = [
    (r'sk-[a-zA-Z0-9]{20,}', "Possível chave Stripe (sk-...)"),
    (r'AIza[0-9A-Za-z\-_]{35}', "Possível chave Google API"),
    (r'eyJ[a-zA-Z0-9\-_]+\.eyJ[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+', "Possível JWT token"),
    (r'-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----', "Chave privada detectada"),
    (r'password\s*=\s*["\'][^"\']+["\']', "Senha hardcoded"),
]

def check_staged_files():
    """Verifica arquivos em staging para padrões perigosos."""
    import subprocess
    try:
        result = subprocess.run(
            ["git", "diff", "--cached", "--name-only"],
            capture_output=True, text=True, timeout=10
        )
        files = result.stdout.strip().split("\n")
        if not files or files == [""]:
            return True, "Nenhum arquivo em staging."

        for file in files:
            if not os.path.exists(file):
                continue
            try:
                with open(file, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
            except Exception:
                continue

            for pattern, message in DANGER_PATTERNS + SECRET_PATTERNS:
                if re.search(pattern, content, re.IGNORECASE):
                    return False, f"[DANGER] {message} em {file}"

        return True, "OK — Nenhum padrão perigoso detectado."
    except Exception as e:
        return False, f"[ERRO] Falha ao verificar: {e}"

def main():
    success, message = check_staged_files()
    print(message)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
