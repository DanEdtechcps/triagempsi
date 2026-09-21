# 01. Arquitetura e Visão Geral — TriagemPsi & Multi-Tenant Clínico

> **Saraiva Clínica de Psiquiatria** & **Instituto Lumina de Saúde Mental**  
> **Dr. José Ribamar Fernandes Saraiva Junior** | CRM-RS 29349 · RQE 30038 | Passo Fundo / RS  
> **Dra. Camila Rocha** | CRM-SP 189420 · RQE 92314 | São Paulo / SP  
> **Superadministrador da Plataforma:** Daniel Arraes Reino (`coletivoaruatemvoz@gmail.com`)  
> *Versão de Arquitetura: v1.30.0 (Atualizada em Setembro de 2026)*

---

## 1. Visão do Produto e Posicionamento Institucional

O **TriagemPsi** é uma plataforma médica de alta precisão para acolhimento inicial, pré-triagem adaptativa psicométrica, apoio à decisão diagnóstica (*Clinical Decision Support*) e prescrição de psicoeducação baseada em evidências.

Originalmente projetado para a **Saraiva Clínica de Psiquiatria** (Passo Fundo/RS), o ecossistema evoluiu na versão **v1.30.0** para uma **arquitetura multi-tenant federada**, viabilizando consultórios isolados, com marcas próprias, regras de privacidade invioláveis e um superpainel de governança.

### Princípios Norteadores:
1. **Eliminar o Início do Zero na Primeira Consulta:** O paciente responde antecipadamente a uma jornada adaptativa psicométrica orientada por Teoria de Resposta ao Item (TRI/CAT) e grafos de decisão reativos (DAG).
2. **Entregar o Caso Estruturado ao Psiquiatra (Decision Support):** O painel clínico do médico consolida queixas, escores, cálculo de risco, diagnóstico diferencial, detecção de hesitação focal (Dwell-Time) e condutas orientativas personalizadas (ex: TCC-I no sono, cautela estrita com antidepressivos no espectro bipolar, modelo FRAMES em substâncias, profilaxia em TEPT).
3. **Psicoeducação e Plano de Segurança Estruturado:** Devolutiva acolhedora imediata ao paciente, com 10 trilhas clínicas validadas, técnicas de aterramento, higiene do sono, descompressão e canais de emergência 24h gratuitos (**CVV 188** / **SAMU 192**).
4. **Isolamento Multi-Tenant Estrito (Zero Leakage):** Segregação total de dados entre clínicas no PostgreSQL (RLS), com guardas de contexto congeladas (`TenantContext`), switcher dinâmico no painel para Super Admin e restrição médica inviolável.
5. **Conformidade Estrita com a LGPD e Ética Médica (CFM / ABP):** Consentimento explícito prévio, proteção de dados sob sigilo médico ético, separação categórica entre rastreio psicométrico e diagnóstico conclusivo (nunca emitir CID no PDF do paciente).

---

## 2. Topologia Multi-Tenant da Plataforma

A plataforma opera com governança baseada em papéis federados (`user_roles`), garantindo que nenhum médico acesse dados de outro consultório, enquanto a administração técnica global supervisiona o sistema:

```
                          ┌────────────────────────────────────────────────────────┐
                          │     SUPERADMINISTRADOR GLOBAL DA PLATAFORMA            │
                          │        coletivoaruatemvoz@gmail.com (clinic_id: null)  │
                          │   Acesso Irrestrito · TenantSwitcher · Auditoria Total │
                          └──────────────────────────┬─────────────────────────────┘
                                                     │
                         ┌───────────────────────────┴────────────────────────────┐
                         │                                                        │
                         ▼                                                        ▼
       ┌──────────────────────────────────────┐                ┌──────────────────────────────────────┐
       │   SARAIVA CLÍNICA DE PSIQUIATRIA     │                │   INSTITUTO LUMINA SAÚDE MENTAL      │
       │   ID: 0da5f2ec-c592-429a-af9c-       │                │   ID: c0000000-0000-4000-8000-       │
       │       e4c7eb4e952b                   │                │       000000000002                   │
       │   Slug: /saraiva                     │                │   Slug: /lumina                      │
       │   Médico: Dr. José R. F. Saraiva Jr  │                │   Admin: Dr. Gustavo Mello            │
       │                                       │                │   Doctor: Dra. Camila Nogueira        │
       │                                       │                │   Email: dr.gustavo@lumina.med.br    │
       │   Cor: #1e4d5c / #3d8b8b             │                │   Cor: #4c1d95 / #8b5cf6              │
       └──────────────────────────────────────┘                └──────────────────────────────────────┘
```

