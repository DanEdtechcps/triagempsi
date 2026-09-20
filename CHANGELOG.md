# 📜 CHANGELOG — TriagemPsi

Todas as alterações notáveis, releases clínicas e evoluções de engenharia do ecossistema TriagemPsi estão documentadas neste arquivo.

O formato baseia-se no [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

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
