#!/usr/bin/env python3
"""Demonstração pontual (não é parte da esteira automática) — gera 1
infográfico sobre o mhGAP pra Aula 1 do curso "Formação em Manejo
Psiquiátrico para Generalistas" no saraiva-lms/Corte 800.

Não usa a fila de jobs do triagem-medica (o Corte 800 ainda não tem essa
tabela) — roda direto, uma vez, e salva o resultado localmente dentro do
próprio repositório do saraiva-lms. Ver
09_saraiva_lms/documentos/INTEGRACAO_ESTEIRA_CONTEUDO_IA.md pra como isso
se encaixa lá.

Uso: python3 generate_corte800_demo.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(Path(__file__).resolve().parent / ".env")

import notebooklm_client as nlm  # noqa: E402

ACCOUNT = os.environ.get("NOTEBOOKLM_ACCOUNT", "coletivoaruatemvoz")
BRAND_PROMPT = (Path(__file__).resolve().parent / "prompts" / "corte800.md").read_text(encoding="utf-8")

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

Módulo SUI (autolesão/suicídio) — protocolo de triagem em 3 etapas:
1. Avaliar se houve ato de autolesão clinicamente grave (intoxicação,
   sangramento, perda de consciência) e estabilizar.
2. Avaliar risco iminente (ideação ativa, plano, meios disponíveis).
3. Avaliar risco geral (fatores de risco/proteção, histórico).
Princípio central: perguntar diretamente sobre ideação suicida NÃO induz o
ato — geralmente alivia a ansiedade da pessoa e abre espaço para
acolhimento.

Princípio organizador: "tarefas compartilhadas" (task-shifting) — permitir
que o primeiro manejo aconteça na atenção primária, com o especialista
reservado para os casos que realmente precisam, é exatamente o modelo que
sustenta plataformas de pré-triagem psiquiátrica bem desenhadas.

Fonte: mhGAP Intervention Guide, versão 2.0, Organização Mundial da Saúde, 2016."""


def main() -> int:
    print("Verificando autenticação...")
    nlm.check_auth(ACCOUNT)
    print("OK — autenticado.")

    print("Criando notebook...")
    notebook_id, _ = nlm.ensure_notebook(None, "Corte 800 — mhGAP Overview (demo)")
    print(f"Notebook: {notebook_id}")

    print("Subindo fonte...")
    nlm.ensure_sources(notebook_id, SOURCE_MATERIAL)
    print("Fonte confirmada.")

    out_dir = Path(__file__).resolve().parent / "output-corte800-demo"
    print("Gerando infográfico (balde de cota: relatorios, 100/dia)...")
    out_path = nlm.generate_piece(notebook_id, "infografico", out_dir, guidance_prompt=BRAND_PROMPT)
    print(f"Pronto: {out_path}")
    print(f"notebook_id (guardar caso precise reprocessar): {notebook_id}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