> Nota 2026-09-21: esta seção continha antes a slug `/padrao` como alias de `/saraiva` (era na
> verdade uma clínica DUPLICADA com id próprio, não um alias de verdade — foi mesclada e
> apagada) e uma identidade diferente pra Lumina (`Dra. Camila Rocha`, id `b1a1a1a1-...`, slug
> já correto em `/lumina` mas o banco real usava `lumina-saude` até então). Corrigido pra
> refletir o que está de fato em produção.

### Regras do Multi-Tenant:
- **`coletivoaruatemvoz@gmail.com`**: Único usuário com `role: 'admin'` e `clinic_id: null`. Possui o componente `TenantSwitcher` ativo na barra de navegação superior do painel clínico, permitindo filtrar triagens por clínica ou inspecionar a base global consolidada.
- **`joserfsaraivajr@gmail.com`**: Usuário associado estritamente à Saraiva Clínica (`clinic_id: '0da5f2ec-c592-429a-af9c-e4c7eb4e952b'`). O RLS e o middleware bloqueiam qualquer tentativa de ler ou alterar triagens de terceiros.
- **`dr.gustavo@lumina.med.br`** (admin) e **`dra.camila@lumina.med.br`** (doctor): associados estritamente ao Instituto Lumina (`clinic_id: 'c0000000-0000-4000-8000-000000000002'`).

---

## 3. Stack Tecnológica Oficial

| Camada | Tecnologia | Versão | Função na Arquitetura |
|---|---|---|---|
| **Runtime & Pacotes** | Bun / Node.js | Bun 1.4+ / Node 22+ | Gerenciamento de dependências, scripts de validação e testes em milissegundos. |
| **Framework Web Fullstack** | TanStack Start | v1.168+ | SSR nativo, Server Functions tipadas e orquestração de rotas. |
| **Frontend UI Engine** | React | 19.2+ | Renderização concorrente, hooks modernos e reatividade pura. |
| **Roteamento Tipado** | TanStack Router | v1.170+ | Roteamento 100% type-safe com code splitting automático. |
| **Design System & Estilos** | Tailwind CSS v4 + Radix UI | v4.2+ | Design tokens semânticos, acessibilidade WCAG 2.1 AA e paletas multi-marca. |
| **Motor Clínico Isolado** | TypeScript Puro | ES2022+ | Schemas JSON, CAT/TRI, Grafo DAG, Dwell-Time e isolamento total de UI. |
| **SSR & Edge Compiler** | Nitro Engine | v3.0-beta | Compilação em bundle único otimizado para o Cloudflare Workers. |
| **Hospedagem de Borda** | Cloudflare Workers | Latest | Execução serverless global com latência < 25ms em território brasileiro. |
| **Banco de Dados & Auth** | Supabase (PostgreSQL 15) | Latest | RLS granular por tenant, sessões JWT, enum roles e pgcrypto. |
| **Storage de Mídia** | Supabase Storage | Latest | Bucket `landing` para logos institucionais e identidades visuais. |
| **Motor de Testes** | Vitest | v3.0+ | Suíte automatizada com 208 testes (17 suítes) cobrindo regras clínicas, segurança e infra. |

---

## 4. O Motor Clínico Isolado (`src/lib/clinical-engine/`)

