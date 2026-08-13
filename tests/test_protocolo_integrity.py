#!/usr/bin/env python3
"""Teste de Integridade do Protocolo — verifica schemas, hooks e estrutura.

Valida que todos os arquivos de governança do Kilo Code existem
e estão corretamente formatados.
"""

import os
import sys
import re
import json
import subprocess

# Windows cp1252 não suporta ✓/✗/⊘ no stdout — força UTF-8.
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

REQUIRED_FILES = [
    ".kilo/schemas/tarefa.md",
    ".kilo/schemas/status.md",
    ".kilo/schemas/review.md",
    ".kilo/schemas/erro_taxonomy.md",
    ".kilo/hooks/danger-guard.py",
    ".kilo/hooks/conventional-commit-guard.py",
    ".kilo/scripts/gerar_sync_simbiotico.py",
    ".claude/schemas/status.schema.json",
    ".claude/scripts/validar_status.py",
    "PLANO_MESTRE.md",
    "DECISOES.md",
    "worklog.md",
    ".gitignore",
]

REQUIRED_SECTIONS = {
    ".kilo/schemas/tarefa.md": [r"## Protocolo", r"tarefa_id", r"fase", r"objetivo", r"criterio_de_pronto"],
    ".kilo/schemas/status.md": [r"## Resposta do Doer", r"status.*DONE.*BLOCKED", r"evidencia"],
    ".kilo/schemas/review.md": [r"## Revis.o do Thinker", r"APPROVED", r"REJECTED", r"gates"],
    ".kilo/schemas/erro_taxonomy.md": [r"ENVIRONMENT", r"DEPENDENCY", r"BUILD", r"SECURITY"],
}

def check_files():
    errors = []
    for f in REQUIRED_FILES:
        path = os.path.join(BASE, f)
        if not os.path.exists(path):
            errors.append(f"[AUSENTE] {f}")
    return errors

def check_sections():
    errors = []
    for file_path, sections in REQUIRED_SECTIONS.items():
        path = os.path.join(BASE, file_path)
        if not os.path.exists(path):
            continue
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        for section in sections:
            if not re.search(section, content, re.IGNORECASE):
                errors.append(f"[SEÇÃO AUSENTE] {file_path}: esperado '{section}'")
    return errors

def check_gitignore():
    path = os.path.join(BASE, ".gitignore")
    if not os.path.exists(path):
        return [".gitignore ausente"]
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    required = [".env", "node_modules/", ".kilo/exchange_log.jsonl"]
    missing = [r for r in required if r not in content]
    if missing:
        return [f".gitignore não contém: {', '.join(missing)}"]
    return []

def check_hooks_executable():
    errors = []
    if sys.platform != "win32":
        for hook in [".kilo/hooks/danger-guard.py", ".kilo/hooks/conventional-commit-guard.py"]:
            path = os.path.join(BASE, hook)
            if os.path.exists(path) and not os.access(path, os.X_OK):
                errors.append(f"[PERMISSÃO] {hook} não é executável (chmod +x)")
    return errors


# T297/D-280: STATUS inválido de exemplo — deve ser REJEITADO pelo validator.
_STATUS_INVALIDO = {
    "sync": {"projeto": "p", "fase": "f", "tarefa_atual": "t", "ultimo_status": "DONE",
             "proxima_acao": "x", "responsavel": "Doer"},
    "tarefa_id": "T-exemplo",
    "fase": "f11",
    "status": "DONE",
    # commit ausente; evidencia commit_hash sem dados.hash; metricas zeradas.
    "evidencia": [{"tipo": "commit_hash", "resumo": "sem hash", "dados": {}}],
    "metricas": {"inicio_utc": "2026-08-10T21:00:00Z", "fim_utc": "2026-08-10T21:00:00Z",
                 "duracao_minutos": 0},
}


