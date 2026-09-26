# content-pipeline — Fase 2 (podcast/infográfico/vídeo via NotebookLM)

Runner externo que processa jobs de geração de mídia (`engine='notebooklm'`)
criados pelo painel "Conteúdo (IA)" do triagem-medica. Não roda dentro do
Cloudflare Worker — roda nesta máquina, a mesma onde o CENE já opera.

Fase 1 (leitura/quiz/flashcards via Cloudflare Workers AI) **não** depende
deste diretório — já funciona sozinha dentro do próprio app.

## Pré-requisitos

- Python 3.11+ (pode usar o mesmo pyenv do CENE:
  `/home/dan/.pyenv/versions/3.11.9/bin/python3`)
- `notebooklm-py` já instalado e autenticado em
  `/mnt/armazenamento/CENE/conteudo/.venv` (este runner reusa esse mesmo
  binário e a mesma conta Google — `coletivoaruatemvoz`)
- Acesso de rede ao Postgres do Supabase (porta 5432)

## Setup

```bash
cd content-pipeline
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # preencher DATABASE_URL/RUNNER_TOKEN reais
```

Se `python3 -m venv .venv && pip install ...` numa linha só der
`externally-managed-environment` (Ubuntu 24.04+/PEP 668), é porque o `pip`
rodou fora do venv — usar `.venv/bin/pip install -r requirements.txt`
direto, ou lembrar de `source .venv/bin/activate` antes.

**`DATABASE_URL` precisa usar o connection pooler, não o host direto.** O
host direto (`db.<ref>.supabase.co`) só resolve em IPv6 — a maioria das
redes domésticas/ISP não tem saída IPv6 e a conexão trava em
"Connection timed out" (visto em produção 2026-09-26). Usar o pooler
(IPv4), com o usuário no formato `<role>.<project_ref>` (o pooler recusa
com `ENOIDENTIFIER` se faltar o sufixo do projeto):
```
postgresql://psychoeducation_runner.ffyjjkouscnabyxjxexu:<senha>@aws-0-us-west-2.pooler.supabase.com:5432/postgres
```

As credenciais reais (`DATABASE_URL` com a senha da role
`psychoeducation_runner`, `RUNNER_TOKEN`) foram geradas e configuradas nesta
sessão — conferir com quem rodou a implementação se precisar delas de novo
(nunca ficam no Git).

## Autenticação no NotebookLM — PASSO MANUAL OBRIGATÓRIO

Este runner reusa a MESMA automação e conta do CENE
(`coletivoaruatemvoz@gmail.com`). Se a sessão expirar (não dá erro — devolve
conteúdo genérico, ver `notebooklm_client.check_auth`), rodar manualmente:

```bash
/mnt/armazenamento/CENE/conteudo/.venv/bin/notebooklm \
  -p coletivoaruatemvoz login --browser-cookies chrome --account coletivoaruatemvoz@gmail.com
```

Isso lê o cookie já existente do Chrome — nunca abre janela de navegador.
**Este passo não pode ser automatizado por um agente de IA** (é login numa
conta Google real) — só uma pessoa com acesso ao Chrome desta máquina roda.

## Rodar

```bash
python3 runner.py --dry-run     # ver o que seria processado, sem tocar NotebookLM
python3 runner.py               # processar todos os jobs pendentes (engine=notebooklm)
python3 runner.py --job <uuid>  # processar só um job específico
```

## Cota diária

A conta `coletivoaruatemvoz` tem uma cota real e única do Google AI Pro (20
gerações padrão/dia, 2 vídeos cinemáticos/dia), **compartilhada com o CENE**
— este runner lê/escreve o mesmo arquivo de contagem que o CENE já usa
(`/mnt/armazenamento/CENE/conteudo/integracao/cota_principal_<data>.json`),
nunca um contador próprio que ignoraria o uso do CENE no mesmo dia.

## Guardrails contra o incidente de 2026-09-26

Relatado pelo usuário: em produção no CENE, o processo às vezes criava
vários notebooks duplicados sem receber o material (fonte nunca subia),
estourava o tempo sem concluir e "resetava" para outro notebook vazio —
gerando conteúdo alucinado a partir de um notebook sem fonte nenhuma.

Este runner foi desenhado especificamente contra isso (ver comentários em
`notebooklm_client.py`):

1. `notebook_id` é persistido no banco **imediatamente** após a criação,
   antes de subir qualquer fonte — nunca cria um segundo notebook pro
   mesmo job.
2. Depois de subir a fonte, sempre confirma via `source list` que ela
   realmente está lá antes de gerar qualquer peça — nunca confia só no
   retorno de `source add`.
3. Em timeout de geração, nunca recria/troca de notebook — a peça falha,
   o job vira `erro`, e o reprocessamento (via botão "Tentar novamente" no
   painel, quando existir para jobs Fase 2) reaproveita o mesmo notebook e
   adota o artefato já em andamento.

## Automação (cron) — só depois de validar manualmente

Ainda não configurado de propósito. Validar pelo menos um ciclo completo
rodando manualmente antes de considerar `crontab`.
