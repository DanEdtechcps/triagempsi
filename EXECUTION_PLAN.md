# Plano de Execução Autônomo: Do Local à Produção Online (Triagem Médica)

Este documento define o pipeline contínuo e encadeado para colocar a aplicação em pleno funcionamento local e posteriormente online em produção.

---

## Trilha de Execução Encadeada

### Fase 1: Ambiente Local & Dependências (Concluída ✅)
- [x] 1.1 Executar `bun install` e garantir integridade dos pacotes (487 pacotes instalados).
- [x] 1.2 Rodar verificação de tipagem (`tsc --noEmit` - 0 erros) e testes unitários (`vitest` - 82/82 passaram).
- [x] 1.3 Testar compilação (`bun run build` - Build Nitro Cloudflare gerado com sucesso em `.output/`).

### Fase 2: Banco de Dados & Backend (Supabase)
- [x] 2.1 Projeto Supabase conectado (`ffyjjkouscnabyxjxexu.supabase.co`).
- [x] 2.2 Gerado arquivo SQL consolidado com as 21 migrações (`supabase/consolidated_schema.sql`).
- [x] 2.3 Executar o script SQL no SQL Editor do Supabase Web (Tabelas, RLS e Seeds aplicados com sucesso!).
- [x] 2.4 Criado e configurado o bucket de storage privado `landing` via API REST.
- [ ] 2.5 Cadastrar o usuário administrador inicial e associar a role `admin` em `public.user_roles`.
- [x] 2.6 Gerado e validado o arquivo `.env` com todas as chaves (Publishable e Service Role).

### Fase 3: Validação do Servidor Local
- [ ] 3.1 Subir o servidor de desenvolvimento (`bun run dev`).
- [ ] 3.2 Testar rotas principais:
  - `/` (Landing)
  - `/auth` e `/entrar` (Autenticação)
  - `/admin` (Painel Administrativo)
  - `/{slug}/triagem` (Fluxo de Triagem)
- [ ] 3.3 Validar integridade do SSR com TanStack Start + Nitro.

### Fase 4: Preparação para Produção Online
- [ ] 4.1 Definir o target de deploy (Cloudflare Workers via Nitro, Vercel ou VPS Docker/Node).
- [ ] 4.2 Ajustar configurações de build e variáveis de ambiente de produção.
- [ ] 4.3 Configurar URLs de redirecionamento no Supabase Auth (Site URL + Redirect URLs).
- [ ] 4.4 Configurar chaves transacionais de e-mail (Resend).

### Fase 5: Deploy & Go-Live
- [ ] 5.1 Executar o deploy para o ambiente de produção.
- [ ] 5.2 Teste de fumaça (Smoke Test) no domínio online com HTTPS.
- [ ] 5.3 Validação de conformidade LGPD / integridade de ponta a ponta.
