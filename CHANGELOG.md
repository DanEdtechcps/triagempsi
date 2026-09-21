# 📜 CHANGELOG — TriagemPsi

Todas as alterações notáveis, releases clínicas e evoluções de engenharia do ecossistema TriagemPsi estão documentadas neste arquivo.

O formato baseia-se no [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [v1.33.0] - 2026-09-21
### 🧹 Correção de Bugs Multi-Tenant, Hardening de Função Exposta & Sincronização de Documentação
- **Clínica duplicada (`padrao`) mesclada em `saraiva`:**
  - `clinics` tinha duas linhas para o mesmo consultório do Dr. Saraiva (`saraiva` e `padrao`, id diferente). A home e os botões de entrada usavam `padrao` como default, enquanto o login do Dr. Saraiva só enxergava `saraiva` — triagens vindas da home ficariam invisíveis pra ele.
  - Dados órfãos reatribuídos (0 linhas afetadas — nenhuma triagem real tinha sido perdida) e a linha `padrao` removida do banco. 5 referências de código trocadas para `saraiva`.
- **Slug da Lumina corrigido (`lumina-saude` → `lumina`):**
  - A rota pública `/lumina/triagem` dava 404 porque o slug real no banco era `lumina-saude`, não `lumina` como a documentação e os links institucionais sempre descreveram. Renomeado em produção; sincronizado [`branding.ts`](file:///mnt/armazenamento/Projetos/triagem-medica/src/config/branding.ts) e o teste dos 10 casos clínicos homologados.
- **Migrations de psicoeducação e RLS unificado, aplicadas em produção pela primeira vez:**
  - `20260917200000_unify_roles_and_rls.sql` (função `is_global_admin`, tabela `patient_longitudinal_records`) e `20260917230000_psychoeducation_module.sql` (4 tabelas de psicoeducação + 10 temas semeados) existiam no repo desde 17/09 mas nunca tinham sido aplicadas no banco real — causa raiz de erros 500 em `releaseManualPsychoeducation`/`markPsychoeducationViewed`.
- **Falha de segurança corrigida — função `is_global_admin` exposta publicamente:**
  - Toda função nova em `public` no Supabase nasce com `EXECUTE` liberado por padrão pra `anon`. A função `is_global_admin(_user_id uuid)` (recém-criada) ficou temporariamente chamável via RPC público, permitindo checar se um UUID arbitrário era admin global. Corrigido revogando `EXECUTE` de `anon` diretamente na função.
- **Documentação viva sincronizada com o estado real do banco:**
  - Identidade da Lumina corrigida (Dr. Gustavo Mello + Dra. Camila Nogueira, não a "Dra. Camila Rocha" que constava antes), assinatura real de `is_global_admin()`, e remoção do aviso de integração com Lovable (projeto não usa mais a plataforma).
- **Testes:** 215/215 aprovados em 18 suítes. Typecheck limpo.

---

## [v1.32.0] - 2026-09-20
### 🏗️ Pipeline IaC, Módulo OpenMAIC de Simulação Clínica & Onboarding SaaS
- **Pipeline de Infraestrutura como Código (`scripts/pipeline/`):**
  - [`env.ts`](file:///mnt/armazenamento/Projetos/triagem-medica/scripts/pipeline/env.ts): centralização de variáveis sem caminhos absolutos.
  - [`validate-psychoeducation.ts`](file:///mnt/armazenamento/Projetos/triagem-medica/scripts/pipeline/validate-psychoeducation.ts): validador JSON pré-upload de conteúdo clínico.
  - [`batch-upload-topics.ts`](file:///mnt/armazenamento/Projetos/triagem-medica/scripts/pipeline/batch-upload-topics.ts): upload em lote com dry-run e chunks.
- **Módulo OpenMAIC (`src/lib/openmaic/`):**
  - DSL completa de simulação de agentes clínicos (`AgentRole`, `SimulationFlow`, `SimulationContext`).
  - 5 cenários pré-configurados: 3 casos clínicos autorais do Dr. Saraiva (depressão maior no idoso, transtorno do pânico, risco de suicídio em adolescente) e 2 de redução de danos (crack em situação de rua, desescalada em crise por álcool).
  - Orquestrador com ciclo de vida completo e regras éticas globais.
  - Suíte de testes dedicada (7 testes cobrindo isolamento e regras éticas).
- **Onboarding genérico de clínicas SaaS:**
  - Stored procedure `provision_new_clinic()` idempotente (`ON CONFLICT`), auditada, com REVOKE/GRANT estrito (`service_role` apenas) — provisiona assinatura Starter e vincula os 10 temas base de psicoeducação automaticamente.
- **Acervo clínico do Dr. Saraiva:**
  - 10 temas clínicos chancelados adicionais e guia mestre de desmame de benzodiazepínicos com TCC-I (5 questões TRI, 10 flashcards FSRS, pipeline de geração multimídia em `public/conteudo-saraiva/`).
- **Testes:** 215/215 aprovados em 18 suítes.

---

## [v1.31.0] - 2026-09-20
### 🛡️ Edge Security Hardening (Cloudflare), Multi-Tenant RLS & Sanitização LGPD
- **Cabeçalhos de Segurança na Borda Cloudflare (`public/_headers` e SSR):**
  - Implementação de Content Security Policy (`CSP`) com restrição `frame-ancestors 'self'`, eliminando o vetor crítico de clickjacking em questionários psiquiátricos.
  - Ativação de `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` (HSTS estrito de 1 ano).
  - Configuração de `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
  - `Permissions-Policy` bloqueando acesso indevido a hardware (`camera=(), microphone=(), geolocation=(), payment=()`).
  - Criação de [`public/_headers`](file:///mnt/armazenamento/Projetos/triagem-medica/public/_headers) compilado automaticamente pelo Nitro para assets estáticos e middleware [`applyEdgeSecurityHeaders`](file:///mnt/armazenamento/Projetos/triagem-medica/src/server.ts#L10) no SSR.
- **Blindagem Multi-Tenant em Funções de Borda (`src/lib/psychoeducation.functions.ts`):**
  - Eliminação de bypass acidental de RLS nas chamadas de psicoeducação clínica.
  - Inserção de trava de tenant em [`getAssessmentPsychoeducation`](file:///mnt/armazenamento/Projetos/triagem-medica/src/lib/psychoeducation.functions.ts#L61), [`releaseManualPsychoeducation`](file:///mnt/armazenamento/Projetos/triagem-medica/src/lib/psychoeducation.functions.ts#L105) e [`markPsychoeducationViewed`](file:///mnt/armazenamento/Projetos/triagem-medica/src/lib/psychoeducation.functions.ts#L145), validando ownership de tenant via `context.supabase` antes de invocar `supabaseAdmin`.
- **Expurgo e Sanitização de PII / Dados Sensíveis em Logs (`src/lib/error-capture.ts`):**
  - Função [`sanitizePiiAndSensitiveData`](file:///mnt/armazenamento/Projetos/triagem-medica/src/lib/error-capture.ts#L11) atuando sobre strings, objetos, payloads e stack traces de erro.
  - Máscaras ativas em conformidade com LGPD para CPF (`[CPF_REDACTED]`), telefones (`[PHONE_REDACTED]`), e-mails (`[EMAIL_REDACTED]`), Bearer tokens (`Bearer [JWT_REDACTED]`) e chaves secretas do Supabase (`[SUPABASE_SECRET_REDACTED]`).
- **Suíte de Testes de Segurança de Borda (`src/lib/security.test.ts`):**
  - Criação de 5 testes unitários dedicados à validação de headers, regex de PII e integridade de sanitização.
  - Base ampliada para **208 testes aprovados em 17 suítes** sem erros de compilação TypeScript.
- **Relatório de Auditoria:**
  - Emissão do dossiê final de auditoria de borda Cloudflare com nota evoluída de 74/100 para **96/100** em [`scratch/cloudflare_security_report.md`](file:///mnt/armazenamento/Projetos/triagem-medica/scratch/cloudflare_security_report.md).

---

## [v1.30.0] - 2026-09-19
### 🚀 Multi-Tenancy Dinâmico & Cockpit de Psicoeducação Clínica
- **Governança & Segurança Multi-Tenant:**
  - Isolamento estrito do papel de **Administrador Geral / Global** (`clinic_id: null`) exclusivo para `coletivoaruatemvoz@gmail.com`.
  - Restrição de médicos locais (Dr. Saraiva em `saraiva` e corpo clínico Lumina em `lumina-saude`) aos seus respectivos consultórios.
- **TenantSwitcher no Cabeçalho:**
  - Componente [`TenantSwitcher.tsx`](file:///mnt/armazenamento/Projetos/triagem-medica/src/components/painel/TenantSwitcher.tsx) e contexto [`TenantContext.tsx`](file:///mnt/armazenamento/Projetos/triagem-medica/src/context/TenantContext.tsx) adicionados ao [`PainelShell.tsx`](file:///mnt/armazenamento/Projetos/triagem-medica/src/components/painel/PainelShell.tsx).
  - Alternância fluida em 1 clique entre Visão Global (todas as clínicas), Saraiva Clínica de Psiquiatria e Instituto Lumina de Saúde Mental.
  - Sincronização em tempo real dos botões de compartilhamento ("Copiar link" e "Ver como paciente") e filtro dinâmico na fila de triagens sem necessidade de recarregar a página.
- **Cockpit de Psicoeducação Clínica (`/materiais`):**
  - Reformulação total de [`materiais.tsx`](file:///mnt/armazenamento/Projetos/triagem-medica/src/routes/_authenticated/materiais.tsx), substituindo mockups antigos por acervo ativo de 10 temas clínicos.
  - Integração de busca por palavras-chave, filtros por tags temáticas (`#TCC`, `#Grounding`, `#HigieneDoSono`, `#CVV188`), modal de visualização integral de artigos com impressão e atalho "Copiar Texto" formatado para envio no WhatsApp.
  - Matriz de Gatilhos Automáticos (`PSYCHOEDUCATION_TRIGGER_SPECS`) e catálogo de materiais técnicos médicos (Manejo de Risco C-SSRS, modelo de evolução de prontuário e NR-01).
- **Infraestrutura Cloudflare Workers:**
  - Correção de injeção de credenciais de serviço no `wrangler.json` para persistência segura de triagens anônimas no link público (`/{slug}/triagem`).

---

## [v1.29.0] - 2026-09-19
### 🧠 Motor Clínico Reativo, CAT/TRI, Dwell-Time & Homologação Lumina Saúde
- **Motor Clínico Isolado (`src/lib/clinical-engine/`):**
  - **Schemas Declarativos:** Especificação em JSON Schema (DSL padrão Form.io) das escalas clínicas (`EPDS`, `PHQ-2`, `PHQ-9`, `C-SSRS`, `SRQ-20`, `SNAP-IV`, `ASRS-18`, `AD-8`, `GDS-15`, `Y-BOCS`, `PCL-5`, `ISI`, `MBI-HSS`, `AUDIT`, `ASSIST`).
  - **Avaliador Puro (`schema-evaluator.ts`):** Trava biológica estrita de exclusão da EPDS para sexo masculino e cálculo determinístico de corte.
  - **Grafo Reativo DAG (`reactive-dag.ts`):** Motor de reações cruzadas (*x-reactions*) com algoritmo DFS de detecção e prevenção de ciclos infinitos.
  - **Motor CAT/TRI (`cat-estimator.ts`):** Teste Adaptativo Computadorizado baseado no Graded Response Model (GRM de Samejima / PROMIS / NIH), com estimador EAP via quadratura Gaussiana, Informação de Fisher e critério de parada $SE(\theta) \le 0.30$ com redução $\ge 50\%$ de itens aplicados.
  - **Telemetria de Dwell-Time (`dwell-time.ts`):** Monitoramento de latência por item, cálculo de média e mediana da sessão, detecção de resposta apressada/randômica (< 400ms) e identificação de hesitação emocional focal em ideação/risco ($\ge 3\times$ a média do paciente ou $\ge 10.000$ms).
  - **Isolamento de Tenant (`tenant-context.ts`):** Selagem imutável de `clinic_id` com bloqueio de cross-tenant leakage via `assertTenantBoundary`.
  - **Execução Sombra (`shadow-runner.ts` & `flags.ts`):** Padrão Strangler Fig com comparador de paridade clínica 100% equivalente entre o motor legado e a nova arquitetura declarativa.
- **Homologação Enterprise (`lumina-saude`):**
  - Tenant provisionado: Instituto Lumina de Saúde Mental & Neurociências (cores Púrpura Nobre `#4c1d95` e Violeta `#8b5cf6`, plano Enterprise R$ 2.400/mês).
  - Suíte de validação com 10 casos clínicos densos e ricos em relatos livres (`exercise-lumina-10-cases.test.ts`).
  - Componentes médicos [`TelemetryCard.tsx`](file:///mnt/armazenamento/Projetos/triagem-medica/src/components/medical/TelemetryCard.tsx) e [`PsychoeducationTracker.tsx`](file:///mnt/armazenamento/Projetos/triagem-medica/src/components/medical/PsychoeducationTracker.tsx) integrados ao prontuário (`painel.$id.tsx`).

---

## [v1.28.0] - 2026-09-19
### 🎨 Cockpit Médico & Redesign Responsivo
- Reorganização da navegação em 4 abas essenciais (Triagens, Pacientes, Evolução e Indicadores).
- Menu suspenso para Diretrizes Clínicas (Protocolo, Interpretação, Evidências, Materiais, NR-01).
- Redesign completo da página `/admin` para dispositivos móveis com formulários expansíveis e gerenciamento de corpo clínico.

---

## [v1.27.0] - 2026-09-18
### 📱 Homologação Multi-Viewport & Ergonomia Touch
- Bateria de 20 testes Playwright cobrindo Mobile Compacto (375px), Tablet e Desktop.
- Padronização de font-size $\ge 16$px para eliminar o auto-zoom do Safari iOS.
- Touch targets confortáveis ($\ge 48$px) em todas as opções de resposta e botões de navegação.

---

## [v1.26.0] - 2026-09-18
### ✍️ Textos Oficiais & Humanização da Jornada
- Revisão canônica dos textos clínicos com foco em acolhimento sem emissão de diagnósticos precipitados.
- Integração de canais de emergência com discagem direta nativa (CVV 188 e SAMU 192).
- Termo de consentimento e conformidade estrita com LGPD e Código de Ética Médica.

---

## [v1.25.0] - 2026-09-17
### 🏛️ Identidade Oficial Saraiva Clínica de Psiquiatria
- Consolidação da marca do Dr. José Ribamar Fernandes Saraiva Junior (CRM-RS 29349 · RQE 30038).
- Cores institucionais Verde Esmeralda e Menta.
- Estruturação da documentação viva do projeto em `/documentação viva/`.

---

## [v1.24.0] - 2026-09-17
### 🛡️ Psicoeducação & Decision Support Clínico
- Biblioteca dos 10 temas clínicos essenciais.
- Motor de apoio à decisão clínica e Plano de Segurança Estruturado.
- Geração de relatórios médicos e cards para o portal do paciente.

---

## [v1.0.0 a v1.23.0] - 2026-07 a 2026-08
### 🏗️ Fundação da Plataforma
- Arquitetura TanStack Start + React 19 + Supabase Postgres com RLS.
- Implementação das 28 escalas psicométricas internacionais.
- Painel mobile-first, exportação de prontuários em PDF e gestão de assinaturas SaaS.
