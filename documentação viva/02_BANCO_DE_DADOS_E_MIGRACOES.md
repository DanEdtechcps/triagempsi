# 02. Banco de Dados, Migrações e Políticas RLS (PostgreSQL / Supabase)

> **Instância de Produção:** `ffyjjkouscnabyxjxexu.supabase.co` (Região: São Paulo `sa-east-1`)  
> **Motor Relacional:** PostgreSQL 15+ com extensões `pgcrypto` e `uuid-ossp`  
> **Versão do Schema:** v1.30.0 (Atualizada com Provisionamento Lumina Saúde Mental)

---

## 1. Dicionário de Tabelas Principais

### `public.clinics` (Consultórios e Clínicas Federadas)
Cadastra as unidades médicas atendidas pela plataforma, permitindo isolamento visual e operacional.
* `id` (`uuid`, PK): Identificador único da clínica.
* `slug` (`text`, UNIQUE): Identificador amigável de rota (ex: `'saraiva'`, `'lumina'`). Nota
  2026-09-21: existia um `'padrao'` duplicando a Saraiva com id próprio — mesclado e removido.
* `name` (`text`): Nome institucional (ex: `"Saraiva Clínica de Psiquiatria"`, `"Instituto Lumina de Saúde Mental"`).
* `tagline` (`text`): Lema de acolhimento clínico.
* `primary_color` (`text`): Hexadecimal da cor primária (ex: `"#1e4d5c"` Saraiva, `"#1e1b4b"` Lumina).
* `accent_color` (`text`): Hexadecimal de realce (ex: `"#3d8b8b"` Saraiva, `"#6366f1"` Lumina).
* `intro_copy` (`text`): Texto de boas-vindas do responsável técnico na abertura da triagem.
* `done_copy` (`text`): Mensagem final orientativa apresentada ao paciente após a submissão.
* `logo_url`, `favicon_url` (`text`): Assets gráficos armazenados no bucket Supabase Storage `landing`.
* `contact_email`, `contact_phone`, `website_url` (`text`): Canais diretos de comunicação e WhatsApp.

### `public.user_roles` (Controle de Acesso RBAC Unificado)
Gerencia as permissões de acesso ao sistema com suporte nativo a multi-tenancy federado:
* `id` (`uuid`, PK)
* `user_id` (`uuid`, FK `auth.users`, ON DELETE CASCADE): Usuário autenticado no Supabase Auth.
* `clinic_id` (`uuid`, FK `clinics`, Nullable):
  * **Se `NULL`:** O usuário é **Superadministrador Global**. Possui acesso irrestrito a todas as clínicas, todas as triagens, visualização global no `TenantSwitcher` e privilégio de auditoria total. (Exclusivo: `coletivoaruatemvoz@gmail.com`).
  * **Se preenchido com UUID:** O usuário tem seu acesso escopado estritamente àquela clínica específica (Médico ou Staff local).
* `role` (`app_role` ENUM):
  * `'admin'`: Administrador (Global se `clinic_id IS NULL`; Local se associado a uma clínica).
  * `'doctor'`: Médico psiquiatra titular ou assistente.
  * `'staff'`: Secretária, recepcionista ou equipe multidisciplinar de apoio.

### `public.doctor_profiles` (Perfis Médicos)
Profissionais cadastrados para seleção na jornada de acolhimento e assinatura de relatórios:
* `id` (`uuid`, PK, FK `auth.users` opcional): Identificador do médico.
* `clinic_id` (`uuid`, FK `clinics`): Unidade à qual o médico pertence.
* `display_name` (`text`): Nome formal (ex: `"Dr. José Ribamar Fernandes Saraiva Junior"`, `"Dra. Camila Rocha"`).
* `crm` (`text`): Registro médico e estado (ex: `"CRM-RS 29349"`, `"CRM-SP 189420"`).
* `specialty` (`text`): RQE e áreas de atuação (ex: `"Psiquiatria ABP · RQE 30038 · TCC · Dependência Química · Geriatria"`).
* `is_active` (`boolean`): Flag que habilita a exibição do profissional no seletor da pré-triagem.

