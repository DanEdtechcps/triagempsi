# 02. Banco de Dados e Migrações (PostgreSQL / Supabase)

O banco de dados é hospedado no PostgreSQL (Supabase) sob o projeto `ffyjjkouscnabyxjxexu.supabase.co`. Toda a integridade relacional, isolamento de dados entre clínicas (Multi-Tenancy) e permissões de acesso são fiscalizados a nível de banco por **Row Level Security (RLS)**.

---

## 1. Dicionário de Tabelas Principais

### `public.clinics` (Consultórios / Clínicas)
Representa cada consultório que utiliza a plataforma.
* `id` (uuid, PK): Identificador único da clínica.
* `slug` (text, UNIQUE): Identificador amigável da URL (ex: `/padrao/triagem` ou `/clinica-dr-jose/triagem`).
* `name` (text): Nome comercial da clínica.
* `tagline` (text): Descrição curta abaixo do nome.
* `primary_color` (text): Cor primária do tema em Hex (ex: `#2f7a86`).
* `accent_color` (text): Cor de destaque (ex: `#7cc7cc`).
* `intro_copy` (text): Texto de introdução exibido antes do questionário.
* `done_copy` (text): Mensagem de conclusão ao finalizar o envio.
* `logo_url`, `favicon_url` (text): URLs de assets visuais.
* `contact_email`, `contact_phone`, `website_url` (text): Informações de contato.

### `public.user_roles` (Papéis e Permissões - RBAC)
Define o papel de cada usuário no sistema.
* `id` (uuid, PK)
* `user_id` (uuid, FK `auth.users`): Usuário autenticado.
* `clinic_id` (uuid, FK `clinics`, Nullable): 
  * Se `NULL`: Usuário é **Admin Global** (acesso a todas as clínicas, faturamento e auditoria).
  * Se preenchido: Usuário pertence àquela clínica específica.
* `role` (enum `app_role`): Valores possíveis:
  * `'admin'`: Acesso gerencial ao consultório ou global.
  * `'doctor'`: Médico psiquiatra vinculado ao consultório.
  * `'staff'`: Secretária / equipe de apoio.

### `public.doctor_profiles` (Perfis dos Médicos)
Médicos listados para seleção pelo paciente no momento da triagem.
* `id` (uuid, PK)
* `clinic_id` (uuid, FK `clinics`): Consultório ao qual o médico pertence.
* `user_id` (uuid, FK `auth.users`): Conta de login do médico.
* `display_name` (text): Nome visível (ex: "Dr. Marcel Villalumen").
* `specialty` (text): Especialidade (ex: "Psiquiatria da Infância e Adolescência").
* `is_listed` (boolean): Se aparece no seletor de médicos da triagem pública.

### `public.assessments` (Triagens Realizadas)
Armazena a submissão do questionário pelo paciente.
* `id` (uuid, PK)
* `clinic_id` (uuid, FK `clinics`): Clínica onde a triagem foi feita.
* `doctor_id` (uuid, FK `doctor_profiles`, Nullable): Médico escolhido pelo paciente.
* `respondent_name` (text): Nome completo do paciente.
* `respondent_age` (integer): Idade informada.
* `respondent_email` (text): E-mail do paciente (chave para Portal do Paciente).
* `respondent_phone` (text): Telefone / WhatsApp com DDD.
* `respondent_type` (text): `'paciente'` ou `'familiar'`.
* `status` (text): `'submitted'`, `'reviewed'`, `'in_progress'`.
* `risk_flags` (text[]): Flags clínicas levantadas (ex: risco de suicídio, mania, psicose).
* `summary` (jsonb): Resumo estruturado do caso, sintomas e escalas indicadas.
* `submitted_at` (timestamptz): Momento exato da submissão.

