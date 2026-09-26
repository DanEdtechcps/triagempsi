#!/usr/bin/env python3
"""Runner da Fase 2 (podcast/infográfico/vídeo via NotebookLM) — dispara
manualmente (`python3 runner.py`) ou por cron, uma vez validado.

Não roda dentro do Cloudflare Worker (não pode: autenticação por cookie de
sessão de Chrome, gerações de minutos) — roda nesta máquina, mesma onde o
CENE já opera hoje. Ver documentação viva/PESQUISA_ESTEIRA_CENE_PORT_TRIAGEM_2026-09-25.md
para o contexto completo.

Uso:
    python3 runner.py                # processa todos os jobs pendentes
    python3 runner.py --dry-run      # só mostra o que faria, sem tocar NotebookLM
    python3 runner.py --job <id>     # processa só um job específico
"""
from __future__ import annotations

import argparse
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(Path(__file__).resolve().parent / ".env")

import notebooklm_client as nlm  # noqa: E402
import supabase_client as db  # noqa: E402

ACCOUNT = os.environ.get("NOTEBOOKLM_ACCOUNT", "coletivoaruatemvoz")


def log(job_id: str, msg: str) -> None:
    print(f"[{job_id[:8]}] {msg}", flush=True)


def process_job(job: dict, dry_run: bool) -> None:
    job_id = job["id"]
    title = job.get("topic_title_draft") or f"TriagemPsi · tópico {job.get('topic_id', '')[:8]}"

    if dry_run:
        log(job_id, f"[dry-run] processaria: título={title!r} formatos={job['requested_formats']} "
                     f"notebook_id={job.get('notebook_id') or '(novo)'}")
        return

    try:
        nlm.check_auth(ACCOUNT)

        notebook_id, criado_agora = nlm.ensure_notebook(ACCOUNT, job.get("notebook_id"), title)
        if criado_agora:
            # Trava contra o bug de notebook duplicado: persiste ANTES de
            # subir fonte ou gerar qualquer coisa.
            db.persist_notebook_id(job_id, notebook_id)
            log(job_id, f"notebook criado e persistido: {notebook_id}")
        else:
            log(job_id, f"reaproveitando notebook existente: {notebook_id}")

        db.mark_job_status(job_id, "gerando")
        nlm.ensure_sources(ACCOUNT, notebook_id, job["source_material"])
        log(job_id, "fontes confirmadas no notebook")

        with tempfile.TemporaryDirectory() as tmp:
            tmp_dir = Path(tmp)
            falhas: list[str] = []
            for kind in job["requested_formats"]:
                if kind not in nlm.PECAS_CFG:
                    continue
                try:
                    log(job_id, f"{kind}: gerando…")
                    out_path = nlm.generate_piece(ACCOUNT, notebook_id, kind, tmp_dir)
                    media_url = db.upload_media(job_id, kind, out_path)
                    log(job_id, f"{kind}: ok — {media_url}")
                except nlm.NotebookLMError as e:
                    falhas.append(f"{kind}: {e}")
                    log(job_id, f"{kind}: ERRO — {e}")

        if falhas:
            db.mark_job_status(job_id, "erro", "; ".join(falhas))
        else:
            db.mark_job_status(job_id, "aguardando_aprovacao")
            log(job_id, "job concluído — aguardando aprovação humana no painel")

    except nlm.NotebookLMError as e:
        db.mark_job_status(job_id, "erro", str(e))
        log(job_id, f"ABORTADO: {e}")
    except Exception as e:  # noqa: BLE001 — job individual nunca derruba o runner inteiro
        db.mark_job_status(job_id, "erro", f"erro inesperado: {e}")
        log(job_id, f"ERRO INESPERADO: {e}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--job", help="processa só este job_id")
    args = ap.parse_args()

    jobs = db.fetch_pending_notebooklm_jobs()
    if args.job:
        jobs = [j for j in jobs if j["id"] == args.job]
        if not jobs:
            print(f"job {args.job} não encontrado (ou não está pendente/gerando).")
            return 1

    if not jobs:
        print("nenhum job pendente da Fase 2 (engine=notebooklm).")
        return 0

    print(f"{len(jobs)} job(s) a processar" + (" (dry-run)" if args.dry_run else ""))
    for job in jobs:
        process_job(job, args.dry_run)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
