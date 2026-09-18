# Runbook de Reprodução Do Zero (Guia de Execução Cirúrgico)

Este runbook foi desenvolvido para permitir que **qualquer agente de IA, CLI autônoma ou engenheiro de software** reproduza este projeto integralmente do zero em menos de 10 minutos, garantindo funcionamento idêntico tanto em desenvolvimento local quanto em produção.

---

## 1. Pré-Requisitos do Ambiente

- **Sistema Operacional:** Linux (Ubuntu/Debian recomendado) ou macOS / WSL2 no Windows.
- **Gerenciador de Pacotes e Runtime:** [Bun](https://bun.sh/) (v1.2.0 ou superior) ou Node.js (v20+ / v22+).
- **Git:** Git instalado e configurado.
- **Conta Supabase:** Projeto criado na região mais próxima (ex: `sa-east-1` São Paulo).
- **Conta Cloudflare:** (Opcional para deploy web) Cloudflare Workers / Pages ativo com Wrangler CLI.

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
# ou se estiver usando npm/pnpm:
# npm install --legacy-peer-deps
```

### Passo 2.3: Configurar Variáveis de Ambiente

Crie o arquivo `.env` na raiz do projeto clonado:

```bash
cp .env.example .env # ou preencha diretamente
```

Preencha com suas credenciais do Supabase:

```ini
# .env e .env.production
VITE_SUPABASE_URL=https://<SEU_PROJECT_ID>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_... (ou anon key)
VITE_SUPABASE_PROJECT_ID=<SEU_PROJECT_ID>
```

> **Atenção:** Em ambientes de build estático (Vite), certifique-se de que o `.env.production` também possua estas chaves para que a substituição estática ocorra sem deixar variáveis `undefined`.

---

## 3. Provisionamento do Banco de Dados (Supabase)

### Passo 3.1: Aplicar o Schema Unificado

1. Acesse o painel do seu projeto no Supabase: `https://supabase.com/dashboard/project/<SEU_PROJECT_ID>/sql`
2. Abra o arquivo [`supabase/consolidated_schema.sql`](file:///mnt/armazenamento/Projetos/triagem-medica/supabase/consolidated_schema.sql).
3. Copie todo o conteúdo e cole no SQL Editor do Supabase.
4. Execute o script (`Run`). Ele irá:
   - Habilitar `pgcrypto` e `uuid-ossp`.
   - Criar os tipos enumerados (`app_role`, etc.).
   - Criar todas as tabelas clínicas e de infraestrutura com índices de performance.
   - Ativar RLS e instalar todas as políticas de segurança granulares.
   - Criar triggers de auto-atualização de `updated_at`.

### Passo 3.2: Configurar Storage Bucket

Execute no SQL Editor para criar o bucket de imagens de landing:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('landing', 'landing', false)
ON CONFLICT (id) DO NOTHING;
```

### Passo 3.3: Criar Usuário Administrador

1. Vá em **Authentication -> Users** e clique em **Add User -> Create User**.
2. Preencha o e-mail e senha desejados (ex: `admin@clinica.com.br` / `SenhaForte123!`).
3. Marque a opção **Auto Confirm User?** como **Yes**.
4. Copie o UID gerado para este usuário.
5. Volte ao SQL Editor e atribua o perfil de Administrador Global (`role = 'admin'` e `clinic_id = NULL`):

```sql
INSERT INTO public.user_roles (user_id, role, clinic_id)
VALUES ('<UID_COPIADO>', 'admin', NULL)
ON CONFLICT (user_id, role, COALESCE(clinic_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;
```

### Passo 3.4: Ativar Prevenção de Suspensão (Keepalive)

Para evitar que projetos no tier gratuito do Supabase sejam pausados por inatividade:

1. Execute o script [`supabase/keepalive.sql`](file:///mnt/armazenamento/Projetos/triagem-medica/supabase/keepalive.sql) no SQL Editor.
2. No repositório GitHub, adicione os segredos em **Settings -> Secrets and variables -> Actions**:
   - `SUPABASE_URL`: `https://<SEU_PROJECT_ID>.supabase.co`
   - `SUPABASE_ANON_KEY`: `sb_publishable_...`
3. A GitHub Action [`.github/workflows/supabase-keepalive.yml`](file:///mnt/armazenamento/Projetos/triagem-medica/.github/workflows/supabase-keepalive.yml) enviará requisições periódicas automaticamente.

---

## 4. Validação e Execução Local

### Passo 4.1: Testes Unitários

Execute a suíte de testes automatizados com Vitest:

```bash
bun test:run
# ou
bun run test
```

*Resultado Esperado:* 82 testes passando (100% sucesso).

### Passo 4.2: Verificação de Tipos TypeScript

```bash
bun run build
# ou
bun x tsc --noEmit
```

*Resultado Esperado:* 0 erros de compilação.

### Passo 4.3: Iniciar Servidor de Desenvolvimento

```bash
bun run dev
```

Acesse no navegador: `http://localhost:8080`

---

## 5. Deploy em Produção (Cloudflare Workers / Pages)

O projeto está otimizado para deploy em edge computing via Cloudflare Workers utilizando o runtime Nitro/Vite.

### Passo 5.1: Configurar Wrangler

Edite ou confirme o arquivo [`wrangler.json`](file:///mnt/armazenamento/Projetos/triagem-medica/wrangler.json):

```json
{
  "name": "triagempsi",
  "compatibility_date": "2026-03-01",
  "compatibility_flags": ["nodejs_compat"],
  "main": "./dist/server/index.mjs",
  "assets": {
    "binding": "ASSETS",
    "directory": "./dist/client"
  },
  "vars": {
    "SUPABASE_URL": "https://<SEU_PROJECT_ID>.supabase.co",
    "SUPABASE_PUBLISHABLE_KEY": "sb_publishable_...",
    "SUPABASE_PROJECT_ID": "<SEU_PROJECT_ID>",
    "VITE_SUPABASE_URL": "https://<SEU_PROJECT_ID>.supabase.co",
    "VITE_SUPABASE_PUBLISHABLE_KEY": "sb_publishable_...",
    "VITE_SUPABASE_PROJECT_ID": "<SEU_PROJECT_ID>"
  }
}
```

### Passo 5.2: Secret da Service Role (Edge Functions)

Nunca comite chaves privadas no Git. Configure como secret no Cloudflare:

```bash
bun x wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Quando solicitado, cole a secret role key do Supabase
```

### Passo 5.3: Build e Deploy

```bash
bun run build
bun x wrangler deploy
```

O terminal exibirá a URL pública ativa (ex: `https://triagempsi.<seu-subdominio>.workers.dev`).

---

## 6. Checklist de Verificação Pós-Deploy

1. [ ] **Landing Page:** Acessar `/` e verificar carregamento sem flashes ou telas de erro.
2. [ ] **Autenticação:** Acessar `/auth` ou `/entrar` e fazer login com o usuário criado no Passo 3.3.
3. [ ] **Painel Admin:** Acessar `/admin` e confirmar visualização das tabelas e estatísticas.
4. [ ] **Fluxo de Triagem Pública:** Acessar `/padrao/triagem`, responder ao fluxo completo de perguntas e verificar se o cálculo clínico de PHQ-9 / GAD-7 / C-SSRS e encaminhamento funcionam corretamente.
