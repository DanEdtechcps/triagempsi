#!/usr/bin/env python3
"""Segundo teste pontual pro Corte 800 (não é a esteira automática — ainda
não existe fila de jobs pra este projeto, ver generate_corte800_demo.py e
INTEGRACAO_ESTEIRA_CONTEUDO_IA.md). Gera um RELATÓRIO (texto Markdown, sem
custo de mídia) a partir da mesma aula curada de Terapia em Grupo/TCI já
publicada em rascunho no saraiva-lms (content_lesson id=3) — pareado de
propósito com a pílula de vídeo equivalente do triagem-medica (mesmo
material-base, registro de linguagem diferente por público).

Uso: python3 generate_corte800_relatorio_tci.py
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
PROMPT_PATH = Path(__file__).resolve().parent / "prompts" / "corte800.md"
BRAND_PROMPT = PROMPT_PATH.read_text(encoding="utf-8")

# Mesmo conteúdo-fonte da Lesson 3 (Terapia em Grupo e TCI) do saraiva-lms —
# copiado aqui pra não precisar de rede pro Neon durante a geração.
SOURCE_MATERIAL = """Terapia Comunitária Integrativa (TCI) e Terapia em Grupo — evidência e prática

Criada por Adalberto de Paula Barreto, médico psiquiatra e antropólogo
cearense, a TCI é uma prática genuinamente brasileira desenvolvida a partir
do trabalho com famílias migrantes no Nordeste. Desde 2010 integra a
Política Nacional de Práticas Integrativas e Complementares do Ministério
da Saúde, com mais de 30 mil terapeutas comunitários formados no país.

Estrutura de uma roda de TCI: acolhimento (combinação de regras — sigilo,
respeito, fala em primeira pessoa, ninguém obrigado a falar); escolha do
tema a partir de relatos breves; aprofundamento até identificar o "mote"
que conecta as experiências do grupo; problematização, em que outros
participantes compartilham como superaram situações parecidas; encerramento
reflexivo com reconhecimento da participação de todos.

O que a evidência acadêmica mostra:
- Huntley, Araya & Salisbury (2012, British Journal of Psychiatry): terapia
  cognitivo-comportamental em grupo reduz sintomas depressivos de forma
  significativa em comparação a cuidado usual, mas a vantagem sobre terapia
  individual tende a desaparecer após ~3 meses.
- Krishna et al. (2013, International Journal of Geriatric Psychiatry): em
  idosos com depressão subclínica, TCC em grupo reduz sintomas de forma
  significativa vs. lista de espera, com menos desistências que os grupos
  controle — mas o efeito não se mantém necessariamente no seguimento.
- Raya-Tena et al. (2021, RCT, e 2023, estudo qualitativo): grupos
  psicoeducativos conduzidos por enfermeiras de atenção primária, em
  pacientes com depressão e comorbidade física, mostraram remissão em longo
  prazo; o estudo qualitativo identificou a confidencialidade como elemento
  terapêutico central e diferenças de gênero na forma de participação
  (homens tendem a participar menos e evitar mostrar emoção).
- Yin, Wan & Wang (2025, Frontiers in Psychiatry): metanálise de
  psicoterapia em grupo centrada na pessoa mostra efeito positivo
  consistente, recomendando-a como boa terapia adjuvante de primeira linha,
  especialmente em contextos com poucos recursos.
- Mattos et al. (2022, Revista de Saúde Pública): implementação de
  Psicoterapia Interpessoal em Grupo no SUS é viável, mas enfrenta barreiras
  organizacionais reais (agenda, espaço físico, rotatividade de equipe).
- Pawluk, Ward & Niyyati (2026, coorte): grupo de TCC de 8 semanas
  conduzido por médico de família mostrou melhora significativa em
  PHQ-8/GAD-7 mantida em 3 meses, mas com atrito alto no seguimento de 12
  meses (25% de conclusão) — reforçando que adesão é o principal desafio
  prático, não a eficácia em si.

Aplicação prática na atenção primária: baixo custo, escalabilidade, redução
do isolamento social, fortalecimento comunitário e melhora de adesão ao
tratamento. Limitações honestas: adesão irregular ao longo do tempo, poucos
profissionais treinados, dificuldades estruturais de agenda e espaço,
heterogeneidade metodológica entre os estudos disponíveis.

Fonte: síntese de evidências preparada a partir de revisão da literatura
conduzida no curso de capacitação em Saúde Mental na Atenção Primária
(Coxilha/RS), com curadoria do Dr. José Saraiva Jr."""


def main() -> int:
    print("Verificando autenticação...")
    nlm.check_auth(ACCOUNT)
    print("OK — autenticado.")

    print("Criando notebook...")
    notebook_id, _ = nlm.ensure_notebook(None, "Corte 800 — Terapia em Grupo e TCI (relatório, teste)")
    print(f"Notebook: {notebook_id}")

    print("Subindo fonte...")
    nlm.ensure_sources(notebook_id, SOURCE_MATERIAL)
    print("Fonte confirmada.")

    out_dir = Path(__file__).resolve().parent / "output-corte800-demo"
    print("Gerando relatório (briefing-doc, balde de cota: relatorios, 100/dia)...")
    out_path = nlm.generate_piece(notebook_id, "relatorio", out_dir, guidance_prompt=BRAND_PROMPT)
    print(f"Pronto: {out_path}")
    print(f"notebook_id (guardar caso precise reprocessar): {notebook_id}")

    archived = output_archive.archive(
        output_archive.CORTE800_OUTPUT_ROOT,
        "terapia-grupo-tci",
        "relatorio",
        out_path,
        notebook_id=notebook_id,
        job_id=None,
        guidance_prompt_path=PROMPT_PATH,
        source_summary=SOURCE_MATERIAL[:300],
    )
    print(f"Arquivado em: {archived}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
