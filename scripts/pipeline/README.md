# Pipeline de Ingestão de Conteúdo Clínico — TriagemPsi

Scripts de apoio para preparação e ingestão de materiais clínicos do Dr. Saraiva
na plataforma TriagemPsi. **Estes scripts rodam LOCALMENTE** — nunca são bundled
no Worker de edge.

> **Regra de Ouro:** Nenhum caminho absoluto nesta pasta. Todos os caminhos são
> relativos à raiz do repositório (`./`) ou lidos de variáveis de ambiente
> definidas em `.env` / `.env.local`.

---

## Scripts Disponíveis

| Script | Propósito |
|---|---|
| `ingest-saraiva-material.ts` | Converte PDFs/áudios do Dr. Saraiva em registros de psicoeducação |
| `validate-psychoeducation.ts` | Valida JSON de temas contra o schema do banco antes do `supabase db push` |
| `batch-upload-topics.ts` | Upload em lote de tópicos de psicoeducação via Supabase Admin API |
| `env.ts` | Centraliza todas as variáveis de ambiente parametrizadas (sem valores hardcoded) |

---

## Variáveis de Ambiente Necessárias

Copie `.env.example` → `.env.local` e preencha:

```bash
# Supabase (obrigatório)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

# Diretórios de entrada (relativo ao repo ou absoluto local — NUNCA commitar)
INPUT_DIR=./data/saraiva-material
OUTPUT_DIR=./data/processed

# Bucket de storage
STORAGE_BUCKET=clinical-assets
```

---

## Uso

```bash
# Validar tópicos antes de subir
bun scripts/pipeline/validate-psychoeducation.ts

# Ingerir material do Dr. Saraiva
bun scripts/pipeline/ingest-saraiva-material.ts --input ./data/saraiva-material

# Upload em lote (requer SUPABASE_SERVICE_ROLE_KEY)
bun scripts/pipeline/batch-upload-topics.ts
```

---

## ⚠️ Separação de Contextos

Este diretório **NÃO** deve conter scripts de produção de vídeo (audiogramas,
legendas, FFmpeg). Esses pertencem ao repositório `edtech-content-factory`.
O TriagemPsi é uma plataforma clínica — a separação é intencional e obrigatória.
