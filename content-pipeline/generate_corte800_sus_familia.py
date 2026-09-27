#!/usr/bin/env python3
"""Trilha "formação gratuita SUS — médico de família e equipe" (Corte 800):
peça de demonstração em formato LONGO (vídeo explainer + áudio deep-dive),
diferente das outras trilhas — pedido explícito do usuário 2026-09-27
("cria uma trilha pra médico de família completo com vídeo e áudio
longos"). Usa o mesmo material-base do mhGAP já usado no primeiro teste do
Corte 800 (generate_corte800_demo.py) — é literalmente o guia que ensina
esse exato modelo (task-shifting pra atenção primária).

Não é a esteira automática (Corte 800 ainda não tem fila de jobs própria —
ver generate_corte800_demo.py e INTEGRACAO_ESTEIRA_CONTEUDO_IA.md).

Uso: python3 generate_corte800_sus_familia.py
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
PROMPT_PATH = Path(__file__).resolve().parent / "prompts" / "corte800-sus-medico-familia.md"
BRAND_PROMPT = PROMPT_PATH.read_text(encoding="utf-8")

SOURCE_MATERIAL = """mhGAP Intervention Guide (Organização Mundial da Saúde, versão 2.0, 2016)

O que é: o guia clínico do Mental Health Gap Action Programme, criado para
permitir que profissionais de saúde NÃO especializados (clínicos gerais,
enfermeiros, médicos de família) avaliem e manejem condições prioritárias
de saúde mental, neurológicas e por uso de substâncias — partindo do
princípio de que quase 1 em cada 10 pessoas tem um transtorno mental, mas
apenas cerca de 1% da força de trabalho global de saúde atua nessa área.

Estrutura modular por condição, cada módulo com fluxograma de avaliação →
manejo → seguimento:
- DEP: Depressão
- PSI: Psicoses
- EPI: Epilepsia
- CMD: Transtornos infanto-juvenis
- DEM: Demência
- SUD: Uso de substâncias
- SUI: Autolesão/Suicídio
- OTH: Outras queixas de saúde mental importantes

Papéis da equipe no fluxo (task-shifting): o agente comunitário de saúde
está em posição privilegiada pra identificação inicial e busca ativa
(vínculo territorial); a enfermagem conduz triagem estruturada e
acompanhamento longitudinal (ex.: escalas, adesão a tratamento); o médico
de família realiza avaliação clínica, define conduta de primeira linha e
decide sobre encaminhamento; o especialista (psiquiatra) fica reservado
pra casos que não respondem ao manejo inicial, risco elevado ou
diagnóstico diferencial complexo.

Módulo SUI (autolesão/suicídio) — protocolo de triagem em 3 etapas:
1. Avaliar se houve ato de autolesão clinicamente grave (intoxicação,
   sangramento, perda de consciência) e estabilizar.
2. Avaliar risco iminente (ideação ativa, plano, meios disponíveis).
3. Avaliar risco geral (fatores de risco/proteção, histórico).
Princípio central: perguntar diretamente sobre ideação suicida NÃO induz o
ato — geralmente alivia a ansiedade da pessoa e abre espaço para
acolhimento. Qualquer membro da equipe pode e deve fazer essa pergunta
diretamente, não é exclusividade do médico.

Condições reais da atenção primária brasileira: tempo de consulta curto,
alta demanda, poucos especialistas disponíveis pra encaminhamento rápido —
o modelo mhGAP foi desenhado justamente pra funcionar dentro dessas
limitações, não pra um cenário ideal de recursos.

Princípio organizador: "tarefas compartilhadas" (task-shifting) — permitir
que o primeiro manejo aconteça na atenção primária, com o especialista
reservado para os casos que realmente precisam, é o modelo que sustenta
acesso real a cuidado de saúde mental em contextos de recursos limitados.

Fonte: mhGAP Intervention Guide, versão 2.0, Organização Mundial da Saúde, 2016."""


def main() -> int:
    print("Verificando autenticação...")
    nlm.check_auth(ACCOUNT)
    print("OK — autenticado.")

    print("Criando notebook...")
    notebook_id, _ = nlm.ensure_notebook(None, "Corte 800 SUS — mhGAP p/ Médico de Família e Equipe (formato longo)")
    print(f"Notebook: {notebook_id}")

    print("Subindo fonte...")
    nlm.ensure_sources(notebook_id, SOURCE_MATERIAL)
    print("Fonte confirmada.")

    out_dir = Path(__file__).resolve().parent / "output-corte800-demo" / "sus-medico-familia"

    for kind in ("video", "podcast"):
        print(f"Gerando {kind} (formato longo)...")
        out_path = nlm.generate_piece(notebook_id, kind, out_dir, guidance_prompt=BRAND_PROMPT)
        archived = output_archive.archive(
            output_archive.CORTE800_OUTPUT_ROOT,
            "sus-medico-familia-mhgap",
            kind,
            out_path,
            notebook_id=notebook_id,
            job_id=None,
            guidance_prompt_path=PROMPT_PATH,
            source_summary="mhGAP Intervention Guide (OMS, 2016) — task-shifting pra atenção primária, papéis de equipe.",
            extra_notes="Trilha: formação gratuita SUS, perspectiva médico de família + equipe. Formato LONGO (não é pílula).",
        )
        print(f"Pronto: {out_path} — arquivado em {archived}")

    print(f"notebook_id (guardar caso precise reprocessar): {notebook_id}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
