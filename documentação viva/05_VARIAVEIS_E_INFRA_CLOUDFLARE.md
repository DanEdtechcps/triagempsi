# 05. Variáveis de Ambiente, Segurança de Borda e Infraestrutura Cloudflare

> **Worker de Produção:** `triagempsi` (Cloudflare Workers via Nitro)  
> **URL Ativa:** `https://triagempsi.pontocomumtus.workers.dev`  
> **Versão da Arquitetura:** v1.31.0 (Com Hardening de Borda e Sanitização PII)

---

## 1. Dicionário Completo de Variáveis de Ambiente

| Variável | Escopo | Tipo | Visibilidade | Função no Sistema | Exemplo Real |
|---|---|---|---|---|---|
| `VITE_SUPABASE_URL` | Frontend / Client | String | Pública | URL HTTPS da API Supabase usada pelo navegador. | `https://ffyjjkouscnabyxjxexu.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend / Client | String | Pública | Chave anônima pública (anon key) para autenticação do cliente. | `sb_publishable_3F04VCYRIoUVH0mXyZBOEg_EQsVTMaT` |
| `VITE_SUPABASE_PROJECT_ID` | Frontend / Client | String | Pública | Identificador do projeto Supabase. | `ffyjjkouscnabyxjxexu` |
| `SUPABASE_URL` | Servidor (Nitro SSR) | String | Pública / Servidor | Endpoint do Supabase consumido pelas Server Functions no Worker. | `https://ffyjjkouscnabyxjxexu.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Servidor (Nitro SSR) | String | Pública / Servidor | Chave anônima usada pelo middleware de autorização SSR. | `sb_publishable_3F04VCYRIoUVH0mXyZBOEg_EQsVTMaT` |
| `SUPABASE_PROJECT_ID` | Servidor (Nitro SSR) | String | Pública / Servidor | ID do projeto no servidor. | `ffyjjkouscnabyxjxexu` |
| `SUPABASE_SERVICE_ROLE_KEY` | Servidor (Nitro SSR) | String | **SECRETA CRÍTICA** | Chave mestra de administração (ignora RLS para tarefas administrativas). **NUNCA no Git ou no wrangler.json `vars`**. | Armazenada exclusivamente via `wrangler secret put` |
| `RESEND_API_KEY` | Servidor (Nitro SSR) | String | Opcional / Secreta | Chave para disparos de e-mails transacionais. | `re_...` |

---

## 2. Onde Cada Configuração Reside e Regras de Ouro

### 2.1 [.env](file:///mnt/armazenamento/Projetos/triagem-medica/.env) (Desenvolvimento Local)
* Contém todas as variáveis, incluindo a `SUPABASE_SERVICE_ROLE_KEY`.
* Está listado estritamente no `.gitignore`. **Nunca deve ser comitado**.

### 2.2 [.env.production](file:///mnt/armazenamento/Projetos/triagem-medica/.env.production) (Repositório / Build CI)
* Contém **exclusivamente** as variáveis públicas (`VITE_*` e `SUPABASE_URL`).
* É lido automaticamente pelo compilador Vite durante o `bun run build`.

### 2.3 [wrangler.json](file:///mnt/armazenamento/Projetos/triagem-medica/wrangler.json) (Configuração Cloudflare)
* Declara o nome do Worker (`triagempsi`), modo de compatibilidade (`nodejs_compat`), entrypoint (`.output/server/index.mjs`) e as variáveis públicas sob a chave `vars`:
  ```json
  {
    "name": "triagempsi",
    "main": ".output/server/index.mjs",
    "compatibility_date": "2026-09-14",
    "compatibility_flags": ["nodejs_compat"],
    "assets": {
      "binding": "ASSETS",
      "directory": ".output/public"
    },
    "vars": {
      "SUPABASE_URL": "https://ffyjjkouscnabyxjxexu.supabase.co",
      "SUPABASE_PUBLISHABLE_KEY": "sb_publishable_3F04VCYRIoUVH0mXyZBOEg_EQsVTMaT",
      "SUPABASE_PROJECT_ID": "ffyjjkouscnabyxjxexu"
    }
  }
  ```