def check_migrations_e55p04():
    """D-293/D-236: nenhuma migration pode misturar ALTER TYPE ... ADD VALUE
    com DML (INSERT/UPDATE/DELETE/SELECT) no mesmo arquivo — PG12+ responde
    E55P04 ('unsafe use of new enum value') e a migration falha em produção."""
    base = os.path.join(BASE, "apps", "api", "prisma", "migrations")
    erros = []
    if not os.path.isdir(base):
        return ["[E55P04] diretorio de migrations nao encontrado"]
    for folder in sorted(os.listdir(base)):
        mfile = os.path.join(base, folder, "migration.sql")
        if not os.path.exists(mfile):
            continue
        raw = open(mfile, "r", encoding="utf-8").read()
        # remove linhas de comentario (-- ...) antes do scan de DML
        sem_comentarios = "\n".join(l for l in raw.splitlines() if not l.strip().startswith("--"))
        conteudo = sem_comentarios.upper()
        has_add_value = "ALTER TYPE" in conteudo and "ADD VALUE" in conteudo
        has_dml = any(tok in conteudo for tok in ["INSERT INTO", "UPDATE ", "DELETE FROM", "SELECT ", "DROP POLICY", "CREATE POLICY"])
        if has_add_value and has_dml:
            erros.append(f"[E55P04] {folder}: ALTER TYPE ADD VALUE + DML no mesmo arquivo (D-236)")
    return erros

def check_status_validator():
    """T297: o script validar_status.py existe e REJEITA um STATUS inválido."""
    script = os.path.join(BASE, ".claude", "scripts", "validar_status.py")
    if not os.path.exists(script):
        return ["[T297] .claude/scripts/validar_status.py ausente"]
    try:
        proc = subprocess.run(
            [sys.executable, script],
            input=json.dumps(_STATUS_INVALIDO),
            capture_output=True,
            text=True,
            timeout=30,
        )
    except Exception as e:  # noqa: BLE001
        return [f"[T297] validar_status.py falhou ao executar: {e}"]
    if proc.returncode == 0:
        return ["[T297] validator aceitou um STATUS inválido (deveria rejeitar)"]
    return []

def main():
    print("=== Teste de Integridade do Protocolo Kilo ===\n")

    all_errors = []

    print("[1/5] Verificando arquivos obrigatórios...")
    errors = check_files()
    for e in errors:
        print(f"  ✗ {e}")
    if not errors:
        print(f"  ✓ Todos os {len(REQUIRED_FILES)} arquivos presentes.")
    all_errors.extend(errors)

    print("\n[2/5] Verificando seções obrigatórias nos schemas...")
    errors = check_sections()
    for e in errors:
        print(f"  ✗ {e}")
    if not errors:
        print("  ✓ Todas as seções obrigatórias presentes.")
    all_errors.extend(errors)

    print("\n[3/5] Verificando .gitignore...")
    errors = check_gitignore()
    for e in errors:
        print(f"  ✗ {e}")
    if not errors:
        print("  ✓ .gitignore contém todas as entradas obrigatórias.")
    all_errors.extend(errors)

    print("\n[4/5] Verificando permissões de hooks...")
    if sys.platform == "win32":
        print("  ⊘ Plataforma Windows — permissões de execução não aplicáveis.")
    else:
        errors = check_hooks_executable()
        for e in errors:
            print(f"  ✗ {e}")
        if not errors:
            print("  ✓ Todos os hooks são executáveis.")
        all_errors.extend(errors)

    print("\n[5/6] Verificando validator de STATUS (T297)…")
    errors = check_status_validator()
    for e in errors:
        print(f"  ✗ {e}")
    if not errors:
        print("  ✓ validator de STATUS presente e rejeita STATUS inválido.")

    print("\n[6/6] Verificando migrations (E55P04/D-236)…")
    for e in check_migrations_e55p04():
        print(f"  \u2717 {e}")
    if not check_migrations_e55p04():
        print("  \u2713 migrations sem ADD VALUE + DML misturados.")

    print("\n[7/6] Verificando estrutura do projeto...")
    if os.path.exists(os.path.join(BASE, "apps/web/next.config.ts")):
        print("  ✓ Frontend Next.js detectado (apps/web)")
    else:
        print("  ✗ Frontend apps/web não encontrado")
    if os.path.exists(os.path.join(BASE, "apps/api")):
        print("  ✓ Backend API detectado (apps/api)")
    else:
        print("  ⊘ Backend apps/api não encontrado (pode ser ok nesta fase)")

    print(f"\n{'='*50}")
    if all_errors:
        print(f"FALHOU — {len(all_errors)} erro(s) encontrado(s)")
        sys.exit(1)
    else:
        print("OK — Todos os testes de integridade passaram.")
        sys.exit(0)

if __name__ == "__main__":
    main()