### `public.assessments` (Triagens e Prontuários Adaptativos)
Registro central de cada avaliação preenchida pelo paciente ou familiar:
* `id` (`uuid`, PK, DEFAULT `gen_random_uuid()`): Identificador do caso.
* `clinic_id` (`uuid`, FK `clinics`, NOT NULL): Clínica onde a triagem foi realizada.
* `doctor_id` (`uuid`, FK `doctor_profiles`, Nullable): Médico direcionado para o atendimento.
* `respondent_name` (`text`): Nome do paciente.
* `respondent_age` (`integer`): Idade cronológica em anos (utilizada para bifurcações infantojuvenil/adulto/idoso).
* `respondent_email` (`text`, NOT NULL): E-mail do paciente (chave de autenticação do Portal do Paciente).
* `respondent_phone` (`text`): WhatsApp para contato da secretaria.
* `respondent_type` (`text`): `'paciente'` ou `'familiar'`.
* `status` (`text`): `'submitted'` (aguardando consulta), `'reviewed'` (analisado pelo médico), `'in_progress'`.
* `risk_flags` (`text[]`): Sinais de risco imediato detectados (ex: `['IDEACAO_SUICIDA', 'RISCO_BIPOLAR', 'ABUSO_SUBSTANCIAS']`).
* `summary` (`jsonb`): Estrutura com dados consolidados: queixa principal, escalas respondidas, telemetria de **Dwell-Time** (tempo total, tempo mediano por item, itens de hesitação focal) e **Estimativas CAT/TRI** ($\theta$ e erro padrão $SE$).
* `submitted_at` (`timestamptz`, DEFAULT `now()`): Data/hora de envio.

### `public.scale_results` (Resultados Detalhados das 28 Escalas)
Pontuação psicométrica de cada instrumento acionado:
* `id` (`uuid`, PK)
* `assessment_id` (`uuid`, FK `assessments`, ON DELETE CASCADE): Triagem vinculada.
* `scale_code` (`text`): Sigla do instrumento (ex: `'PHQ-9'`, `'GAD-7'`, `'ASRS-18'`, `'MDQ'`, `'C-SSRS'`, `'ISI'`, `'EPDS'`).
* `score` (`numeric`): Pontuação total bruta ou subtotal normalizado.
* `band` (`text`): Faixa clínica de severidade (ex: `'Depressão grave'`, `'Ansiedade moderada'`).
* `band_level` (`integer`): Gravidade ordinal de 0 a 4.
* `risk` (`boolean`): Flag booleano de risco clínico para triagem rápida.
* `answers` (`jsonb`): Respostas item a item com pontuações unitárias e timestamps de dwell-time.

---

## 2. Tabelas do Módulo de Psicoeducação

### `public.psychoeducation_topics` (10 Temas Clínicos Oficiais)
* `id` (`uuid`, PK)
* `slug` (`text`, UNIQUE): Slugs canônicos:
  1. `depressao-humor`
  2. `ansiedade-preocupacao`
  3. `crise-emocional` (Prioridade Máxima — CVV 188 / SAMU 192)
  4. `insonia-sono` (Pilares TCC-I)
  5. `tdah-adultos` (Funções executivas)
  6. `oscilacoes-humor` (Espectro Bipolar)
  7. `alcool-substancias` (Redução de danos)
  8. `trauma-tept` (TCC focada no trauma)
  9. `burnout-esgotamento` (NR-01 e estresse ocupacional)
  10. `bem-estar-prevencao` (Longevidade e estilo de vida)
* `title`, `short_title`, `description` (`text`): Textos humanizados de apresentação.
* `icon` (`text`): Nome do ícone Lucide correspondente.
* `is_active` (`boolean`): Ativação global no sistema.

### `public.psychoeducation_contents` (Conteúdos e Níveis Editoriais)
* `id` (`uuid`, PK)
* `topic_id` (`uuid`, FK `psychoeducation_topics`, ON DELETE CASCADE)
* `version` (`text`): Versão editorial (ex: `'v1'`).
* `level` (`text`): Nível de detalhe (`'resumo'`, `'completo'`, `'crise'`).
* `title` (`text`): Título do artigo ou guia.
* `body_md` (`text`): Conteúdo formatado em Markdown com técnicas de autorregulação e orientações.
* `summary_pdf` (`text`): Síntese de autocuidado incluída na impressão do relatório do paciente.
* `is_published` (`boolean`): Status de publicação.

### `public.clinic_psychoeducation_settings` (Customização por Consultório)
* `id` (`uuid`, PK)
* `clinic_id` (`uuid`, FK `clinics`, ON DELETE CASCADE)
* `topic_id` (`uuid`, FK `psychoeducation_topics`, ON DELETE CASCADE)
* `is_enabled` (`boolean`): Se a clínica disponibiliza o tema aos seus pacientes.
* `auto_trigger` (`boolean`): Se o material é acionado automaticamente pelos algoritmos de triagem.

### `public.assessment_psychoeducation` (Trilha do Paciente e Rastreio de Leitura)
* `id` (`uuid`, PK)
* `assessment_id` (`uuid`, FK `assessments`, ON DELETE CASCADE)
* `topic_id` (`uuid`, FK `psychoeducation_topics`, ON DELETE CASCADE)
* `trigger_reason` (`text`): Justificativa do gatilho clínico (ex: `"PHQ-9 escore 18 (Depressão Moderadamente Grave)"`).
* `is_manual` (`boolean`): Se foi prescrito manualmente pelo psiquiatra via prontuário.
* `viewed_at` (`timestamptz`): Registro da primeira leitura pelo paciente no Portal (Métricas de Engajamento).

