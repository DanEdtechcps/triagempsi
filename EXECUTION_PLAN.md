# Plano de Execução Autônomo: Do Local à Produção Online (Triagem Médica)

Este documento define o pipeline contínuo e encadeado para colocar a aplicação em pleno funcionamento local e posteriormente online em produção.

---

## Trilha de Execução Encadeada

### Fase 1: Ambiente Local & Dependências (Concluída ✅)
- [x] 1.1 Executar `bun install` e garantir integridade dos pacotes (487 pacotes instalados).
- [x] 1.2 Rodar verificação de tipagem (`tsc --noEmit` - 0 erros) e testes unitários (`vitest` - 82/82 passaram).
- [x] 1.3 Testar compilação (`bun run build` - Build Nitro Cloudflare gerado com sucesso em `.output/`).

### Fase 2: Banco de Dados & Backend (Concluída ✅)
- [x] 2.1 Projeto Supabase conectado (`ffyjjkouscnabyxjxexu.supabase.co`).
- [x] 2.2 Gerado arquivo SQL consolidado com as 21 migrações (`supabase/consolidated_schema.sql`).
- [x] 2.3 Executar o script SQL no SQL Editor do Supabase Web (Tabelas, RLS e Seeds aplicados com sucesso!).
- [x] 2.4 Criado e configurado o bucket de storage privado `landing` via API REST.
- [x] 2.5 Gerado script de keepalive interno (`supabase/keepalive.sql`) e workflow de ping anti-suspensão (`.github/workflows/supabase-keepalive.yml`).
- [x] 2.6 Gerado e validado o arquivo `.env` com todas as chaves (Publishable e Service Role).

### Fase 3: Validação do Servidor Local & Repositório (Concluída ✅)
- [x] 3.1 Subir o servidor de desenvolvimento (`bun run dev`) em `http://localhost:8080`.
- [x] 3.2 Testar rotas principais com HTTP 200 OK:
  - `/` (Landing - 200 OK)
  - `/entrar` e `/primeiro-acesso` (200 OK)
  - `/auth` (Login Clínico - 200 OK)
  - `/painel` (Painel Clínico - 200 OK)
  - `/admin` (Painel Administrativo - 200 OK)
  - `/comercial` (Planos e Assinaturas - 200 OK)
  - `/padrao/triagem` (Fluxo de Triagem do Paciente - 200 OK)
- [x] 3.3 Inicializado repositório Git com `.gitignore` blindado contra vazamento do `.env`.
- [x] 3.4 Código sincronizado e commitado na branch `main` do GitHub oficial: `https://github.com/DanEdtechcps/triagempsi.git`.

### Fase 4: Preparação para Produção Online (Concluída ✅)
- [x] 4.1 Definir plataforma de hospedagem de produção (Cloudflare Workers via Nitro).
- [x] 4.2 Injetar as variáveis de ambiente do `.env` e configurar `wrangler.json`.
- [x] 4.3 Configurar URLs de redirecionamento no Supabase Auth para o domínio online.

### Fase 5: Deploy & Go-Live (Concluída ✅)
- [x] 5.1 Executar deploy contínuo integrado via Cloudflare Workers & GitHub (`triagempsi`).
- [x] 5.2 Smoke Test executado com sucesso em todas as rotas públicas e clínicas (todas retornando **HTTP 200 OK**).
- [x] 5.3 Aplicação 100% ONLINE e em PRODUÇÃO:
  - **URL de Produção:** `https://triagempsi.pontocomumtus.workers.dev`
  - **Fluxo de Triagem Online:** `https://triagempsi.pontocomumtus.workers.dev/padrao/triagem`
  - **Portal Clínico Online:** `https://triagempsi.pontocomumtus.workers.dev/painel`
