# 05. Variáveis de Ambiente e Infraestrutura Cloudflare

Este documento detalha o ecossistema de variáveis de ambiente, a política de proteção de segredos e a infraestrutura de borda (Edge) na Cloudflare.

---

## 1. Dicionário Completo de Variáveis de Ambiente

| Variável | Escopo | Visibilidade | Função | Exemplo Real |
|---|---|---|---|---|
| `VITE_SUPABASE_URL` | Cliente / Build | Pública | URL do endpoint da API Supabase usada pelo navegador. | `https://ffyjjkouscnabyxjxexu.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Cliente / Build | Pública | Chave anônima pública do Supabase usada pelo navegador. | `sb_publishable_3F04VCYRIoUVH0mXyZBOEg_EQsVTMaT` |
| `VITE_SUPABASE_PROJECT_ID` | Cliente / Build | Pública | Identificador alfanumérico do projeto Supabase. | `ffyjjkouscnabyxjxexu` |
| `SUPABASE_URL` | Servidor (SSR) | Pública / Servidor | URL da API Supabase usada pelas Server Functions do Nitro. | `https://ffyjjkouscnabyxjxexu.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Servidor (SSR) | Pública / Servidor | Chave anônima usada pelo middleware de autorização do servidor. | `sb_publishable_3F04VCYRIoUVH0mXyZBOEg_EQsVTMaT` |
| `SUPABASE_PROJECT_ID` | Servidor (SSR) | Pública / Servidor | ID do projeto no servidor. | `ffyjjkouscnabyxjxexu` |
| `SUPABASE_SERVICE_ROLE_KEY` | Servidor (SSR) | **SECRETA (Privada)** | Chave mestra de admin do Supabase (ignora RLS). **NUNCA no Git**. | `sb_secret_[DEFINIDA_VIA_WRANGLER_SECRET]` |
| `RESEND_API_KEY` | Servidor (SSR) | **SECRETA (Privada)** | Chave de envio transacional de e-mails via Resend. | `re_...` (opcional) |

---

## 2. Onde Cada Arquivo Reside e Por Quê

1. **[.env](file:///mnt/armazenamento/Projetos/triagem-medica/.env) (Local):**
   * Contém todas as variáveis, incluindo as secretas (`SUPABASE_SERVICE_ROLE_KEY`).
   * Está estritamente listado no [.gitignore](file:///mnt/armazenamento/Projetos/triagem-medica/.gitignore) para que senhas e credenciais nunca sejam enviadas ao GitHub.

2. **[.env.production](file:///mnt/armazenamento/Projetos/triagem-medica/.env.production) (Repositório / Build CI):**
   * Contém apenas as variáveis **PÚBLICAS** (`VITE_*` e `SUPABASE_URL`).
   * É lido automaticamente pelo Vite durante a execução do comando `bun run build` nos servidores da Cloudflare, garantindo que o bundle do navegador (`assets/*.js`) contenha as URLs corretas embutidas.

3. **[wrangler.json](file:///mnt/armazenamento/Projetos/triagem-medica/wrangler.json) (Configuração Cloudflare):**
   * Define o nome oficial do Worker (`triagempsi`), modo `nodejs_compat` e as variáveis públicas da plataforma.
   * Não inclui a `SUPABASE_SERVICE_ROLE_KEY` em texto aberto, respeitando o GitHub Push Protection.

4. **Painel da Cloudflare (Workers Dashboard):**
   * A chave mestra `SUPABASE_SERVICE_ROLE_KEY` deve ser adicionada em:
     **Workers & Pages ➔ triagempsi ➔ Settings ➔ Variables and Secrets ➔ Add Variable (Type: Secret / Encrypted)**.

---

## 3. Resiliência do Bundle do Cliente (Aprendizado Crítico)

Para evitar que qualquer falha de injeção em CI derrube o frontend do usuário final com a tela `"This page didn't load"`, o código em [client.ts](file:///mnt/armazenamento/Projetos/triagem-medica/src/integrations/supabase/client.ts) implementa um mecanismo de **triplo fallback**:

```ts
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://ffyjjkouscnabyxjxexu.supabase.co";
```

Mesmo que o bundler não consiga ler variáveis de ambiente em tempo de compilação, o código JavaScript em execução no navegador já possui o endpoint de produção como garantia de funcionamento.
