"""Wrapper fino sobre o CLI `notebooklm` (notebooklm-py), adaptado de
/mnt/armazenamento/CENE/conteudo/src/gerar_trilha_conta.py e
preflight_geracao.py — reaproveitando a MESMA conta/cota do CENE.

Regras de ouro (não são só comentário — são o motivo de cada função
existir, depois de um incidente real de produção no CENE relatado pelo
usuário 2026-09-26):

1. NUNCA criar um segundo notebook para o mesmo job. O notebook_id é
   persistido no banco (supabase_client.persist_notebook_id) IMEDIATAMENTE
   após a criação, antes de qualquer outra coisa — se o processo cair
   depois disso, o próximo ciclo reaproveita o notebook existente.
2. NUNCA disparar geração sem antes CONFIRMAR (via `source list`, não só
   confiando no retorno de `source add`) que o notebook realmente tem
   fontes. Notebook sem fonte = o modelo aluciona um conteúdo genérico com
   nome de arquivo certo — o pior tipo de bug, porque parece ter funcionado.
3. Em timeout de geração, NUNCA recriar/trocar de notebook — a peça falha,
   fica pendente pro job ser reprocessado (reaproveitando o mesmo
   notebook_id e adotando o artefato já em andamento, se houver).
4. A cota diária é da CONTA, compartilhada de verdade com o CENE (mesmo
   login Google) — este runner lê/escreve o MESMO arquivo de contagem que
   o CENE já usa, nunca um contador próprio que ignoraria o uso do CENE.
"""
from __future__ import annotations

import json
import re
import subprocess
import tempfile
import time
from pathlib import Path

CENE_BASE = Path("/mnt/armazenamento/CENE/conteudo")
CLI = str(CENE_BASE / ".venv" / "bin" / "notebooklm")
QUOTA_DIR = CENE_BASE / "integracao"
DAILY_QUOTA_PADRAO = 20

PECAS_CFG: dict[str, tuple[list[str], str, list[str], str]] = {
    "podcast": (["generate", "audio", "--language", "pt_BR"], "audio", ["download", "audio"], ".mp3"),
    "video": (["generate", "video", "--language", "pt_BR"], "video", ["download", "video"], ".mp4"),
    "infografico": (["generate", "infographic"], "infographic", ["download", "infographic"], ".png"),
}


class NotebookLMError(Exception):
    pass


def _run(account: str, *args: str, timeout: int = 300) -> subprocess.CompletedProcess:
    return subprocess.run([CLI, "-p", account, *args], capture_output=True, text=True, timeout=timeout)


def check_auth(account: str) -> None:
    r = _run(account, "list", timeout=120)
    if r.returncode != 0 or "error" in (r.stdout + r.stderr).lower():
        raise NotebookLMError(
            f"Autenticação de '{account}' expirada/inválida. Rodar manualmente: "
            f"{CLI} -p {account} login --browser-cookies chrome --account {account}@gmail.com"
        )


def _quota_file() -> Path:
    import datetime

    return QUOTA_DIR / f"cota_principal_{datetime.date.today()}.json"


def check_quota() -> None:
    f = _quota_file()
    data = json.loads(f.read_text()) if f.exists() else {"padrao": 0, "cinematico": 0, "relatorios": 0}
    if data.get("padrao", 0) >= DAILY_QUOTA_PADRAO:
        raise NotebookLMError(
            "Cota diária da conta (20 gerações/dia — COMPARTILHADA com o CENE) "
            "já esgotada hoje. Aguardar amanhã; nunca trocar de conta."
        )


def bump_quota(kind: str = "padrao") -> None:
    f = _quota_file()
    data = json.loads(f.read_text()) if f.exists() else {"padrao": 0, "cinematico": 0, "relatorios": 0}
    data[kind] = data.get(kind, 0) + 1
    QUOTA_DIR.mkdir(parents=True, exist_ok=True)
    f.write_text(json.dumps(data))


def ensure_notebook(account: str, existing_notebook_id: str | None, title: str) -> tuple[str, bool]:
    """Retorna (notebook_id, criado_agora). NUNCA cria um segundo notebook
    quando existing_notebook_id já está preenchido."""
    if existing_notebook_id:
        return existing_notebook_id, False
    r = _run(account, "create", title, "--json", timeout=120)
    try:
        nbid = json.loads(r.stdout)["notebook"]["id"]
    except Exception as e:
        raise NotebookLMError(f"Falha ao criar notebook: {(r.stderr or r.stdout)[:200]}") from e
    return nbid, True


