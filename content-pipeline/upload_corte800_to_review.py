#!/usr/bin/env python3
"""Sobe os artefatos do Corte 800 já gerados pro storage do triagem-medica
(bucket compartilhado, prefixo corte800/<slug>/) — pedido explícito do
usuário 2026-09-27 ("coloca tudo na triagem medica, é pra uma mesma pessoa
avaliar"). Usa o endpoint interno dedicado (corte800-media-upload.ts, nunca
psychoeducation-media-upload.ts — não mistura com a fila clínica).

Uso: python3 upload_corte800_to_review.py
"""
from __future__ import annotations

import base64
import json
import os
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

APP_BASE_URL = os.environ["APP_BASE_URL"]
RUNNER_TOKEN = os.environ["RUNNER_TOKEN"]

CORTE800_ROOT = Path(
    "/mnt/armazenamento/Projetos/CLIENTES_MKT_E_ARTESANATO/09_saraiva_lms/documentos/conteudo-gerado"
)

CONTENT_TYPE_BY_EXT = {
    ".mp3": "audio/mpeg",
    ".mp4": "video/mp4",
    ".pdf": "application/pdf",
    ".json": "application/json",
    ".md": "text/markdown",
    ".png": "image/png",
}

# (slug da trilha, lista de nomes de arquivo a subir dela)
TRILHAS = {
    "terapia-grupo-tci": ["terapia-grupo-tci_relatorio.md"],
    "pre-prova-tci-grupo": ["pre-prova-tci-grupo_quiz.json"],
    "sus-medico-familia-mhgap": [
        "sus-medico-familia-mhgap_video.mp4",
        "sus-medico-familia-mhgap_podcast.mp3",
        "sus-medico-familia-mhgap_slide_deck.pdf",
    ],
}


def upload(slug: str, filename: str) -> str:
    path = CORTE800_ROOT / slug / filename
    content_type = CONTENT_TYPE_BY_EXT.get(path.suffix.lower(), "application/octet-stream")
    payload = {
        "slug": slug,
        "filename": filename,
        "content_type": content_type,
        "base64": base64.b64encode(path.read_bytes()).decode("ascii"),
    }
    resp = requests.post(
        f"{APP_BASE_URL}/api/internal/corte800-media-upload",
        json=payload,
        headers={"Authorization": f"Bearer {RUNNER_TOKEN}"},
        timeout=300,
    )
    resp.raise_for_status()
    return resp.json()["media_url"]


def main() -> int:
    results: dict[str, dict[str, str]] = {}
    for slug, filenames in TRILHAS.items():
        results[slug] = {}
        for filename in filenames:
            print(f"Subindo {slug}/{filename}...")
            url = upload(slug, filename)
            results[slug][filename] = url
            print(f"  -> {url}")

    out = Path(__file__).resolve().parent / "corte800_media_urls.json"
    out.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nURLs salvas em {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
