#!/usr/bin/env python3
"""Gerador de Sync Simbiótico — lê os arquivos de estado e gera o JSON de sync."""

import json
import os
from datetime import datetime, timezone

LOG_PATH = ".kilo/exchange_log.jsonl"
PLANO_PATH = "PLANO_MESTRE.md"

def load_last_log():
    if not os.path.exists(LOG_PATH):
        return {}
    try:
        with open(LOG_PATH, "r", encoding="utf-8") as f:
            lines = f.readlines()
            if lines:
                return json.loads(lines[-1])
    except Exception:
        pass
    return {}

def scan_plano():
    if not os.path.exists(PLANO_PATH):
        return {}
    try:
        with open(PLANO_PATH, "r", encoding="utf-8") as f:
            content = f.read()
        # Extrai fase atual
        import re
        fase_match = re.search(r"Fase\s+([\d.]+).*?(?=\n##|\Z)", content, re.DOTALL)
        return {"plano_existe": True, "tamanho_bytes": len(content)}
    except Exception:
        return {"plano_existe": False}

def main():
    last = load_last_log()
    plano = scan_plano()

    sync = {
        "projeto": last.get("projeto", "MEDIA Rate"),
        "fase": last.get("fase", "F00-setup"),
        "objetivo_atual": last.get("objetivo_atual", "Setup inicial"),
        "tarefa_atual": last.get("tarefa_atual", "T000-setup-inicial"),
        "ultimo_status": last.get("status", "IN_PROGRESS"),
        "ultima_evidencia": last.get("evidencia", {}).get("resumo", "N/A"),
        "ultima_revisao": last.get("review_id", None),
        "proxima_acao": "Doer executa tarefa atual",
        "responsavel": "Doer",
        "tarefas_abertas": last.get("tarefas_abertas", []),
        "tarefas_em_progresso": last.get("tarefas_em_progresso", []),
        "riscos_abertos": last.get("riscos_abertos", []),
        "pendencias_operador": last.get("pendencias_operador", 0),
        "ultimo_evento": "SYNC gerado em " + datetime.now(timezone.utc).isoformat(),
        "plano_info": plano,
    }

    print(json.dumps(sync, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
