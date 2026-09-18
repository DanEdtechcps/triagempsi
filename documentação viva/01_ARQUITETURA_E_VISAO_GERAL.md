# 01. Arquitetura e Visão Geral — TriagemPsi & Saraiva Clínica de Psiquiatria

## 1. Visão do Produto e Posicionamento Institucional

O **TriagemPsi** foi estruturado e refinado para atender às demandas de excelência clínica da **Saraiva Clínica de Psiquiatria**, liderada pelo **Dr. José Ribamar Fernandes Saraiva Junior** (CRM-RS 29349 · RQE 30038), com consultório particular em Passo Fundo/RS.

O projeto combina a solidez diagnóstica da Psiquiatria Clínica com a sensibilidade de escuta da Medicina de Família, integrando abordagens de Terapia Cognitivo-Comportamental (TCC), Redução de Danos em Dependência Química e Envelhecimento Humano com dignidade.

### Princípios Norteadores:
1. **Eliminar o início do zero na primeira consulta:** O paciente responde antecipadamente a um questionário adaptativo inteligente baseado em 28 escalas psiquiátricas internacionais validadas.
2. **Entregar o caso estruturado ao psiquiatra (Decision Support):** O painel clínico do Dr. Saraiva consolida queixas, escores, cálculo de risco, diagnóstico diferencial e condutas orientativas personalizadas (ex: TCC-I no sono, cautela com antidepressivos no espectro bipolar, modelo FRAMES em substâncias).
3. **Psicoeducação e Plano de Segurança Estruturado:** Devolutiva acolhedora imediata ao paciente, com dicas práticas de autorregulação, canais de emergência 24h (CVV 188 / SAMU 192), técnicas de aterramento e segurança ambiental.
4. **Arquitetura Multi-Clínica White-Label:** Capacidade de operação multi-tenant onde cada consultório opera em seu próprio slug (`/saraiva`, `/padrao`), com paleta de cores (#1e4d5c / #3d8b8b), logo e corpo clínico isolado.
5. **Conformidade Estrita com a LGPD e Ética Médica:** Consentimento explícito prévio, proteção de dados sob sigilo médico ético, RLS (Row Level Security) nativo no PostgreSQL e criptografia de ponta a ponta.

---

## 2. Stack Tecnológica Oficial

| Camada | Tecnologia | Versão | Função |
|---|---|---|---|
| **Runtime & Pacotes** | Bun / Node.js | Bun 1.4+ / Node 22+ | Gerenciamento de dependências e scripts ultra rápidos. |
| **Framework Web** | TanStack Start | v1.168+ | Framework fullstack React com SSR nativo e Server Functions tipadas. |
| **Frontend UI** | React | 19.2+ | Biblioteca de renderização reativa moderna. |
| **Roteamento** | TanStack Router | v1.170+ | Roteamento 100% tipado (Type-Safe Routing). |
| **Estilização** | Tailwind CSS v4 | v4.2+ | CSS utilitário com variáveis semânticas e paleta do consultório. |
| **Componentes Base** | Radix UI + Lucide | Latest | Primitives acessíveis (Dialog, Popover, Select, Accordion). |
| **SSR Engine** | Nitro | 3.0-beta | Compilação otimizada para Cloudflare Workers. |
| **Banco de Dados** | PostgreSQL (Supabase) | PG 15+ | Banco relacional com RLS por tenant e extensões (`pgcrypto`). |
| **Autenticação** | Supabase Auth | v2 | Sessões JWT, papéis (`admin` global, `doctor`, `staff`), recuperação de senha. |
| **Armazenamento** | Supabase Storage | v2 | Bucket `landing` para logos e metadados visuais. |
| **Deploy / Hosting** | Cloudflare Workers | Latest | Execução serverless na borda com resposta < 20ms no Brasil. |

---

## 3. Topologia e Fluxo de Execução

```
[ Paciente / Dr. Saraiva / Equipe ]
        │  HTTPS (TLS 1.3 / HTTP/2 e HTTP/3)
        ▼
[ Cloudflare Edge (Workers) ]
   ├── Assets Estáticos (.output/public: JS, CSS, Imagens)
   └── Server Functions Nitro (.output/server/index.mjs)
        │
        ├── Client Components: React 19 + TanStack Router
        └── Server Functions (src/lib/*.functions.ts)
                 │  Bearer JWT + apikey (RLS Enforced)
                 ▼
        [ Supabase Cloud (PostgreSQL + Auth + Storage) ]
           ├── Row Level Security (RLS) policies
           ├── auth.users (Autenticação do Médico/Admin)
           ├── public.user_roles (Controle de Acesso RBAC unificado)
           ├── public.clinics (Identidade Saraiva Clínica de Psiquiatria)
           ├── public.psychoeducation_* (10 temas, conteúdos e engajamento)
           └── public._keepalive (Prevenção de suspensão automática)
```

---

## 4. Estrutura de Diretórios do Projeto

```
triagem-medica/
├── .agents/skills/              # Skills locais de governança
├── .github/workflows/          # Automações CI/CD
├── documentação viva/          # Documentação viva oficial e sincronizada
├── public/                     # Assets estáticos servidos na raiz
├── scripts/                    # Scripts de automação e validação de produção
├── src/
│   ├── components/             # Componentes React reutilizáveis
│   │   ├── landing/            # Landing Page Luxury
│   │   ├── painel/             # Painel Clínico, Psicoeducação e Decision Support
│   │   ├── portal/             # Portal do Paciente com biblioteca filtrável
│   │   ├── triage/             # Componentes de fluxo de triagem e cards de crise
│   │   └── ui/                 # Primitives do Shadcn / Radix UI
│   ├── config/                 # Configurações de domínio e branding
│   │   ├── branding.ts         # Identidade da Saraiva Clínica de Psiquiatria
│   │   └── triage-tree.ts      # Árvore de decisão adaptativa e questionários
│   ├── integrations/supabase/  # Clientes Supabase Browser e SSR
│   │   ├── client.ts           # Cliente singleton seguro com triplo fallback
│   │   ├── client.server.ts    # Cliente com Service Role para Server Functions
│   │   ├── auth-middleware.ts  # Validação de sessão e Bearer JWT
│   │   └── types.ts            # Tipos gerados do schema do banco
│   ├── lib/                    # Motores clínicos, cálculos e server functions
│   │   ├── scoring.ts          # Algoritmos de cálculo das 28 escalas psiquiátricas
│   │   ├── safety-plan.ts      # Plano de Segurança Estruturado (CVV 188 / SAMU 192)
│   │   ├── clinical-decision-support.ts # Apoio à decisão clínica do Dr. Saraiva
│   │   ├── psychoeducation.ts  # Motor de triggers e re-exports clínicos
│   │   ├── psychoeducation-data.ts # Os 10 temas oficiais (TCC, redução de danos)
│   │   ├── psychoeducation.functions.ts # Server RPCs de psicoeducação e visualizações
│   │   └── pdf-report.ts       # Geração dos relatórios em PDF (Paciente e Médico)
│   ├── routes/                 # Rotas da aplicação (TanStack Router)
│   ├── router.tsx              # Instanciação do Router
│   └── server.ts               # Handler de entrada do SSR no Nitro
├── supabase/
│   ├── migrations/             # Migrações SQL cronológicas
│   ├── consolidated_schema.sql # Script SQL único consolidado para reprodução
│   └── keepalive.sql           # Script de heartbeat anti-suspensão
├── wrangler.json               # Configuração de deploy no Cloudflare Workers
├── package.json                # Dependências e scripts de build
└── tsconfig.json               # Configuração do compilador TypeScript
```
