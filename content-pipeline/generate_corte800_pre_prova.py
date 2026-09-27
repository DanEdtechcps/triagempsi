#!/usr/bin/env python3
"""Trilha "pré-prova de residência/revalida" (Corte 800): peça de
demonstração em formato quiz difícil/técnico, mesmo material-base de
TCI/terapia em grupo já usado no relatório de formação continuada — pra
comparação de tom entre as duas trilhas lado a lado.

Não é a esteira automática (Corte 800 ainda não tem fila de jobs própria).

Uso: python3 generate_corte800_pre_prova.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(Path(__file__).resolve().parent / ".env")

import notebooklm_client as nlm  # noqa: E402
import output_archive  # noqa: E402

ACCOUNT = os.environ.get("NOTEBOOKLM_ACCOUNT", "coletivoaruatemvoz")
PROMPT_PATH = Path(__file__).resolve().parent / "prompts" / "corte800-pre-prova.md"
BRAND_PROMPT = PROMPT_PATH.read_text(encoding="utf-8")

SOURCE_MATERIAL = """Terapia Comunitária Integrativa (TCI) e Terapia em Grupo — evidência e prática

Criada por Adalberto de Paula Barreto, médico psiquiatra e antropólogo
cearense, a TCI é uma prática genuinamente brasileira desenvolvida a partir
do trabalho com famílias migrantes no Nordeste. Desde 2010 integra a
Política Nacional de Práticas Integrativas e Complementares do Ministério
da Saúde, com mais de 30 mil terapeutas comunitários formados no país.

Estrutura de uma roda de TCI: acolhimento (regras — sigilo, respeito, fala
em primeira pessoa, ninguém obrigado a falar); escolha do tema a partir de
relatos breves; aprofundamento até identificar o "mote" que conecta as
experiências do grupo; problematização, em que outros participantes
compartilham como superaram situações parecidas; encerramento reflexivo.

Evidência acadêmica (autor/ano, usar exatamente como citado, nunca
inventar):
- Huntley, Araya & Salisbury (2012, British Journal of Psychiatry): TCC em
  grupo reduz sintomas depressivos de forma significativa vs. cuidado
  usual; vantagem sobre terapia individual tende a desaparecer após ~3
  meses.
- Krishna et al. (2013, International Journal of Geriatric Psychiatry): em
  idosos com depressão subclínica, TCC em grupo reduz sintomas
  significativamente vs. lista de espera, com menos desistências.
- Raya-Tena et al. (2021, RCT, e 2023, estudo qualitativo): grupos
  psicoeducativos conduzidos por enfermeiras de atenção primária, em
  pacientes com depressão e comorbidade física, mostraram remissão em longo
  prazo; confidencialidade como elemento terapêutico central, diferenças de
  gênero na participação.
- Yin, Wan & Wang (2025, Frontiers in Psychiatry): metanálise de
  psicoterapia em grupo centrada na pessoa mostra efeito positivo
  consistente como terapia adjuvante de primeira linha.
- Mattos et al. (2022, Revista de Saúde Pública): implementação de
  Psicoterapia Interpessoal em Grupo no SUS é viável, mas enfrenta
  barreiras organizacionais (agenda, espaço, rotatividade de equipe).
- Pawluk, Ward & Niyyati (2026, coorte): grupo de TCC de 8 semanas
  conduzido por médico de família mostrou melhora significativa em
  PHQ-8/GAD-7 mantida em 3 meses, mas atrito alto no seguimento de 12 meses
  (25% de conclusão).

Aplicação prática na APS: baixo custo, escalabilidade, redução do
isolamento social, melhora de adesão. Limitações: adesão irregular,
poucos profissionais treinados, dificuldades estruturais de agenda/espaço,
heterogeneidade metodológica entre os estudos.

Fonte: síntese preparada pro curso de capacitação em Saúde Mental na
Atenção Primária (Coxilha/RS), curadoria do Dr. José Saraiva Jr."""


def main() -> int:
    print("Verificando autenticação...")
    nlm.check_auth(ACCOUNT)
    print("OK — autenticado.")

    print("Criando notebook...")
    notebook_id, _ = nlm.ensure_notebook(None, "Corte 800 Pré-Prova — TCI/Terapia em Grupo (quiz técnico)")
    print(f"Notebook: {notebook_id}")

    print("Subindo fonte...")
    nlm.ensure_sources(notebook_id, SOURCE_MATERIAL)
    print("Fonte confirmada.")

    out_dir = Path(__file__).resolve().parent / "output-corte800-demo" / "pre-prova"
    print("Gerando quiz técnico (dificuldade hard)...")

    # PECAS_CFG["quiz"] usa --difficulty easy (padrão pro paciente) —
    # aqui a trilha precisa de "hard". Chamada direta ao CLI em vez de
    # generate_piece pra não mexer no default compartilhado.
    import notebooklm_client as nlm_module
    nlm_module.check_quota("relatorios")
    import tempfile
    prompt_file = Path(tempfile.gettempdir()) / f"corte800_preprova_prompt_{notebook_id}.md"
    prompt_file.write_text(BRAND_PROMPT, encoding="utf-8")
    r = nlm_module._run(
        "generate", "quiz", "-n", notebook_id, "--difficulty", "hard", "--quantity", "more",
        "--prompt-file", str(prompt_file), "--wait", "--timeout", "300", "--json", timeout=360,
    )
    nlm_module.bump_quota("relatorios")
    if r.returncode != 0:
        raise SystemExit(f"quiz falhou: {(r.stderr or r.stdout)[:300]}")

    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "quiz.json"
    dl = nlm_module._run("download", "quiz", "--latest", "-n", notebook_id, str(out_path), "--force", timeout=120)
    if dl.returncode != 0 or not out_path.exists():
        raise SystemExit(f"download falhou: {(dl.stderr or dl.stdout)[:300]}")

    archived = output_archive.archive(
        output_archive.CORTE800_OUTPUT_ROOT,
        "pre-prova-tci-grupo",
        "quiz",
        out_path,
        notebook_id=notebook_id,
        job_id=None,
        guidance_prompt_path=PROMPT_PATH,
        source_summary="TCI/terapia em grupo — mesmo material do relatório de formação continuada, dificuldade hard pra comparação de trilha.",
        extra_notes="Trilha: pré-prova de residência/revalida. Quiz técnico, testa critério/evidência (diferente do quiz de paciente, que NUNCA testa citação).",
    )
    print(f"Pronto: {out_path} — arquivado em {archived}")
    print(f"notebook_id (guardar caso precise reprocessar): {notebook_id}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
