# 02. Banco de Dados e Migrações (PostgreSQL / Supabase)

O banco de dados do **TriagemPsi** reside no PostgreSQL (Supabase Cloud) sob o projeto `ffyjjkouscnabyxjxexu.supabase.co`. Toda a integridade relacional, isolamento multi-tenant entre consultórios e conformidade com a LGPD e Ética Médica são garantidos a nível de banco de dados via **Row Level Security (RLS)** nativo e funções de segurança definidas (`SECURITY DEFINER`).

---

## 1. Dicionário de Tabelas Principais

### `public.clinics` (Consultórios / Clínicas)
Representa as unidades e consultórios atendidos pela plataforma.
* `id` (uuid, PK): Identificador único do consultório.
* `slug` (text, UNIQUE): Slug da URL (oficial: `saraiva`, compatibilidade: `padrao`).
* `name` (text): Nome institucional (ex: `"Saraiva Clínica de Psiquiatria"`).
* `tagline` (text): Descrição institucional (ex: `"Cuidado psiquiátrico com escuta, ciência e humanidade"`).
* `primary_color` (text): Cor primária institucional (ex: `"#1e4d5c"` — azul-petróleo sóbrio).
* `accent_color` (text): Cor de destaque (ex: `"#3d8b8b"` — verde-azulado suave).
* `intro_copy` (text): Texto de acolhimento e contextualização da consulta do Dr. Saraiva.
* `done_copy` (text): Mensagem de encerramento seguro ao paciente.
* `logo_url`, `favicon_url` (text): Assets visuais do consultório.
* `contact_email`, `contact_phone`, `website_url` (text): Canais de atendimento.

### `public.user_roles` (Papéis e Permissões - Padrão Unificado)
Define o papel e o escopo de cada usuário autenticado no sistema:
* `id` (uuid, PK)
* `user_id` (uuid, FK `auth.users`): Usuário autenticado.
* `clinic_id` (uuid, FK `clinics`, Nullable): 
  * Se `NULL`: Usuário é **Admin Global** (acesso total irrestrito a todos os consultórios, auditoria e gestão).
  * Se preenchido: Usuário pertence estritamente àquele consultório.
* `role` (enum `app_role`):
  * `'admin'`: Acesso total (Global se `clinic_id IS NULL`; ou Administrador da clínica).
  * `'doctor'`: Médico psiquiatra vinculado ao consultório.
  * `'staff'`: Secretária / equipe de recepção e apoio.

### `public.doctor_profiles` (Perfis Médicos)
Médicos do corpo clínico disponíveis para seleção pelo paciente:
* `id` (uuid, PK)
* `clinic_id` (uuid, FK `clinics`): Consultório ao qual o médico pertence.
* `user_id` (uuid, FK `auth.users`): Conta de login do profissional.
* `display_name` (text): Nome completo visível (ex: `"Dr. José Ribamar Fernandes Saraiva Junior"`).
* `crm` (text): Registro profissional (ex: `"CRM-RS 29349"`).
* `specialty` (text): Especialidade e qualificações (ex: `"Psiquiatria ABP · RQE 30038 · TCC · Dependência Química · Geriatria"`).
* `is_active` (boolean): Disponibilidade no seletor da pré-triagem.

### `public.assessments` (Triagens Realizadas)
Armazena as respostas da jornada adaptativa do paciente:
* `id` (uuid, PK)
* `clinic_id` (uuid, FK `clinics`): Consultório onde a triagem foi feita.
* `doctor_id` (uuid, FK `doctor_profiles`, Nullable): Médico direcionado.
* `respondent_name` (text): Nome do paciente.
* `respondent_age` (integer): Idade em anos.
* `respondent_email` (text): E-mail do paciente (chave mestra do Portal do Paciente).
* `respondent_phone` (text): WhatsApp com DDD para contato da clínica.
* `respondent_type` (text): `'paciente'` ou `'familiar'`.
* `status` (text): `'submitted'`, `'reviewed'`, `'in_progress'`.
* `risk_flags` (text[]): Sinalizadores clínicos de alerta imediato (ideação suicida, virada maníaca, crise).
* `summary` (jsonb): Resumo estruturado do caso, queixas, escalas indicadas e `risk_pathway`.
* `submitted_at` (timestamptz): Timestamp da submissão.

