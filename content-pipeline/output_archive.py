"""Organiza localmente os artefatos gerados pela esteira NotebookLM — pedido
explícito do usuário 2026-09-27: nunca depender só do que foi pro storage
remoto (Supabase Storage / Django media). Cada peça gerada fica salva em
disco (arquivo bruto) ao lado de um `.md` de metadados (notebook_id, job_id,
prompt de marca usado, data, resumo da fonte) — pra revisão/curadoria e pra
auditoria de onde cada peça veio.

Duas raízes de saída, uma por projeto (são repositórios Git separados):
- TRIAGEM_OUTPUT_ROOT: dentro deste repositório (triagem-medica).
- CORTE800_OUTPUT_ROOT: dentro do repositório saraiva-lms — entregue local
  ali porque esse projeto não tem storage em nuvem configurado (ver
  09_saraiva_lms/documentos/INTEGRACAO_ESTEIRA_CONTEUDO_IA.md).
"""
from __future__ import annotations

import shutil
from datetime import datetime, timezone
from pathlib import Path

TRIAGEM_OUTPUT_ROOT = Path(__file__).resolve().parent / "outputs" / "triagem-medica"
CORTE800_OUTPUT_ROOT = Path(
    "/mnt/armazenamento/Projetos/CLIENTES_MKT_E_ARTESANATO/09_saraiva_lms/documentos/conteudo-gerado"
)


def archive(
    output_root: Path,
    topic_slug: str,
    kind: str,
    file_path: Path,
    *,
    notebook_id: str,
    job_id: str | None,
    guidance_prompt_path: Path | None,
    source_summary: str,
    extra_notes: str | None = None,
) -> Path:
    """Copia `file_path` pra `output_root/topic_slug/` e grava um `.md` de
    metadados ao lado (mesmo nome-base, extensão `.md`). Retorna o caminho
    do arquivo copiado."""
    dest_dir = output_root / topic_slug
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_file = dest_dir / file_path.name
    shutil.copy(file_path, dest_file)

    meta_lines = [
        f"# {kind} — metadados de geração",
        "",
        f"- Arquivo: `{dest_file.name}`",
        f"- Gerado em: {datetime.now(timezone.utc).isoformat()}",
        f"- notebook_id: `{notebook_id}`",
        f"- job_id: `{job_id or '(teste pontual, sem job na fila)'}`",
        f"- Prompt de marca usado: `{guidance_prompt_path.name if guidance_prompt_path else '(nenhum)'}`",
        f"- Fonte/resumo: {source_summary}",
    ]
    if extra_notes:
        meta_lines += ["", extra_notes]

    meta_path = dest_dir / f"{dest_file.stem}.md"
    meta_path.write_text("\n".join(meta_lines) + "\n", encoding="utf-8")
    return dest_file
