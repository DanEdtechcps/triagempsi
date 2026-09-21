# 🗺️ ROADMAP — TriagemPsi

Plano diretor de engenharia, arquitetura clínica e evolução do produto TriagemPsi.

Legenda de status:
- `[X]` **Concluído & Homologado**
- `[/]` **Em Andamento**
- `[ ]` **Futuro / Backlog Estratégico**

---

## 🧠 1. Motor Clínico & Arquitetura Reativa (Fases 1 a 5)

- [X] **Fase 1: Schemas Declarativos & Avaliador Puro**
  - [X] Schemas em JSON Schema desacoplados (`EPDS`, `PHQ-2`, `PHQ-9`, `C-SSRS`, `SRQ-20`, `SNAP-IV`, `ASRS-18`, `AD-8`, `GDS-15`, `Y-BOCS`, `PCL-5`, `ISI`, `MBI-HSS`, `AUDIT`, `ASSIST`).
  - [X] Avaliador determinístico sem estado externo ([`schema-evaluator.ts`](file:///mnt/armazenamento/Projetos/triagem-medica/src/lib/clinical-engine/schema-evaluator.ts)).
  - [X] Trava biológica estrita da EPDS para sexo masculino (`isMaleSex -> elegibilidade = false`).
- [X] **Fase 2: Grafo Reativo DAG & Reações Cruzadas**
  - [X] Motor reativo acíclico com algoritmo DFS de detecção de loops ([`reactive-dag.ts`](file:///mnt/armazenamento/Projetos/triagem-medica/src/lib/clinical-engine/reactive-dag.ts)).
  - [X] Catálogo canônico de reações cruzadas ([`reactions.ts`](file:///mnt/armazenamento/Projetos/triagem-medica/src/lib/clinical-engine/reactions.ts)): PHQ-2 $\to$ PHQ-9, GAD-2 $\to$ GAD-7, AUDIT-C $\to$ AUDIT, gatilho imediato de Plano de Segurança.
- [X] **Fase 3: Isolamento Multi-Tenant Estrito**
  - [X] Contexto congelado `TenantContext` com vinculação obrigatória de `clinic_id` ([`tenant-context.ts`](file:///mnt/armazenamento/Projetos/triagem-medica/src/lib/clinical-engine/tenant-context.ts)).
  - [X] Middleware de prevenção de vazamento cruzado (`assertTenantBoundary`).
  - [X] Isolamento de permissões: Admin Geral único (`coletivoaruatemvoz@gmail.com`) e médicos restritos à sua clínica.
  - [X] Componente de alternância dinâmica [`TenantSwitcher.tsx`](file:///mnt/armazenamento/Projetos/triagem-medica/src/components/painel/TenantSwitcher.tsx) no topo do Cockpit.
- [X] **Fase 4: Comparador Sombra & Feature Flags**
  - [X] Padrão Strangler Fig com fallback automático ([`flags.ts`](file:///mnt/armazenamento/Projetos/triagem-medica/src/lib/clinical-engine/flags.ts)).
  - [X] Comparador sombra com 100% de equivalência validada ([`shadow-runner.ts`](file:///mnt/armazenamento/Projetos/triagem-medica/src/lib/clinical-engine/shadow-runner.ts)).
- [X] **Fase 5: Motor CAT/TRI & Telemetria Dwell-Time**
  - [X] Teste Adaptativo Computadorizado via Graded Response Model (GRM de Samejima) com critério $SE(\theta) \le 0.30$ e redução $\ge 50\%$ de itens ([`cat-estimator.ts`](file:///mnt/armazenamento/Projetos/triagem-medica/src/lib/clinical-engine/cat-estimator.ts)).
  - [X] Detector de hesitação focal psicométrica e respostas randômicas < 400ms ([`dwell-time.ts`](file:///mnt/armazenamento/Projetos/triagem-medica/src/lib/clinical-engine/dwell-time.ts)).
  - [X] Homologação Enterprise com os 10 casos ricos do Instituto Lumina de Saúde Mental ([`exercise-lumina-10-cases.test.ts`](file:///mnt/armazenamento/Projetos/triagem-medica/src/lib/clinical-engine/exercise-lumina-10-cases.test.ts)).

---

## 🏗️ 1b. Pipeline SaaS & Simulação Clínica (OpenMAIC)

- [X] **Onboarding Genérico de Clínicas SaaS**
  - [X] Stored procedure `provision_new_clinic()` idempotente, auditada, com REVOKE/GRANT estrito (`service_role` apenas) — provisiona assinatura Starter e vincula os 10 temas base de psicoeducação automaticamente.
- [X] **Módulo OpenMAIC de Simulação Clínica** ([`src/lib/openmaic/`](file:///mnt/armazenamento/Projetos/triagem-medica/src/lib/openmaic/))
  - [X] DSL de simulação de agentes clínicos (`AgentRole`, `SimulationFlow`, `SimulationContext`).
  - [X] 5 cenários: 3 casos clínicos autorais do Dr. Saraiva + 2 de redução de danos (Caminhos Campinas).
  - [X] Orquestrador com regras éticas globais e suíte de testes dedicada.
- [X] **Pipeline de Infraestrutura como Código** ([`scripts/pipeline/`](file:///mnt/armazenamento/Projetos/triagem-medica/scripts/pipeline/))
  - [X] Validação, upload em lote e centralização de variáveis sem caminhos absolutos.

---

## 🩺 2. Experiência Clínica, Psicoeducação & Prontuário

- [X] **Cockpit de Psicoeducação Clínica (`/materiais`)**
  - [X] Acervo de 10 temas clínicos essenciais baseados em TCC, ABP, higiene do sono e envelhecimento ([`materiais.tsx`](file:///mnt/armazenamento/Projetos/triagem-medica/src/routes/_authenticated/materiais.tsx)).
  - [X] Busca em tempo real e filtros por tags diagnósticas.
  - [X] Modal de leitura com formatação médica e botão "Copiar Texto" pronto para WhatsApp.
  - [X] Matriz de regras automáticas correlacionando as 28 escalas aos temas.
  - [X] Materiais técnicos do consultório (C-SSRS, modelo de evolução e NR-01).
- [X] **Prontuário Médico Inteligente**
  - [X] Card de Telemetria de Hesitação integrado ([`TelemetryCard.tsx`](file:///mnt/armazenamento/Projetos/triagem-medica/src/components/medical/TelemetryCard.tsx)).
  - [X] Monitor de engajamento e status de leitura do paciente ([`PsychoeducationTracker.tsx`](file:///mnt/armazenamento/Projetos/triagem-medica/src/components/medical/PsychoeducationTracker.tsx)).
  - [X] Exportação em PDF médico e relatório simplificado para o paciente.
- [/] **Persistência de Telemetria em Tempo Real**
  - [/] Gravação de latência individual por item (`response_time_ms`) no banco Supabase em lote assíncrono.
  - [/] Webhooks de notificação instantânea quando detectada ideação suicida ou hesitação crítica.

---

## 🔬 3. Pesquisa Clínica & Evidências de Mundo Real (RWE / eCRF)

- [ ] **Módulo eCRF (Electronic Case Report Form)**
  - [ ] Formulários eletrônicos de coleta de dados para ensaios clínicos acadêmicos e estudos multicêntricos.
  - [ ] Pista de auditoria completa com controle de versão de resposta (Audit Trail CFR 21 Part 11).
  - [ ] Exportação de datasets em formatos tabulares padronizados (CSV, Parquet, CDISC ODM).
- [ ] **RWE Dashboard (Real-World Evidence)**
  - [ ] Agregação epidemiológica de curvas de resposta e evolução longitudinal de sintomas por coorte.
  - [ ] Análise psicométrica em larga escala com calibração empírica dos parâmetros $a$ e $b$ da TRI.
- [ ] **Interoperabilidade em Saúde**
  - [ ] Exportação e ingestão de dados em padrão HL7 / FHIR para integração com prontuários eletrônicos de hospitais e clínicas parceiras.
  - [ ] Rastreio guiado por voz (áudio screening) com transcrição automatizada para pacientes com dificuldades de leitura.
