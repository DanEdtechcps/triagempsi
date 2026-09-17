# 01. Arquitetura e Visão Geral

## 1. Visão do Produto
O **TriagemPsi** é uma plataforma SaaS White-Label e Multi-Tenant voltada para pré-triagem psiquiátrica de alto padrão.
O objetivo clínico e operacional da solução é:
1. **Eliminar o início do zero na primeira consulta:** O paciente responde antecipadamente a um questionário adaptativo (baseado em 28 escalas psiquiátricas internacionais validadas).
2. **Entregar o caso mastigado ao psiquiatra:** O painel clínico consolida sintomas, gravidade, cálculo de risco, timeline longitudinal e gera relatórios em PDF com apenas um clique.
3. **Multi-Clínica White-Label:** Cada consultório possui seu próprio subdomínio ou slug (`/{slug}` e `/{slug}/triagem`), com logotipo, cores personalizadas (Primary/Accent) e lista de médicos.
4. **Conformidade Estrita com a LGPD:** Termo de consentimento explícito pré-questionário, separação de papéis via RLS e armazenamento criptografado.

---

## 2. Stack Tecnológica Oficial

| Camada | Tecnologia | Versão | Função |
|---|---|---|---|
| **Runtime & Pacotes** | Bun / Node.js | Bun 1.4+ / Node 22+ | Gerenciamento de dependências e scripts ultra rápidos. |
| **Framework Web** | TanStack Start | v1.168+ | Framework fullstack React com SSR nativo e Server Functions. |
| **Frontend UI** | React | 19.2+ | Biblioteca de renderização reativa moderna. |
| **Roteamento** | TanStack Router | v1.170+ | Roteamento 100% tipado (Type-Safe Routing). |
| **Estilização** | Tailwind CSS v4 | v4.2+ | CSS moderno utilitário com suporte a CSS Variables e temas dinâmicos. |
| **Componentes Base** | Radix UI + Lucide | Latest | Primitives acessíveis (Dialog, Popover, Select, Accordion). |
| **SSR Engine** | Nitro | 3.0-beta | Engine de servidor que compila para Cloudflare Workers, Node ou Vercel. |
| **Banco de Dados** | PostgreSQL (Supabase) | PG 15+ | Banco relacional com Row Level Security (RLS) e extensões (`pg_cron`). |
| **Autenticação** | Supabase Auth | v2 | Gerenciamento de sessões, JWTs, recuperação de senha e RBAC. |
| **Armazenamento** | Supabase Storage | v2 | Armazenamento seguro de imagens de consultórios e miniatura de compartilhamento. |
| **Deploy / Hosting** | Cloudflare Workers | Latest | Execução serverless na borda (Edge) com latência < 20ms no Brasil. |

---

## 3. Topologia e Fluxo de Execução

```
[ Paciente / Médico ]
        │  HTTPS (TLS 1.3)
        ▼
[ Cloudflare Edge (Workers) ]
   ├── Assets Estáticos (.output/public: JS, CSS, Imagens)
   └── Server Functions Nitro (.output/server/index.mjs)
        │
        ├── Client Component: Renders in React 19 + TanStack Router
        └── Server Functions (src/lib/*.functions.ts)
                 │  Bearer JWT + apikey
                 ▼
        [ Supabase Cloud (PostgreSQL + Auth + Storage) ]
           ├── Row Level Security (RLS) policies
           ├── auth.users (Autenticação)
           ├── public.user_roles (Controle de Acesso RBAC)
           └── public._keepalive (Prevenção de suspensão)
```

---

## 4. Estrutura de Diretórios do Projeto

```
triagem-medica/
├── .agents/skills/              # Skills locais instaladas (Supabase / Postgres)
├── .github/workflows/          # Automações CI/CD (Supabase Keepalive)
├── documentação viva/          # Esta documentação viva completa
├── e2e/                        # Testes end-to-end com Playwright
├── public/                     # Arquivos estáticos servidos na raiz (favicon, og-image)
├── scripts/                    # Scripts de automação interna (roadmap, changelog)
├── src/
│   ├── components/             # Componentes React reutilizáveis
│   │   ├── landing/            # Telas da Landing Page
│   │   ├── painel/             # Componentes do Painel Clínico
│   │   └── ui/                 # Primitives do Shadcn / Radix UI
│   ├── config/                 # Configurações de domínio, branding e árvores de decisão
│   │   ├── branding.ts         # Identidade visual padrão
│   │   └── triage-tree.ts      # Definição dos módulos de triagem e perguntas
│   ├── integrations/supabase/  # Clientes Supabase para Browser e Servidor
│   │   ├── client.ts           # Cliente singleton seguro para o Navegador
│   │   ├── client.server.ts    # Cliente com Service Role para Server Functions
│   │   ├── auth-middleware.ts  # Middleware de extração e validação de JWT Bearer
│   │   └── types.ts            # Tipos gerados do schema do banco
│   ├── lib/                    # Lógica de negócio, cálculos clínicos e server functions
│   │   ├── scoring.ts          # Algoritmos de cálculo das 28 escalas psiquiátricas
│   │   ├── pdf-report.ts       # Geração de prontuários em PDF via jsPDF
│   │   ├── painel.functions.ts # Server RPCs de listagem de triagens
│   │   └── admin.functions.ts  # Server RPCs de gestão de clínicas e acessos
│   ├── routes/                 # Páginas e rotas da aplicação (TanStack Router)
│   ├── router.tsx              # Instanciação do Router
│   └── server.ts               # Handler de entrada do SSR no Nitro
├── supabase/
│   ├── migrations/             # 21 arquivos originais de migração cronológica
│   ├── consolidated_schema.sql # Script SQL único consolidado para reprodução
│   └── keepalive.sql           # Script de ativação do cron interno anti-pausa
├── wrangler.json               # Configuração oficial de deploy no Cloudflare Workers
├── package.json                # Dependências e scripts de build
└── tsconfig.json               # Configurações do compilador TypeScript
```