def ensure_sources(account: str, notebook_id: str, source_material: str) -> None:
    """Sobe o material como fonte SE o notebook ainda não tiver nenhuma —
    e sempre confirma via `source list` no final, nunca só pelo retorno de
    `source add`. Aborta (não gera nada) se a confirmação falhar."""
    existing = _run(account, "source", "list", "-n", notebook_id, "--json", timeout=60)
    try:
        sources = json.loads(existing.stdout).get("sources", [])
    except Exception:
        sources = []
    if sources:
        return  # já tem fonte — não sobe de novo (evita duplicar a cada retry)

    tmp = Path(tempfile.gettempdir()) / f"triagem_psico_{notebook_id}.md"
    tmp.write_text(source_material, encoding="utf-8")
    r = _run(account, "source", "add", str(tmp), "-n", notebook_id, "--type", "file",
              "--timeout", "180", "--json", timeout=300)
    sid = None
    try:
        jd = json.loads(r.stdout)
        sid = (jd.get("source") or jd).get("id") if isinstance(jd, dict) else None
    except Exception:
        pass
    if not sid:
        m = re.search(r"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})", r.stdout + r.stderr)
        if m:
            sid = m.group(1)
    if sid:
        _run(account, "source", "wait", sid, "-n", notebook_id, "--timeout", "300", timeout=360)

    # Confirmação final e obrigatória — independe do que source add reportou.
    confirm = _run(account, "source", "list", "-n", notebook_id, "--json", timeout=60)
    try:
        confirmed = json.loads(confirm.stdout).get("sources", [])
    except Exception:
        confirmed = []
    if not confirmed:
        raise NotebookLMError(
            f"Notebook {notebook_id[:12]}… ficou SEM FONTES após o upload — abortando "
            "para não gerar conteúdo alucinado. NÃO recriar notebook: corrigir e "
            "reprocessar o mesmo job (reaproveita este notebook_id)."
        )


def _list_artifacts(account: str, notebook_id: str) -> list[dict]:
    r = _run(account, "artifact", "list", "-n", notebook_id, "--json", timeout=120)
    try:
        d = json.loads(r.stdout)
    except Exception:
        return []
    return d if isinstance(d, list) else (d.get("artifacts") or d.get("items") or [])


def generate_piece(account: str, notebook_id: str, kind: str, output_dir: Path) -> Path:
    """Gera (ou adota uma geração já em andamento/concluída) e baixa a
    peça. Nunca recria o notebook em caso de timeout — só levanta erro pro
    job ficar pendente de reprocessamento."""
    gen_args, type_id, dl_args, ext = PECAS_CFG[kind]

    adotaveis = [
        a for a in _list_artifacts(account, notebook_id)
        if a.get("type_id") == type_id and a.get("status") in ("pending", "queued", "in_progress", "completed")
    ]
    if adotaveis:
        aid = sorted(adotaveis, key=lambda a: a.get("created_at", ""))[-1]["id"]
    else:
        antes = {a["id"] for a in _list_artifacts(account, notebook_id) if a.get("type_id") == type_id}
        check_quota()
        _run(account, *gen_args, "-n", notebook_id, "--json", timeout=300)
        bump_quota("cinematico" if kind == "video" else "padrao")
        aid = None
        for _ in range(48):  # ~4 min pro artefato aparecer na lista
            time.sleep(5)
            novos = [a for a in _list_artifacts(account, notebook_id)
                     if a.get("type_id") == type_id and a["id"] not in antes]
            if novos:
                aid = novos[0]["id"]
                break
        if not aid:
            raise NotebookLMError(f"{kind}: artefato não apareceu após disparar geração (cota ou falha silenciosa).")

    ok = False
    for _tentativa in (1, 2):
        r = _run(account, "artifact", "wait", aid, "-n", notebook_id, "--timeout", "1700", "--json")
        if r.returncode == 0 and '"completed"' in r.stdout:
            ok = True
            break
        time.sleep(10)
    if not ok:
        raise NotebookLMError(
            f"{kind}: geração não completou a tempo (timeout). Reprocessar depois "
            "reaproveita este mesmo notebook e adota o artefato em andamento — "
            "nunca cria um notebook novo."
        )

    output_dir.mkdir(parents=True, exist_ok=True)
    out = output_dir / f"{kind}{ext}"
    r = _run(account, *dl_args, "-n", notebook_id, str(out), timeout=600)
    if r.returncode != 0 or not out.exists():
        raise NotebookLMError(f"{kind}: download falhou: {(r.stderr or r.stdout)[:200]}")
    return out