---

## 3. Registro de Migrações Versionadas (`supabase/migrations/`)

| Migração | Descrição / Finalidade |
|---|---|
| `20260727173055_...` a `20260813064220_...` | Criação das tabelas base, primeiras 12 escalas e cadastros de consultório. |
| `20260917200000_unify_roles_and_rls.sql` | Unificação do controle de acesso `app_role` e definição de políticas RLS com suporte a Admin Global (`clinic_id IS NULL`). |
| `20260917230000_psychoeducation_module.sql` | Criação das 4 tabelas de psicoeducação, carga dos 10 tópicos com conteúdos em Markdown e vínculo com avaliações. |
| `20260919200000_provision_lumina_saude.sql` | Provisionamento do **Instituto Lumina de Saúde Mental & Neurociências** (`c0000000-0000-4000-8000-000000000002`), cadastro de Dr. Gustavo Mello (admin) e Dra. Camila Nogueira (doctor), vinculação estrita de médicos por clínica. (Corrigido 2026-09-21 — versão anterior desta doc citava uma Dra. Camila Rocha e um id `b1a1a1a1-...` que não batiam com o arquivo de migration real.) |
| `20260917200000_unify_roles_and_rls.sql` + `20260917230000_psychoeducation_module.sql` | Nunca tinham sido aplicadas em produção até 2026-09-21 — aplicadas nesta data (função `is_global_admin`, tabela `patient_longitudinal_records`, as 4 tabelas de psicoeducação + 10 temas semeados). |

---

## 4. Políticas de Row Level Security (RLS) e Funções Auxiliares

Todas as tabelas de saúde e dados sensíveis possuem RLS habilitado:

```sql
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scale_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_psychoeducation ENABLE ROW LEVEL SECURITY;
```

### Funções de Apoio com `SECURITY DEFINER`:

> Nota 2026-09-21: as assinaturas abaixo foram corrigidas pra bater com o que está de fato
> aplicado em produção. A versão anterior desta doc mostrava `is_global_admin()` sem parâmetro
> e uma função `get_auth_clinic_id()` que nunca existiu — a real é `is_global_admin(_user_id
> uuid)` (chamada como `is_global_admin(auth.uid())` dentro das policies) e `has_clinic_access
> (_clinic_id uuid)`. Aceitar `_user_id` como parâmetro deixa a função chamável via RPC público
> pra checar QUALQUER usuário — por padrão do Postgres/Supabase toda função nova em `public`
> nasce com EXECUTE liberado pra `anon`. Isso foi descoberto exposto (`anon` conseguia checar
> se um UUID arbitrário era admin global) e corrigido revogando EXECUTE de `anon` diretamente
> nessa função. Ainda aceita checar qualquer `_user_id` para usuários `authenticated` — migrar
> pra uma versão sem parâmetro (usando `auth.uid()` internamente, como a doc original sugeria)
> fecharia isso de vez, mas exigiria atualizar todas as policies que chamam
> `is_global_admin(auth.uid())`. Não fizemos essa migração ainda.

```sql
-- Versão REAL em produção (não a versão sem parâmetro documentada antes):
CREATE OR REPLACE FUNCTION public.is_global_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'::public.app_role AND clinic_id IS NULL
  );
$$;
-- chamada nas policies como: is_global_admin(auth.uid())

-- Equivalente real ao que a doc chamava de get_auth_clinic_id():
CREATE OR REPLACE FUNCTION public.has_clinic_access(_clinic_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND ((role = 'admin'::public.app_role AND clinic_id IS NULL) OR clinic_id = _clinic_id)
  );
$$;
```

### Regras de Acesso à Tabela `assessments`:
1. **Pacientes Anônimos (`anon`):**
   * Podem apenas criar novas avaliações (`INSERT`). Não possuem permissão de leitura (`SELECT`).
2. **Pacientes Autenticados (`authenticated`):**
   * Podem ler apenas as triagens cujo `respondent_email` seja idêntico a `auth.jwt() ->> 'email'`.
3. **Médicos e Equipe (`authenticated` com papel associado):**
   * Podem ler e atualizar apenas avaliações com `clinic_id = public.get_auth_clinic_id()`.
4. **Superadministrador Global:**
   * Caso `public.is_global_admin()` seja verdadeiro, tem acesso total de leitura, filtragem e atualização a qualquer triagem de qualquer clínica.

---

## 5. Script SQL Consolidado

Para provisionar ou restaurar a base integral de uma só vez, utilize o script mestre mantido em:  
👉 **[consolidated_schema.sql](file:///mnt/armazenamento/Projetos/triagem-medica/supabase/consolidated_schema.sql)**
