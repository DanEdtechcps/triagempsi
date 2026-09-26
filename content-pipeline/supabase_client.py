"""Acesso ao Supabase para o runner — Postgres direto (role de privilégio
mínimo) para status dos jobs, e o endpoint interno do app para upload de
mídia (a role de banco não fala a API HTTP do Storage, ver
psychoeducation-media-upload.ts para o porquê).
"""
from __future__ import annotations

import base64
import os
from pathlib import Path
from typing import Any

import psycopg2
import psycopg2.extras
import requests

DATABASE_URL = os.environ["DATABASE_URL"]
APP_BASE_URL = os.environ["APP_BASE_URL"]
RUNNER_TOKEN = os.environ["RUNNER_TOKEN"]

CONTENT_TYPE_BY_EXT = {
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".mp4": "video/mp4",
}


def _connect():
    return psycopg2.connect(DATABASE_URL)


def fetch_pending_notebooklm_jobs() -> list[dict[str, Any]]:
    """Jobs da Fase 2 (engine='notebooklm') ainda não processados."""
    with _connect() as conn, conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            select id, topic_id, topic_title_draft, source_material,
                   requested_formats, notebook_id, status
            from psychoeducation_generation_jobs
            where engine = 'notebooklm' and status in ('pendente', 'gerando')
            order by created_at asc
            """
        )
        return cur.fetchall()


def mark_job_status(job_id: str, status: str, error_message: str | None = None) -> None:
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
            update psychoeducation_generation_jobs
            set status = %s, error_message = %s, updated_at = now()
            where id = %s
            """,
            (status, error_message, job_id),
        )
        conn.commit()


def persist_notebook_id(job_id: str, notebook_id: str) -> None:
    """Grava o notebook_id IMEDIATAMENTE após criar o notebook — antes de
    subir qualquer fonte ou gerar qualquer peça. É a trava contra o bug já
    visto em produção (CENE): se o processo falhar/reiniciar depois disso,
    o próximo ciclo reaproveita este mesmo notebook (fetch_pending já lê
    notebook_id do banco), em vez de criar um notebook novo e duplicado.
    """
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            "update psychoeducation_generation_jobs set notebook_id = %s, updated_at = now() where id = %s",
            (notebook_id, job_id),
        )
        conn.commit()


def upsert_asset(
    job_id: str,
    kind: str,
    *,
    body_md: str | None = None,
    data_json: Any = None,
    status: str = "aguardando_aprovacao",
) -> None:
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
            insert into psychoeducation_generated_assets (job_id, kind, body_md, data_json, status)
            values (%s, %s, %s, %s, %s)
            on conflict (job_id, kind) do update
                set body_md = excluded.body_md, data_json = excluded.data_json, status = excluded.status
            """,
            (job_id, kind, body_md, psycopg2.extras.Json(data_json) if data_json is not None else None, status),
        )
        conn.commit()


def upload_media(job_id: str, kind: str, file_path: Path) -> str:
    """Envia o arquivo gerado pro endpoint interno do app (nunca direto pro
    Storage — ver docstring de psychoeducation-media-upload.ts). Retorna a
    media_url relativa já registrada no asset pelo próprio endpoint."""
    content_type = CONTENT_TYPE_BY_EXT.get(file_path.suffix.lower(), "application/octet-stream")
    payload = {
        "job_id": job_id,
        "kind": kind,
        "content_type": content_type,
        "base64": base64.b64encode(file_path.read_bytes()).decode("ascii"),
    }
    resp = requests.post(
        f"{APP_BASE_URL}/api/internal/psychoeducation-media-upload",
        json=payload,
        headers={"Authorization": f"Bearer {RUNNER_TOKEN}"},
        timeout=300,
    )
    resp.raise_for_status()
    return resp.json()["media_url"]