> [!CAUTION]
> **REGRA CRÍTICA ANTI-CONFLITO DE SEGREDOS:**  
> **NUNCA** adicione `"SUPABASE_SERVICE_ROLE_KEY"` dentro do objeto `vars` do `wrangler.json`.  
> A Service Role Key já está registrada no Cloudflare Workers como uma **Secret criptografada**. Se você adicioná-la a `vars`, o comando `wrangler deploy` entrará em conflito fatal ou exigirá confirmação interativa, quebrando deploys autônomos e violando o GitHub Push Protection.

### 2.4 Como Injetar a Secret com o Wrangler:
```bash
bun x wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Quando solicitado pelo terminal, cole a chave com segurança.
```

---

## 3. Resiliência de Conexão: Triplo Fallback

Para assegurar que nenhuma falha de injeção de variáveis de ambiente resulte em tela em branco ou erro 500 no navegador, o cliente em [`src/integrations/supabase/client.ts`](file:///mnt/armazenamento/Projetos/triagem-medica/src/integrations/supabase/client.ts) implementa um **triplo fallback**:

```ts
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://ffyjjkouscnabyxjxexu.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_3F04VCYRIoUVH0mXyZBOEg_EQsVTMaT";
```

---

## 4. Segurança de Borda (Edge Headers & Cloudflare Hardening)

A partir da versão **v1.31.0**, a aplicação implementa proteção de borda em duas camadas complementares:

### 4.1 Cabeçalhos Estáticos na Borda ([`public/_headers`](file:///mnt/armazenamento/Projetos/triagem-medica/public/_headers))
Arquivo copiado para a raiz pública do Cloudflare, instruindo os nós de borda (Edge nodes) a emitir cabeçalhos de segurança em todos os assets e rotas estáticas:
* **`X-Frame-Options: SAMEORIGIN`:** Impede que páginas clínicas ou formulários de triagem sejam embutidos em `<iframe>` em sites externos, eliminando vetores de **Clickjacking**.
* **`X-Content-Type-Options: nosniff`:** Previne que navegadores realizem inferência arbitrária de tipos MIME.
* **`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` (HSTS):** Força conexões HTTPS perpétuas.
* **`Referrer-Policy: strict-origin-when-cross-origin`:** Evita que URLs completas com parâmetros vazem para links externos.
* **`Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`:** Desativa recursos invasivos do navegador.
* **`Content-Security-Policy` (CSP):** Restringe origens de scripts, conexões de WebSocket (`wss://`) com o Supabase e frame-ancestors `'self'`.

### 4.2 Injeção Dinâmica em SSR ([`src/server.ts`](file:///mnt/armazenamento/Projetos/triagem-medica/src/server.ts))
Todas as respostas dinâmicas processadas pelo Nitro passam pela função `applyEdgeSecurityHeaders()`, garantindo que rotas dinâmicas, respostas 500 e endpoints de erro também saiam da borda protegidos com 100% dos headers.

---

## 5. Higienização de Logs e Expurgo de PII / Dados Clínicos (LGPD)

Em [`src/lib/error-capture.ts`](file:///mnt/armazenamento/Projetos/triagem-medica/src/lib/error-capture.ts), todo output de erro enviado ao `console.error` passa por um sanitizador regex que expurga:
- **E-mails:** Substituídos por `[EMAIL_REDACTED]`.
- **Telefones/WhatsApp:** Substituídos por `[PHONE_REDACTED]`.
- **CPFs:** Substituídos por `[CPF_REDACTED]`.
- **Tokens Bearer JWT:** Substituídos por `Bearer [JWT_REDACTED]`.
- **Chaves Secretas:** Substituídas por `[SUPABASE_SECRET_REDACTED]`.

Isso impede que logs do Cloudflare Workers (Tail Logs / Logpush) contenham dados protegidos pelo sigilo médico ético e pela LGPD.

---

## 6. Endpoints de Produção Ativos

* **Ambiente Principal:** `https://triagempsi.pontocomumtus.workers.dev`
* **Triagem Saraiva Clínica:** `/saraiva/triagem` (alias: `/padrao/triagem`)
* **Triagem Instituto Lumina:** `/lumina/triagem`
* **Portal do Paciente:** `/portal`
* **Painel Clínico:** `/painel`
* **Cockpit de Psicoeducação:** `/materiais`
* **Acesso / Autenticação:** `/auth`
