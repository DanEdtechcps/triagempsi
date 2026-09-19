# 05. Variáveis de Ambiente e Infraestrutura Cloudflare — Saraiva Clínica de Psiquiatria

Este documento detalha o ecossistema de variáveis de ambiente, a política de proteção de segredos médicos e a infraestrutura de borda (Edge) na Cloudflare que suporta o TriagemPsi e a Saraiva Clínica de Psiquiatria.

---

## 1. Dicionário Completo de Variáveis de Ambiente

| Variável | Escopo | Visibilidade | Função | Exemplo Real |
|---|---|---|---|---|
| `VITE_SUPABASE_URL` | Cliente / Build | Pública | Endpoint HTTPS da API Supabase consumida pelo navegador. | `https://ffyjjkouscnabyxjxexu.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Cliente / Build | Pública | Chave anônima pública do Supabase usada pelo frontend. | `sb_publishable_3F04VCYRIoUVH0mXyZBOEg_EQsVTMaT` |
| `VITE_SUPABASE_PROJECT_ID` | Cliente / Build | Pública | Identificador do projeto Supabase. | `ffyjjkouscnabyxjxexu` |
| `SUPABASE_URL` | Servidor (SSR) | Pública / Servidor | URL da API Supabase usada pelo Nitro no Cloudflare Workers. | `https://ffyjjkouscnabyxjxexu.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Servidor (SSR) | Pública / Servidor | Chave anônima usada pelo middleware de autorização SSR. | `sb_publishable_3F04VCYRIoUVH0mXyZBOEg_EQsVTMaT` |
| `SUPABASE_PROJECT_ID` | Servidor (SSR) | Pública / Servidor | ID do projeto no servidor. | `ffyjjkouscnabyxjxexu` |
| `SUPABASE_SERVICE_ROLE_KEY` | Servidor (SSR) | **SECRETA (Privada)** | Chave mestra de admin do Supabase (ignora RLS para tarefas administrativas). **NUNCA no Git**. | `sb_secret_[DEFINIDA_VIA_WRANGLER_SECRET]` |
| `RESEND_API_KEY` | Servidor (SSR) | **SECRETA (Privada)** | Chave de envio transacional de e-mails via Resend. | `re_...` (opcional) |

---

## 2. Onde Cada Arquivo Reside e Por Quê

1. **[.env](file:///mnt/armazenamento/Projetos/triagem-medica/.env) (Local de Desenvolvimento):**
   * Contém todas as variáveis, incluindo as secretas (`SUPABASE_SERVICE_ROLE_KEY`).
   * Listado estritamente no [.gitignore](file:///mnt/armazenamento/Projetos/triagem-medica/.gitignore) para que senhas e credenciais nunca sejam enviadas ao GitHub.

2. **[.env.production](file:///mnt/armazenamento/Projetos/triagem-medica/.env.production) (Repositório / Build CI):**
   * Contém apenas as variáveis **PÚBLICAS** (`VITE_*` e `SUPABASE_URL`).
   * É lido automaticamente pelo Vite durante o comando `bun run build`, garantindo que o bundle do navegador (`assets/*.js`) contenha as URLs corretas embutidas.

3. **[wrangler.json](file:///mnt/armazenamento/Projetos/triagem-medica/wrangler.json) (Configuração Cloudflare Workers):**
   * Define o Worker oficial (`triagempsi`), compatibilidade `nodejs_compat` e as variáveis públicas.
   * Não inclui a `SUPABASE_SERVICE_ROLE_KEY` em texto aberto, respeitando o GitHub Push Protection.

4. **Painel da Cloudflare (Workers Dashboard):**
   * A chave mestra `SUPABASE_SERVICE_ROLE_KEY` é cadastrada de forma criptografada em:  
     **Workers & Pages ➔ triagempsi ➔ Settings ➔ Variables and Secrets ➔ Add Variable (Type: Secret / Encrypted)**.

---

## 3. Resiliência do Bundle do Cliente (Triplo Fallback)

Para evitar que qualquer falha de injeção em CI derrube o frontend com a tela de erro `"This page didn't load"`, o código em [client.ts](file:///mnt/armazenamento/Projetos/triagem-medica/src/integrations/supabase/client.ts) implementa um mecanismo de **triplo fallback**:

```ts
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://ffyjjkouscnabyxjxexu.supabase.co";
```

Mesmo que o bundler não consiga ler variáveis de ambiente em tempo de compilação, o código JavaScript em execução no navegador já possui o endpoint de produção como garantia inquebrável de funcionamento.

---

## 4. Endpoints e Slugs em Produção

* **Domínio Oficial de Produção:** `https://triagempsi.pontocomumtus.workers.dev`
* **Slug Oficial da Clínica do Dr. Saraiva:** `/saraiva` (ex: `https://triagempsi.pontocomumtus.workers.dev/saraiva/triagem`)
* **Slug de Compatibilidade:** `/padrao` (ex: `https://triagempsi.pontocomumtus.workers.dev/padrao/triagem`)
