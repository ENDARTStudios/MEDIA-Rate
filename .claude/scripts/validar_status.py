#!/usr/bin/env python3
"""validar_status.py — gate de forma do STATUS do Doer (T297/D-280).

Valida um payload STATUS contra .claude/schemas/status.schema.json usando
jsonschema (já presente no ambiente) + checagens manuais de regras
cruzadas que o JSON Schema não expressa bem:

- DONE exige duracao_minutos > 0 (metricas reais, nunca placeholder);
- test_output: passed + failed <= total;
- command_output: exit_code inteiro (aceita string numérica);
- commit_hash: dados.hash é hash git válido (7-40 hex).

Uso:
  python .claude/scripts/validar_status.py <arquivo.json>   # arquivo
  cat status.json | python .claude/scripts/validar_status.py  # stdin

Saída: "validator: OK" (exit 0) ou lista de violações (exit 1).
Sem novas dependências além de jsonschema.
"""

import json
import os
import re
import sys

BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCHEMA_PATH = os.path.join(BASE, ".claude", "schemas", "status.schema.json")

try:
    import jsonschema
    from jsonschema import Draft7Validator
except ImportError:  # pragma: no cover — ambiente sem jsonschema
    jsonschema = None
    Draft7Validator = None

HASH_RE = re.compile(r"^[0-9a-f]{7,40}$")

# Windows cp1252 não suporta '✗' no stdout — força UTF-8 (ou substitui).
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def _num(v):
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def validar_estrutura(payload):
    """Violações do JSON Schema estrutural."""
    if jsonschema is None or Draft7Validator is None:
        return ["jsonschema indisponível no ambiente — instale com 'pip install jsonschema'"]
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        schema = json.load(f)
    erros = []
    for err in sorted(
        Draft7Validator(schema).iter_errors(payload),
        key=lambda e: list(e.path),
    ):
        caminho = ".".join(str(p) for p in err.path) or "<root>"
        erros.append(f"[schema] {caminho}: {err.message}")
    return erros


def validar_regras_cruzadas(payload):
    """Regras manuais (cruzadas) sobre o payload já estruturalmente válido."""
    erros = []
    status = payload.get("status")
    metricas = payload.get("metricas") or {}

    if status == "DONE":
        duracao = metricas.get("duracao_minutos")
        if not isinstance(duracao, (int, float)) or duracao <= 0:
            erros.append("[metricas] DONE exige duracao_minutos > 0 (real, não placeholder)")
        inicio = metricas.get("inicio_utc")
        fim = metricas.get("fim_utc")
        if inicio and fim and inicio == fim:
            erros.append("[metricas] inicio_utc e fim_utc não podem ser idênticos em DONE")

    for i, ev in enumerate(payload.get("evidencia") or []):
        tipo = ev.get("tipo")
        dados = ev.get("dados") or {}
        if tipo == "command_output":
            ec = _num(dados.get("exit_code"))
            if ec is None:
                erros.append(f"[evidencia[{i}] command_output] exit_code deve ser inteiro")
        elif tipo == "test_output":
            total = _num(dados.get("total"))
            passed = _num(dados.get("passed"))
            failed = _num(dados.get("failed"))
            if total is not None and passed is not None and failed is not None:
                if passed + failed > total:
                    erros.append(
                        f"[evidencia[{i}] test_output] passed+failed ({passed}+{failed}) > total ({total})"
                    )
            else:
                erros.append(f"[evidencia[{i}] test_output] total/passed/failed devem ser numéricos")
        elif tipo == "commit_hash":
            h = dados.get("hash")
            if not isinstance(h, str) or not HASH_RE.match(h):
                erros.append(f"[evidencia[{i}] commit_hash] dados.hash inválido: {h!r}")

    return erros


def main():
    if len(sys.argv) > 1:
        caminho = sys.argv[1]
        # utf-8-sig tolera BOM (arquivos gerados no Windows/PowerShell).
        with open(caminho, "r", encoding="utf-8-sig") as f:
            payload = json.load(f)
    else:
        payload = json.loads(sys.stdin.read().lstrip("\ufeff"))

    erros = validar_estrutura(payload) + validar_regras_cruzadas(payload)

    if erros:
        print("validator: FAIL")
        for e in erros:
            print(f"  ✗ {e}")
        return 1
    print("validator: OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
