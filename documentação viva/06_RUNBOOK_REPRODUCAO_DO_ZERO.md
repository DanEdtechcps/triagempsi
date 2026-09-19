# Runbook de Reprodução Do Zero (Guia de Execução Cirúrgico)

Este runbook foi desenvolvido para permitir que **qualquer agente de IA, CLI autônoma ou engenheiro de software** reproduza este projeto integralmente do zero em menos de 10 minutos, garantindo funcionamento idêntico tanto em desenvolvimento local quanto em produção para a **Saraiva Clínica de Psiquiatria**.

---

## 1. Pré-Requisitos do Ambiente

- **Sistema Operacional:** Linux (Ubuntu/Debian recomendado) ou macOS / WSL2 no Windows.
- **Gerenciador de Pacotes e Runtime:** [Bun](https://bun.sh/) (v1.2.0 ou superior, recomendado v1.4+) ou Node.js (v20+ / v22+).
- **Git:** Git instalado e configurado.
- **Conta Supabase:** Projeto criado na região mais próxima (ex: `sa-east-1` São Paulo).
- **Conta Cloudflare:** (Opcional para deploy web) Cloudflare Workers ativo com Wrangler CLI.

---

## 2. Passo a Passo de Instalação e Configuração

### Passo 2.1: Clonar o Repositório

```bash
git clone https://github.com/DanEdtechcps/triagempsi.git
cd triagempsi
```

### Passo 2.2: Instalar Dependências

```bash
bun install
```

### Passo 2.3: Configurar Variáveis de Ambiente

Crie o arquivo `.env` na raiz do projeto clonado:

```bash
cp .env.example .env
```

Preencha com suas credenciais do Supabase:

```ini
# .env e .env.production
VITE_SUPABASE_URL=https://<SEU_PROJECT_ID>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_... (ou anon key)
VITE_SUPABASE_PROJECT_ID=<SEU_PROJECT_ID>
SUPABASE_URL=https://<SEU_PROJECT_ID>.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_PROJECT_ID=<SEU_PROJECT_ID>
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

---

## 3. Provisionamento do Banco de Dados (Supabase)

### Passo 3.1: Aplicar o Schema Unificado com as 28 Escalas e Psicoeducação

1. Acesse o painel do seu projeto no Supabase: `https://supabase.com/dashboard/project/<SEU_PROJECT_ID>/sql`
2. Abra o arquivo [`supabase/consolidated_schema.sql`](file:///mnt/armazenamento/Projetos/triagem-medica/supabase/consolidated_schema.sql).
3. Copie todo o conteúdo e execute no SQL Editor (`Run`). Ele irá:
   - Habilitar `pgcrypto` e extensões necessárias.
   - Criar o tipo unificado `app_role` (`'admin'`, `'doctor'`, `'staff'`).
   - Criar as 28 escalas com todos os pontos de corte e bandas.
   - Criar as tabelas do Módulo de Psicoeducação (`psychoeducation_topics`, `psychoeducation_contents`, etc.).
   - Criar a clínica padrão da **Saraiva Clínica de Psiquiatria** (`slug = 'saraiva'` com alias para `'padrao'`).
   - Ativar RLS rigoroso em 100% das tabelas.

### Passo 3.2: Configurar Storage Bucket

Execute no SQL Editor para criar o bucket de assets:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('landing', 'landing', false)
ON CONFLICT (id) DO NOTHING;
```

### Passo 3.3: Criar Usuário do Dr. Saraiva / Admin Global

1. Vá em **Authentication -> Users** e clique em **Add User -> Create User**.
2. Preencha o e-mail do Dr. Saraiva (ex: `drsaraiva@clinicasaraiva.med.br`) e defina a senha.
3. Marque **Auto Confirm User?** como **Yes**.
4. Copie o UID gerado para este usuário.
5. Volte ao SQL Editor e execute para conceder acesso total como Admin Global e associar o perfil médico:

```sql
-- Papel de Admin Global
INSERT INTO public.user_roles (user_id, role, clinic_id)
VALUES ('<UID_COPIADO>', 'admin', NULL)
ON CONFLICT (user_id, role, COALESCE(clinic_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;

-- Perfil Médico do Dr. Saraiva
INSERT INTO public.doctor_profiles (id, clinic_id, display_name, crm, specialty, is_active)
SELECT 
  '<UID_COPIADO>',
  id,
  'Dr. José Ribamar Fernandes Saraiva Junior',
  'CRM-RS 29349',
  'Psiquiatria ABP · RQE 30038 · TCC · Dependência Química · Geriatria',
  true
FROM public.clinics WHERE slug = 'saraiva'
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  crm = EXCLUDED.crm,
  specialty = EXCLUDED.specialty;
```

---

## 4. Validação e Execução Local

### Passo 4.1: Testes Unitários e Psicométricos

Execute a suíte com Vitest:

```bash
bun test:run
```

*Resultado Esperado:* **132 testes passando** (100% verde em 9 suítes de teste).

### Passo 4.2: Verificação de Tipos TypeScript

```bash
bun x tsc --noEmit
```

*Resultado Esperado:* **0 erros de tipagem**.

### Passo 4.3: Iniciar Servidor de Desenvolvimento

```bash
bun run dev
```

Acesse no navegador: `http://localhost:8080/saraiva/triagem`

---

## 5. Deploy em Produção (Cloudflare Workers)

### Passo 5.1: Build dos Assets e Server Functions

```bash
bun run build
```

O comando compila o frontend e o servidor Nitro otimizado para o Cloudflare Workers em `.output/`.

### Passo 5.2: Configurar Secret no Cloudflare

```bash
bun x wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Cole a Service Role Key do Supabase quando solicitado
```

### Passo 5.3: Executar Deploy

```bash
bun x wrangler deploy
```

O terminal exibirá a URL ativa: `https://triagempsi.pontocomumtus.workers.dev`.

---

## 6. Checklist de Verificação Pós-Deploy

1. [ ] **Landing Page:** Acessar `/` e verificar apresentação institucional.
2. [ ] **Acolhimento Saraiva:** Acessar `/saraiva` e `/saraiva/triagem` e confirmar cores (#1e4d5c / #3d8b8b) e intro copy do Dr. Saraiva.
3. [ ] **Autenticação:** Acessar `/auth` e fazer login com as credenciais do médico.
4. [ ] **Painel Clínico:** Acessar `/painel` e verificar listagem de triagens e filtros de risco.
5. [ ] **Fluxo de Crise e Segurança:** Responder ao fluxo simulando PHQ-9 item 9 ≥ 1 e confirmar exibição do **Plano de Segurança Estruturado com CVV 188 e SAMU 192**.
6. [ ] **Decision Support Médico:** Acessar o prontuário da triagem e verificar os cards de apoio à decisão diagnóstica e métricas de leitura.