Implementado como uma camada desacoplada de alto desempenho, o motor clínico reside em [`src/lib/clinical-engine/`](file:///mnt/armazenamento/Projetos/triagem-medica/src/lib/clinical-engine/) e é composto por 6 pilares:

```
src/lib/clinical-engine/
├── schemas/                     # 15 Schemas declarativos em JSON padronizados
│   ├── epds.json                # Depressão perinatal (com trava biológica masculina)
│   ├── phq2.json & phq9.json    # Depressão maior e screener ultrarrápido
│   ├── c-ssrs.json              # Columbia Suicide Severity Rating Scale
│   ├── snap-iv.json & asrs-18.json # TDAH infantil e adulto
│   ├── ad8.json & gds15.json    # Rastreio cognitivo e depressão geriátrica
│   ├── y-bocs.json & pcl-5.json # TOC e Estresse Pós-Traumático
│   ├── isi.json & mbi-hss.json  # Insônia e Esgotamento Profissional / Burnout
│   ├── audit.json & assist.json # Álcool e Substâncias (OMS)
│   └── srq20.json               # Self-Reporting Questionnaire (Atenção Básica)
├── schema-evaluator.ts          # Avaliador puro de elegibilidade e pontuação psicométrica
├── reactive-dag.ts              # Grafo acíclico dirigido (DAG) com prevenção de ciclos por DFS
├── reactions.ts                 # Catálogo de regras de reação cruzada e desdobramentos
├── cat-estimator.ts             # Motor de Teste Adaptativo Computadorizado (TRI / GRM de Samejima)
├── dwell-time.ts                # Telemetria de tempo de resposta, média vs. mediana e hesitação focal
├── tenant-context.ts            # Contexto imutável congelado com validação estrita anti-leakage
├── shadow-runner.ts             # Comparador paralelo para migração segura (legado vs. novo motor)
├── flags.ts                     # Feature flags dinâmicas para ativação gradual de CAT e Dwell-Time
└── index.ts                     # Ponto de exportação unificado do motor clínico
```

---

## 5. Estrutura de Diretórios Atualizada

```
triagem-medica/
├── .agents/skills/              # Skills locais de governança (Supabase, UI Quality)
├── .github/workflows/          # Automações CI/CD e keepalive do banco
├── documentação viva/          # Repositório vivo central de documentação e runbooks
├── public/                     # Assets estáticos servidos na raiz do site
├── scripts/                    # Scripts de build, validação e diagnóstico
├── src/
│   ├── components/
│   │   ├── landing/            # Landing Page institucional luxury
│   │   ├── painel/             # Painel Clínico, TenantSwitcher, TelemetryCard, PsychoeducationTracker
│   │   ├── portal/             # Portal do Paciente com biblioteca filtrável e plano de segurança
│   │   ├── triage/             # Fluxo da pré-avaliação adaptativa e componentes de crise
│   │   └── ui/                 # Primitives do Shadcn / Radix UI acessíveis
│   ├── config/                 # Configurações de branding e árvore de triagem
│   ├── context/
│   │   └── TenantContext.tsx   # Provedor React de tenant ativo para Super Admin
│   ├── integrations/supabase/  # Clientes Supabase com triplo fallback resiliente
│   ├── lib/
│   │   ├── clinical-engine/    # Motor Clínico Isolado v1.30 (CAT/TRI, DAG, Schemas, Dwell-Time)
│   │   ├── scoring.ts          # Motor de pontuação das 28 escalas clínicas
│   │   ├── safety-plan.ts      # Plano de Segurança Estruturado (CVV 188 / SAMU 192)
│   │   ├── clinical-decision-support.ts # Regras de apoio à decisão diagnóstica do psiquiatra
│   │   ├── psychoeducation-data.ts      # 10 tópicos clínicos oficiais estruturados
│   │   ├── psychoeducation.functions.ts # Server Functions RPC de engajamento e visualização
│   │   └── pdf-report.ts       # Gerador dos relatórios em PDF (Paciente e Médico)
│   ├── routes/                 # Rotas tipadas do TanStack Router
│   │   ├── _authenticated/     # Painel, /materiais, /painel/$id, /admin, /auditoria
│   │   └── ...                 # Rotas públicas (/saraiva, /lumina, /auth, /portal)
│   ├── router.tsx              # Instanciação central do roteador
│   └── server.ts               # Entrypoint SSR compilado pelo Nitro
├── supabase/
│   ├── migrations/             # Migrações SQL versionadas
│   ├── consolidated_schema.sql # Schema consolidado reproduzível
│   └── keepalive.sql           # Query periódica de heartbeat anti-pausa
├── wrangler.json               # Configuração do Cloudflare Workers
├── package.json                # Scripts e pacotes gerenciados via Bun
└── tsconfig.json               # Configuração estrita do TypeScript
```

---

## 6. Garantia de Qualidade e Portões de Aceite (Quality Gates)

O código no repositório `origin/main` obedece rigorosamente a três critérios inegociáveis antes de qualquer deploy ou publicação:
1. **Verificação de Tipos TypeScript:** `bun x tsc --noEmit` deve retornar **0 erros**.
2. **Suíte Completa de Testes:** `bun run test` deve executar e aprovar **208 testes em 17 arquivos** (incluindo testes de cabeçalhos de borda, CSP, HSTS e expurgo de PII).
3. **Build de Produção:** `bun run build` deve compilar sem avisos críticos em menos de 2 segundos.
