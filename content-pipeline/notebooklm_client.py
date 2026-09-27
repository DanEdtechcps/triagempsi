"""Wrapper fino sobre o CLI `notebooklm` (notebooklm-py 0.8.3), adaptado de
/mnt/armazenamento/CENE/conteudo/src/gerar_trilha_conta.py e
preflight_geracao.py.

Instalação PRÓPRIA (não usa o venv do CENE — decisão do usuário
2026-09-27, o venv do CENE está com o interpretador quebrado e ele não
quis remendar isso via symlink): `pip install -r requirements.txt` dentro
de `content-pipeline/.venv` instala o mesmo `notebooklm-py`, e o login é
feito uma vez, independente do CENE (login real feito 2026-09-27 via
`notebooklm login --browser chrome --fresh` — abre o Chrome do sistema,
não depende de extrair cookie de sessão já aberta). A CONTA Google
(`coletivoaruatemvoz`) e a COTA continuam sendo as mesmas do CENE — é a
mesma conta real, então o contador de uso tem que ser único mesmo com
instalações de software separadas (ver QUOTA_DIR abaixo).

Perfil: o login fica salvo no perfil "default" da ferramenta (única conta
em uso nesta automação) — por isso `_run()` NUNCA passa `-p/--profile`.
Passar `-p coletivoaruatemvoz` (nome da conta, não de um perfil real)
apontaria pra um perfil inexistente e falharia antes de qualquer chamada
de rede — bug real encontrado e corrigido nesta sessão.

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

# CLI local, própria deste projeto — NUNCA aponta pro venv do CENE (estava
# quebrado, e o usuário decidiu não depender dele em vez de consertar).
CLI = str(Path(__file__).resolve().parent / ".venv" / "bin" / "notebooklm")
# A cota, porém, é da CONTA Google real — a mesma usada pelo CENE — então o
# arquivo de contagem continua sendo o mesmo, senão os dois softwares
# achariam ter 20/dia cada um quando na verdade dividem um único limite.
QUOTA_DIR = Path("/mnt/armazenamento/CENE/conteudo/integracao")
DAILY_QUOTA_PADRAO = 20
DAILY_QUOTA_RELATORIOS = 100

# cli_type: subcomando de "generate"/"download" (ex.: "audio", "quiz").
# dl_flag: nome do tipo como aparece em "download <tipo>" (igual a cli_type
# em todos os casos hoje, mantido separado só por clareza).
# ext, balde_de_cota, extra_args — balde confirmado contra
# NOTEBOOKLM_PIPELINE.md do CENE (linha 12): áudio e vídeo normal = "padrao"
# (20/dia); infográfico e slides = "relatorios" (100/dia, bem mais folgado).
# Quiz/flashcards/report não achamos referência de cota do CENE — tratados
# como "relatorios" (mais folgado) até haver dado real em contrário. Vídeo
# "cinemático" (balde de 2/dia) é opt-in separado, não gerado por este
# runner.
#
# "video_pilula" (--format short, vídeo vertical curto) é o formato
# principal pra psicoeducação a partir de 2026-09-27 — decisão do usuário:
# não quer vídeo longo por padrão, quer "pílulas" pra publicar semanalmente.
# "video" (explainer, formato longo) fica só pra tópicos que exigem mais
# profundidade — não é o padrão.
PECAS_CFG: dict[str, tuple[str, str, str, str, list[str]]] = {
    "podcast": ("audio", "audio", ".mp3", "padrao", ["--language", "pt_BR"]),
    "podcast_curto": ("audio", "audio", ".mp3", "padrao", ["--format", "brief", "--length", "short", "--language", "pt_BR"]),
    "video": ("video", "video", ".mp4", "padrao", ["--format", "explainer", "--language", "pt_BR"]),
    "video_pilula": ("video", "video", ".mp4", "padrao", ["--format", "short", "--language", "pt_BR"]),
    "infografico": ("infographic", "infographic", ".png", "relatorios", ["--language", "pt_BR"]),
    "quiz": ("quiz", "quiz", ".json", "relatorios", ["--language", "pt_BR"]),
    "flashcards": ("flashcards", "flashcards", ".json", "relatorios", ["--language", "pt_BR"]),
    "relatorio": ("report", "report", ".md", "relatorios", ["--format", "briefing-doc", "--language", "pt_BR"]),
}


class NotebookLMError(Exception):
    pass


def _run(*args: str, timeout: int = 300) -> subprocess.CompletedProcess:
    return subprocess.run([CLI, *args], capture_output=True, text=True, timeout=timeout)


def check_auth(account: str) -> None:
    r = _run("list", timeout=120)
    if r.returncode != 0 or "error" in (r.stdout + r.stderr).lower():
        raise NotebookLMError(
            f"Autenticação (conta esperada: {account}) expirada/inválida. Rodar manualmente: "
            f"{CLI} login --browser chrome --fresh"
        )


def _quota_file() -> Path:
    import datetime

    return QUOTA_DIR / f"cota_principal_{datetime.date.today()}.json"


def check_quota(balde: str = "padrao") -> None:
    f = _quota_file()
    data = json.loads(f.read_text()) if f.exists() else {"padrao": 0, "cinematico": 0, "relatorios": 0}
    limite = DAILY_QUOTA_RELATORIOS if balde == "relatorios" else DAILY_QUOTA_PADRAO
    if data.get(balde, 0) >= limite:
        raise NotebookLMError(
            f"Cota diária do balde '{balde}' ({limite}/dia — COMPARTILHADA com o CENE) "
            "já esgotada hoje. Aguardar amanhã; nunca trocar de conta."
        )


def bump_quota(kind: str = "padrao") -> None:
    f = _quota_file()
    data = json.loads(f.read_text()) if f.exists() else {"padrao": 0, "cinematico": 0, "relatorios": 0}
    data[kind] = data.get(kind, 0) + 1
    QUOTA_DIR.mkdir(parents=True, exist_ok=True)
    f.write_text(json.dumps(data))


def ensure_notebook(existing_notebook_id: str | None, title: str) -> tuple[str, bool]:
    """Retorna (notebook_id, criado_agora). NUNCA cria um segundo notebook
    quando existing_notebook_id já está preenchido."""
    if existing_notebook_id:
        return existing_notebook_id, False
    r = _run("create", title, "--json", timeout=120)
    try:
        nbid = json.loads(r.stdout)["notebook"]["id"]
    except Exception as e:
        raise NotebookLMError(f"Falha ao criar notebook: {(r.stderr or r.stdout)[:200]}") from e
    return nbid, True


def ensure_sources(notebook_id: str, source_material: str) -> None:
    """Sobe o material como fonte SE o notebook ainda não tiver nenhuma —
    e sempre confirma via `source list` no final, nunca só pelo retorno de
    `source add`. Aborta (não gera nada) se a confirmação falhar."""
    existing = _run("source", "list", "-n", notebook_id, "--json", timeout=60)
    try:
        sources = json.loads(existing.stdout).get("sources", [])
    except Exception:
        sources = []
    if sources:
        return  # já tem fonte — não sobe de novo (evita duplicar a cada retry)

    tmp = Path(tempfile.gettempdir()) / f"triagem_psico_{notebook_id}.md"
    tmp.write_text(source_material, encoding="utf-8")
    r = _run("source", "add", str(tmp), "-n", notebook_id, "--type", "file",
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
        _run("source", "wait", sid, "-n", notebook_id, "--timeout", "300", timeout=360)

    # Confirmação final e obrigatória — independe do que source add reportou.
    confirm = _run("source", "list", "-n", notebook_id, "--json", timeout=60)
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


def _list_artifacts(notebook_id: str) -> list[dict]:
    r = _run("artifact", "list", "-n", notebook_id, "--json", timeout=120)
    try:
        d = json.loads(r.stdout)
    except Exception:
        return []
    return d if isinstance(d, list) else (d.get("artifacts") or d.get("items") or [])


def generate_piece(
    notebook_id: str,
    kind: str,
    output_dir: Path,
    guidance_prompt: str | None = None,
) -> Path:
    """Gera e baixa a peça usando `generate <tipo> --wait --json` +
    `download <tipo> --latest` (CLI 0.8.3 — dispensa o polling manual de
    artefatos que a 0.7.1 exigia). Nunca recria o notebook em caso de
    timeout: em vez disso adota o artefato mais recente daquele tipo via
    `artifact wait`, sem trocar de notebook_id.

    `guidance_prompt`: instrução de marca/guardrail (tom, paleta, regras de
    conteúdo) — igual ao padrão do CENE (gerar_trilha_conta.py sempre passa
    um `--prompt-file` por peça, nunca dispara geração "pelada"). Vira um
    arquivo temporário passado como `--prompt-file` pro comando de geração.
    """
    cli_type, dl_type, ext, balde, format_args = PECAS_CFG[kind]

    check_quota(balde)
    extra_args: list[str] = list(format_args)
    if guidance_prompt:
        prompt_file = Path(tempfile.gettempdir()) / f"triagem_prompt_{notebook_id}_{kind}.md"
        prompt_file.write_text(guidance_prompt, encoding="utf-8")
        extra_args += ["--prompt-file", str(prompt_file)]

    gen = _run("generate", cli_type, "-n", notebook_id, *extra_args,
               "--wait", "--timeout", "1700", "--json", timeout=1800)
    bump_quota(balde)  # a chamada foi disparada (mesmo se o --wait der timeout) — conta pra cota

    if gen.returncode != 0:
        # --wait deu timeout ou a geração falhou do lado do Google. NUNCA
        # recriar notebook aqui: tenta adotar o artefato mais recente
        # daquele tipo (pode ter ficado em andamento/concluído mesmo assim).
        candidatos = [a for a in _list_artifacts(notebook_id) if a.get("type_id") == dl_type]
        if not candidatos:
            raise NotebookLMError(
                f"{kind}: geração falhou e nenhum artefato desse tipo apareceu no notebook "
                f"(stderr: {(gen.stderr or gen.stdout)[:200]}). Reprocessar depois reaproveita "
                "este mesmo notebook_id — nunca criar um novo."
            )
        aid = sorted(candidatos, key=lambda a: a.get("created_at", ""))[-1]["id"]
        wait = _run("artifact", "wait", aid, "-n", notebook_id, "--timeout", "1700", "--json", timeout=1800)
        if wait.returncode != 0 or '"completed"' not in wait.stdout:
            raise NotebookLMError(
                f"{kind}: geração não completou a tempo (timeout). Reprocessar depois "
                "reaproveita este mesmo notebook e adota o artefato em andamento — "
                "nunca cria um notebook novo."
            )

    output_dir.mkdir(parents=True, exist_ok=True)
    out = output_dir / f"{kind}{ext}"
    r = _run("download", dl_type, "--latest", "-n", notebook_id, str(out), "--force", timeout=600)
    if r.returncode != 0 or not out.exists():
        raise NotebookLMError(f"{kind}: download falhou: {(r.stderr or r.stdout)[:200]}")
    return out
