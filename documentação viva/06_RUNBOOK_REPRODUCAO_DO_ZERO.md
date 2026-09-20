# 06. Runbook de Reprodução Do Zero (Guia Cirúrgico de Execução)

> **Finalidade:** Permitir que qualquer engenheiro de software, CLI autônoma ou agente de IA configure e execute a infraestrutura completa do TriagemPsi do zero em menos de 10 minutos com 100% de paridade de produção.  
> **Versão:** v1.30.0 (Multi-Tenant Federado)

---

## 1. Pré-Requisitos Mínimos

* **Sistema Operacional:** Linux (Ubuntu 22.04/24.04 LTS recomendado) ou macOS / WSL2 no Windows.
* **Runtime & Package Manager:** [Bun](https://bun.sh/) (v1.2.0 ou superior, testado com v1.4+) ou Node.js (v22+).
* **Git:** v2.40+.
* **Supabase:** Projeto PostgreSQL criado na nuvem ou em Docker local.
* **Cloudflare:** Conta com Workers ativado e Wrangler CLI autenticado (para deploy).

---

## 2. Instalação e Preparação do Ambiente

### Passo 2.1: Clonar o Repositório
```bash
git clone https://github.com/DanEdtechcps/triagempsi.git
cd triagempsi
```

### Passo 2.2: Instalar as Dependências com Bun
```bash
bun install
```

### Passo 2.3: Configurar Variáveis de Ambiente
Crie o arquivo `.env` na raiz do projeto:

```ini
# .env (Ambiente Local e SSR)
VITE_SUPABASE_URL=https://ffyjjkouscnabyxjxexu.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_3F04VCYRIoUVH0mXyZBOEg_EQsVTMaT
VITE_SUPABASE_PROJECT_ID=ffyjjkouscnabyxjxexu

SUPABASE_URL=https://ffyjjkouscnabyxjxexu.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_3F04VCYRIoUVH0mXyZBOEg_EQsVTMaT
SUPABASE_PROJECT_ID=ffyjjkouscnabyxjxexu

# Chave mestra administrativa para Server Functions locais
SUPABASE_SERVICE_ROLE_KEY=sb_secret_SEU_SECRET_AQUI
```

---

## 3. Provisionamento do Banco de Dados (Supabase)

### Passo 3.1: Aplicar o Schema Consolidado
1. Abra o SQL Editor do seu projeto Supabase: `https://supabase.com/dashboard/project/<PROJECT_ID>/sql`
2. Abra o arquivo [`supabase/consolidated_schema.sql`](file:///mnt/armazenamento/Projetos/triagem-medica/supabase/consolidated_schema.sql).
3. Cole e execute o script. Ele irá:
   - Ativar `pgcrypto`.
   - Criar o enum `app_role` (`'admin'`, `'doctor'`, `'staff'`).
   - Criar as tabelas `clinics`, `doctor_profiles`, `assessments`, `scale_results`.
   - Criar as 4 tabelas de psicoeducação com a carga dos 10 tópicos oficiais.
   - Criar o cadastro da **Saraiva Clínica de Psiquiatria** (`slug = 'saraiva'`).
   - Habilitar e aplicar políticas estritas de Row Level Security (RLS).

### Passo 3.2: Provisionar a Clínica Federada (Instituto Lumina)
Execute o script de provisionamento multi-tenant:
👉 Arquivo: [`supabase/migrations/20260919200000_provision_lumina_saude.sql`](file:///mnt/armazenamento/Projetos/triagem-medica/supabase/migrations/20260919200000_provision_lumina_saude.sql)

Ele cadastra o **Instituto Lumina de Saúde Mental** (`id: b1a1a1a1-bbbb-cccc-dddd-eeeeeeeeeeee`, `slug: lumina`) e a Dra. Camila Rocha.

### Passo 3.3: Configurar o Storage Bucket
No SQL Editor, garanta que o bucket de mídia existe:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('landing', 'landing', false)
ON CONFLICT (id) DO NOTHING;
```

### Passo 3.4: Cadastrar Usuários de Acesso e Definir Papéis
No painel **Authentication -> Users**, crie os seguintes acessos (marcando **Auto Confirm User? = Yes**):

1. **Superadministrador Global:**
   - E-mail: `coletivoaruatemvoz@gmail.com`
   - SQL de Permissão:
     ```sql
     INSERT INTO public.user_roles (user_id, role, clinic_id)
     VALUES ('<UID_ARUATEMVOZ>', 'admin', NULL)
     ON CONFLICT (user_id, role, COALESCE(clinic_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;
     ```

2. **Médico Titular Saraiva:**
   - E-mail: `joserfsaraivajr@gmail.com`
   - SQL de Permissão:
     ```sql
     INSERT INTO public.user_roles (user_id, role, clinic_id)
     VALUES ('<UID_SARAIVA>', 'doctor', '0da5f2ec-c592-429a-af9c-e4c7eb4e952b')
     ON CONFLICT (user_id, role, COALESCE(clinic_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;

     -- Associar perfil profissional
     INSERT INTO public.doctor_profiles (id, clinic_id, display_name, crm, specialty, is_active)
     VALUES (
       '<UID_SARAIVA>',
       '0da5f2ec-c592-429a-af9c-e4c7eb4e952b',
       'Dr. José Ribamar Fernandes Saraiva Junior',
       'CRM-RS 29349',
       'Psiquiatria ABP · RQE 30038 · TCC · Dependência Química · Geriatria',
       true
     )
     ON CONFLICT (id) DO UPDATE SET is_active = true;
     ```

---

## 4. Testes Automatizados e Validação Local

### Passo 4.1: Executar a Suíte Completa de Testes
```bash
bun run test
```
*Critério de Aceite:* **204 testes aprovados** (100% verde em 16 arquivos de teste, cobrindo CAT/TRI, Dwell-Time, Grafo DAG, Schemas JSON e RLS multi-tenant).

### Passo 4.2: Verificação Estrita de Tipagem TypeScript
```bash
bun x tsc --noEmit
```
*Critério de Aceite:* **0 erros de tipagem**.

### Passo 4.3: Iniciar o Servidor de Desenvolvimento
```bash
bun run dev
```
Acesse localmente em: `http://localhost:8080/saraiva/triagem`

---

## 5. Compilação e Deploy em Produção (Cloudflare Workers)

### Passo 5.1: Compilar Bundle Otimizado
```bash
bun run build
```
O Nitro compilará os assets estáticos em `.output/public` e o runtime do Worker em `.output/server/index.mjs`.

### Passo 5.2: Injetar a Service Role Key na Cloudflare
> [!IMPORTANT]
> Nunca coloque a `SUPABASE_SERVICE_ROLE_KEY` no `wrangler.json`. Injete diretamente via secret criptografada:
```bash
bun x wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

### Passo 5.3: Executar Deploy
```bash
bun x wrangler deploy
```
O Cloudflare publicará o Worker imediatamente no endpoint ativo:  
`https://triagempsi.pontocomumtus.workers.dev`

---

## 6. Checklist de Verificação Pós-Deploy

1. [ ] **Acolhimento Saraiva:** Acessar `/saraiva/triagem` e validar paleta `#1e4d5c` / `#3d8b8b`.
2. [ ] **Acolhimento Lumina:** Acessar `/lumina/triagem` e validar identidade visual independente.
3. [ ] **Autenticação:** Acessar `/auth` e efetuar login com `coletivoaruatemvoz@gmail.com`.
4. [ ] **TenantSwitcher:** No `/painel`, alternar entre "Todas as Clínicas", "Saraiva" e "Lumina" e conferir a atualização reativa da lista de triagens.
5. [ ] **Cockpit de Psicoeducação:** Acessar `/materiais`, buscar por tema, abrir modal de leitura e testar o botão "Copiar p/ WhatsApp".
6. [ ] **Via de Risco:** Realizar um teste simulando PHQ-9 item 9 ≥ 1 e confirmar o disparo do Plano de Segurança com CVV 188 e SAMU 192.
