# Triagem Médica — Backup completo e guia de instalação em outro servidor

Este pacote contém **todo o código-fonte**, as **migrações do banco de dados** e os
scripts necessários para rodar o projeto em qualquer servidor.

---

## 1. O que vem no ZIP

```
src/                    Código da aplicação (React 19 + TanStack Start)
supabase/migrations/    Todas as migrações SQL (schema, RLS, grants, seeds)
supabase/config.toml    Referência do projeto de banco
scripts/                Automação de roadmap/changelog
e2e/                    Testes Playwright
public/                 Assets estáticos
package.json            Dependências e scripts
vite.config.ts          Build (TanStack Start + Nitro / target Cloudflare)
.env.example            Modelo das variáveis de ambiente
DEPLOY.md               Este guia
```

> `node_modules/`, `.git/`, builds e o `.env` real **não** vão no pacote (segredos).

---

## 2. Stack e requisitos

| Item | Versão mínima |
|---|---|
| Node.js | 20 LTS (recomendado 22) |
| Gerenciador | npm, pnpm ou bun |
| Banco de dados | PostgreSQL com Supabase (self-hosted ou Supabase Cloud) |

O backend é **Supabase** (Postgres + Auth + Storage). Toda a lógica de servidor está
em *server functions* do TanStack Start (`src/lib/*.functions.ts`) — não há edge functions
a implantar separadamente.

---

## 3. Instalação passo a passo

### 3.1 Descompactar e instalar dependências
```bash
unzip triagem-medica-backup.zip -d triagem-medica
cd triagem-medica
npm install          # ou: pnpm install / bun install
```

### 3.2 Criar o projeto de banco (Supabase)
1. Crie um projeto novo em https://supabase.com (ou suba um Supabase self-hosted).
2. Anote: **Project URL**, **Publishable/anon key** e **Service role key**.

### 3.3 Aplicar as migrações
Com a Supabase CLI (recomendado):
```bash
npm i -g supabase
supabase link --project-ref <SEU_PROJECT_REF>
supabase db push
```
Sem a CLI: abra o SQL Editor e execute os arquivos de `supabase/migrations/`
**em ordem alfabética/cronológica** (o nome começa com o timestamp).

### 3.4 Configurar Storage
Crie o bucket **privado** chamado `landing` (usado pela imagem de compartilhamento
da landing page). As políticas já vêm nas migrações.

### 3.5 Variáveis de ambiente
Copie `.env.example` para `.env` e preencha:
```bash
cp .env.example .env
```
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_SUPABASE_PROJECT_ID=xxxx
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...      # somente no servidor, nunca no cliente
RESEND_API_KEY=re_...                         # opcional: envio de e-mails
```
As variáveis `VITE_*` são embutidas no build do cliente (podem ser públicas).
As demais são lidas **apenas dentro dos handlers** de servidor.

### 3.6 Rodar em desenvolvimento
```bash
npm run dev      # http://localhost:8080
```

### 3.7 Build de produção
```bash
npm run build
```
Saída em `.output/`. O alvo padrão é **Cloudflare Workers** (Nitro).

**Deploy em Node/VPS:** altere o preset do Nitro para `node-server` no `vite.config.ts`:
```ts
export default defineConfig({
  tanstackStart: { server: { entry: "server" } },
  nitro: { preset: "node-server" },
});
```
Depois:
```bash
npm run build
node .output/server/index.mjs      # sirva atrás de Nginx/Caddy na porta desejada
```
**Deploy em Cloudflare:** `npx wrangler deploy` a partir de `.output/`.
**Deploy em Vercel/Netlify:** presets `vercel` / `netlify` no Nitro.

---

## 4. Pós-instalação (obrigatório)

1. **Criar o administrador global**
   - Cadastre o usuário em Authentication → Users (e-mail + senha).
   - Insira o papel no banco:
     ```sql
     insert into public.user_roles (user_id, role)
     values ('<uuid-do-usuario>', 'admin');
     ```
2. **Criar o primeiro consultório** em `/admin` (slug, nome, cores, logo).
3. **Cadastrar médicos** na aba de profissionais do consultório.
4. **Conferir e-mails**: configure a chave do provedor de e-mail; sem ela o envio
   automático de resultados fica desativado (o restante funciona normalmente).
5. **Auth**: em Authentication → URL Configuration, defina Site URL e Redirect URLs
   com o domínio novo (senão os links de confirmação/recuperação quebram).

---

## 5. Mapa rápido da aplicação

| Rota | Uso |
|---|---|
| `/` | Landing + porta de entrada (paciente / profissional) |
| `/entrar` | Login rápido do paciente |
| `/primeiro-acesso` | Criação de conta do paciente |
| `/portal` | Portal do paciente (resultados) |
| `/{slug}` e `/{slug}/triagem` | Triagem white-label por consultório |
| `/auth` | Login da equipe clínica |
| `/painel` | Painel de triagens (mobile-first) |
| `/admin` | Gestão de consultórios e médicos (admin global) |
| `/comercial` | Planos, assinaturas e MRR (admin global) |
| `/auditoria`, `/emails`, `/roadmap`, `/changelog` | Operação e histórico |

---

## 6. Testes

```bash
npm test            # unitários (Vitest): scoring, árvore de triagem, escalas
npm run test:e2e    # Playwright (precisa da app rodando)
npm run lint
```

---

## 7. Checklist final antes de ir ao ar

- [ ] Migrações aplicadas sem erro
- [ ] Bucket `landing` criado
- [ ] `.env` preenchido (inclusive service role no servidor)
- [ ] Admin global criado e login funcionando
- [ ] Site URL / Redirect URLs atualizados no Auth
- [ ] `npm run build` concluído
- [ ] HTTPS ativo (dados de saúde — LGPD)