### `public.scale_results` (Resultados Detalhados por Escala)
Pontuação calculada de cada uma das 28 escalas psiquiátricas aplicadas na triagem.
* `id` (uuid, PK)
* `assessment_id` (uuid, FK `assessments`): Triagem correspondente.
* `scale_code` (text): Código da escala (ex: `'phq9'`, `'gad7'`, `'asrs'`, `'audit'`).
* `score` (numeric): Pontuação total atingida.
* `band` (text): Faixa de severidade (ex: `'Mínima'`, `'Leve'`, `'Moderada'`, `'Grave'`).
* `band_level` (integer): Nível numérico da faixa para ordenação no painel.
* `risk` (boolean): Flag se a escala indicou risco clínico crítico.

### `public.patient_longitudinal_records` (Acompanhamento Longitudinal)
Histórico evolutivo de triagens repetidas do mesmo paciente.
* `id` (uuid, PK)
* `patient_email` (text): Identificador do paciente.
* `clinic_id` (uuid, FK `clinics`)
* `baseline_assessment_id` (uuid, FK `assessments`): Primeira triagem (marco zero).
* `latest_assessment_id` (uuid, FK `assessments`): Triagem mais recente.
* `total_assessments` (integer): Contagem de avaliações realizadas.

### `public.plans` e `public.clinic_subscriptions` (Monetização B2B)
Gestão de assinaturas e planos do SaaS:
* `plans`: Códigos: `'consultorio'` (R$ 890/mês), `'clinica'` (R$ 2.400/mês), `'instituicao'`.
* `clinic_subscriptions`: Status da assinatura (`'trial'`, `'active'`, `'canceled'`), prazo de teste e notas.

### `public.audit_logs` (Governança e LGPD)
Rastreabilidade estrita de leitura e exportação de relatórios clínicos.
* `id` (uuid, PK)
* `clinic_id` (uuid)
* `actor_user_id` (uuid): Quem realizou a ação.
* `action` (text): `'assessment_viewed'`, `'pdf_exported'`, `'doctor_created'`.
* `details` (jsonb): IP, User-Agent e metadados da auditoria.

### `public.landing_settings` (Configurações da Landing Page)
Textos e metadados institucionais gerenciáveis via painel de administração geral.

### `public._keepalive` (Heartbeat Anti-Suspensão)
Tabela criada especificamente para impedir a suspensão automática por inatividade no Supabase Cloud:
* `id` (integer, PK: 1)
* `last_ping` (timestamptz): Timestamp do último ping executado.
* `ping_count` (bigint): Contador cumulativo de pulsos.

---

## 2. Row Level Security (RLS) & Segurança

1. **Pacientes Anônimos (anon):**
   * Podem ler dados públicos da clínica (`clinics`) pelo slug.
   * Podem criar uma nova triagem (`INSERT ON assessments`, `scale_results`).
   * **NÃO** podem ler triagens de outros pacientes nem acessar dados administrativos.
2. **Pacientes Autenticados (authenticated):**
   * Podem ler apenas as suas próprias triagens cujo `respondent_email` seja idêntico ao e-mail confirmado da sua conta.
3. **Equipe Clínica (Médicos / Staff):**
   * Têm acesso somente às triagens da `clinic_id` à qual estão vinculados em `user_roles`.
4. **Admin Global:**
   * Usuários com `role = 'admin'` e `clinic_id IS NULL` têm acesso irrestrito a todas as tabelas, clínicas, planos e auditoria.

---

## 3. Storage (Buckets)

* **Bucket `landing` (Private):**
  * Utilizado para guardar miniaturas de compartilhamento (OpenGraph images) e logos de consultórios.
  * O upload e substituição são permitidos apenas para administradores autenticados.
  * O download de imagens geradas é servido via Edge com caching.

---

## 4. Script Consolidado para Replicação Imediata
O banco completo pode ser recriado com 1 comando através do script:
👉 **[consolidated_schema.sql](file:///mnt/armazenamento/Projetos/triagem-medica/supabase/consolidated_schema.sql)**

Basta abrir o SQL Editor de qualquer projeto Supabase, colar o arquivo consolidado e executar.