### `public.scale_results` (Resultados das 28 Escalas)
Pontuações individuais e psicométricas de cada instrumento aplicado:
* `id` (uuid, PK)
* `assessment_id` (uuid, FK `assessments`, ON DELETE CASCADE): Triagem vinculada.
* `scale_code` (text): Código padronizado (ex: `'PHQ-9'`, `'GAD-7'`, `'ISI'`, `'MDQ'`, `'AUDIT'`).
* `score` (numeric): Escore bruto obtido.
* `band` (text): Classificação clínica da gravidade (ex: `'Depressão moderada'`).
* `band_level` (integer): Gravidade ordinal (0 a 4).
* `risk` (boolean): Flag de risco clínico crítico associado à escala.
* `answers` (jsonb): Respostas item a item para análise detalhada do médico.

---

## 2. Módulo de Psicoeducação & Plano de Segurança

### `public.psychoeducation_topics`
Os 10 temas clínicos oficiais com ícones Lucide, tags e ordenação prioritária:
* `id` (uuid, PK)
* `slug` (text, UNIQUE): Slugs canônicos (`depressao-humor`, `ansiedade-preocupacao`, `crise-emocional`, `insonia-sono`, `tdah-adultos`, `oscilacoes-humor`, `alcool-substancias`, `trauma-tept`, `burnout-esgotamento`, `bem-estar-prevencao`).
* `title` (text): Título humanizado do tema.
* `short_title` (text): Título condensado para navegação e tags.
* `description` (text): Descrição da finalidade clínica.
* `icon` (text): Nome do ícone visual.
* `is_active` (boolean): Disponibilidade global.

### `public.psychoeducation_contents`
Versões de conteúdo (`version: 'v1'`, `level: 'resumo'` | `'completo'` | `'crise'`):
* `id` (uuid, PK)
* `topic_id` (uuid, FK `psychoeducation_topics`, ON DELETE CASCADE)
* `version` (text): Versão editorial (ex: `'v1'`).
* `level` (text): Nível de detalhamento.
* `title` (text): Título do conteúdo.
* `body_md` (text): Texto em Markdown detalhado para o Portal do Paciente.
* `summary_pdf` (text): Síntese de autocuidado para impressão no PDF do paciente.
* `is_published` (boolean): Status de publicação.

### `public.clinic_psychoeducation_settings`
Controle do médico sobre quais temas ativar ou desativar em seu consultório:
* `id` (uuid, PK)
* `clinic_id` (uuid, FK `clinics`, ON DELETE CASCADE)
* `topic_id` (uuid, FK `psychoeducation_topics`, ON DELETE CASCADE)
* `is_enabled` (boolean): Se o tema está liberado na clínica.
* `auto_trigger` (boolean): Se é disparado automaticamente pelos algoritmos.

### `public.assessment_psychoeducation`
Materiais vinculados a cada avaliação individual e rastreamento de engajamento:
* `id` (uuid, PK)
* `assessment_id` (uuid, FK `assessments`, ON DELETE CASCADE)
* `topic_id` (uuid, FK `psychoeducation_topics`, ON DELETE CASCADE)
* `trigger_reason` (text): Justificativa do gatilho clínico (ex: `"PHQ-9 escore 16"`).
* `is_manual` (boolean): Se foi prescrito manualmente pelo Dr. Saraiva no prontuário.
* `viewed_at` (timestamptz): Registro da leitura pelo paciente no Portal (Métricas de Engajamento).

---

## 3. Row Level Security (RLS) & Governança

1. **Pacientes Anônimos (anon):**
   * Leitura de dados públicos da clínica pelo slug (`clinics`).
   * Submissão pública de triagem e escalas (`INSERT ON assessments`, `scale_results`).
   * Isolamento absoluto: não conseguem ler nenhuma triagem de outros pacientes.
2. **Pacientes Autenticados (authenticated):**
   * Acesso exclusivo às triagens associadas ao seu próprio e-mail verificado no Portal do Paciente.
3. **Corpo Clínico (Médicos e Staff):**
   * Acesso restrito às triagens e prontuários da clínica vinculada em `user_roles`.
4. **Admin Global (`role = 'admin'` e `clinic_id IS NULL`):**
   * Acesso total e irrestrito para auditoria, suporte clínico e faturamento de todas as unidades.

---

## 4. Script Consolidado para Replicação Imediata
O banco completo com todas as 28 escalas, RLS, clínicas, triggers e psicoeducação pode ser recriado com 1 comando via:  
👉 **[consolidated_schema.sql](file:///mnt/armazenamento/Projetos/triagem-medica/supabase/consolidated_schema.sql)**
