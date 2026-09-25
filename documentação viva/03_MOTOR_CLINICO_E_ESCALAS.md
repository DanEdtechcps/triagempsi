# 03. Motor Clínico e Escalas Psiquiátricas

> **Saraiva Clínica de Psiquiatria** & **Instituto Lumina de Saúde Mental**
> **Dr. José Ribamar Fernandes Saraiva Junior** | CRM-RS 29349 · RQE 30038

> **Nota de proveniência (25/09/2026):** este documento foi reescrito do zero após a decisão registrada em [`AUDITORIA_MOTOR_CLINICO_2026-09-25.md`](file:///mnt/armazenamento/Projetos/triagem-medica/documentação%20viva/AUDITORIA_MOTOR_CLINICO_2026-09-25.md). Até essa data, esta doc descrevia um segundo motor declarativo por JSON Schema (`schema-evaluator.ts`, `cat-estimator.ts`, `reactive-dag.ts`, `shadow-runner.ts`, `flags.ts`, `schemas/*.json`) que **nunca rodou em produção** e foi deletado. Toda afirmação abaixo foi conferida diretamente contra o código real na data desta reescrita — não copie trechos daqui sem reconferir se o código mudou.

---

## 1. Visão geral da arquitetura

Existe **um único motor clínico**, em [`src/lib/clinical-engine/`](file:///mnt/armazenamento/Projetos/triagem-medica/src/lib/clinical-engine/) + [`src/lib/scoring.ts`](file:///mnt/armazenamento/Projetos/triagem-medica/src/lib/scoring.ts) + os 5 arquivos de catálogo de escalas em `src/lib/`. É código determinístico puro (sem I/O, sem estado externo), composto de:

1. **Árvore de decisão** (`clinical-engine/triage-tree.ts`) — decide quais escalas aplicar a partir dos sintomas relatados e da faixa etária, e como escalonar pra novas escalas a partir de um resultado.
2. **Motor de pontuação** (`scoring.ts`) — calcula escore, banda de gravidade e flags de risco de cada escala respondida.
3. **Catálogo de escalas** — 5 arquivos de dados puros (`scales-data.ts`, `scales-extra.ts`, `scales-ampliadas.ts`, `scales-official-28.ts`, `scales-ocupacional.ts`), consolidados em `ALL_SCALES`/`SCALE_BY_CODE`.
4. **Telemetria de dwell-time** (`clinical-engine/dwell-time.ts`) — detecção de hesitação comportamental por tempo de resposta.
5. **Apoio à decisão clínica** (`clinical-decision-support.ts`) e **psicoeducação** (`psychoeducation.ts`) — camadas de pós-processamento sobre os resultados já pontuados.

Fluxo real confirmado por rastreio de import: `src/routes/$slug.triagem.tsx` → `@/lib/clinical-engine` (barrel `index.ts`) → `triage-tree.ts` → `scoring.ts` + `SCALE_BY_CODE`.

`src/lib/clinical-engine/index.ts` re-exporta apenas `types`, `triage-tree`, `tenant-context` e `dwell-time`. `tenant-context.ts` está presente no diretório mas é **código morto** (nunca chamado por rota ou server function real — ver comentário em `src/lib/assessment.functions.ts:20-26`); seu destino é uma decisão separada, ligada à unificação de RLS multi-tenant (fora do escopo deste documento).

---

## 2. Catálogo de escalas

O catálogo real tem **43 códigos de escala** distintos, definidos como objetos TypeScript puros (`Scale`, ver `src/lib/scale-types.ts`) espalhados em 5 arquivos e consolidados em `ALL_SCALES`/`SCALE_BY_CODE` (`scales-data.ts:389-399`):

| Arquivo | Papel |
|---|---|
| [`scales-data.ts`](file:///mnt/armazenamento/Projetos/triagem-medica/src/lib/scales-data.ts) | Escalas-base de rastreio inicial (PHQ-2/9, GAD-2, ASQ, AUDIT-C, AUDIT, PC-PTSD-5, PHQ-15, PCL-5) + funções de navegação (`skippedItemIds`, `nextItemIndex`, etc.) |
| [`scales-extra.ts`](file:///mnt/armazenamento/Projetos/triagem-medica/src/lib/scales-extra.ts) | Escalas complementares |
| [`scales-ampliadas.ts`](file:///mnt/armazenamento/Projetos/triagem-medica/src/lib/scales-ampliadas.ts) | Escalas ampliadas (inclui EPDS, SCOFF) |
| [`scales-official-28.ts`](file:///mnt/armazenamento/Projetos/triagem-medica/src/lib/scales-official-28.ts) | Escalas oficiais adicionais |
| [`scales-ocupacional.ts`](file:///mnt/armazenamento/Projetos/triagem-medica/src/lib/scales-ocupacional.ts) | Escala ocupacional (COPSOQ-BR) |

**Não há uma tabela de cutoffs transcrita aqui de propósito.** A versão anterior desta doc continha uma tabela manual de "28 escalas" com códigos que não existem no catálogo real (`DAST-10`, `SPIN`, `PDSS-SR`, `BES`, `HADS`, `WSAS`, `CGI-S`) e omitia códigos reais (`SRQ-20`, `ASQ`, `RISCO-ADO`, `AUDIT-C`, `CAGE`, `ASSIST`, `PGSI`, `CRAFFT`, `PC-PTSD-5`, `COPSOQ-BR`, `FTND`, `OCI-R`). Transcrição manual de cutoffs clínicos é exatamente o padrão de erro que causou os achados críticos #34/#35 desta auditoria (inversão de pontuação em 7 escalas). **Os 5 arquivos-fonte acima são a única fonte de verdade** para código, nome, bandas e cutoff de cada escala — consulte-os diretamente ou via `SCALE_BY_CODE[code]`.

Cada `Scale` pode ter `status: "ativa"` (entra no fluxo de resposta) ou `"estrutura"` (vira indicação para aplicação presencial na consulta, não é respondida no formulário — ver `classify()` em `triage-tree.ts:586-616`).

### Bug crítico já corrigido: precedência de opções por item

Até 23/09/2026, `getItemOptions()` em `scoring.ts` ignorava `ScaleItem.options` (opções específicas de um item, usadas em itens de pontuação reversa) e caía sempre para as opções padrão da escala — invertendo a pontuação de 7 instrumentos (EPDS itens 1-2, GDS-15 itens 1/5/7/11/13, FTND itens 1/3/4, ISI itens 4-7, AQ-10 itens 2-6/9, PSS-10 itens 4/5/7/8). Corrigido no commit `cd3fbf9`: `item.options` agora é checado antes de qualquer fallback. Ao adicionar uma escala nova com itens de pontuação reversa, declare `options` no próprio `ScaleItem` — nunca assuma que o fallback pra `scale.options` está correto.

---

## 3. Árvore de decisão (`clinical-engine/triage-tree.ts`)

### 3.1 Roteamento de entrada

`ROUTING_RULES` (linhas 126-319) mapeia cada sintoma relatado pelo paciente (`SYMPTOM_QUESTION`, 18 opções) + faixa etária (`crianca` < 12, `adolescente` 12-17, `adulto` 18-59, `idoso` ≥ 60) para as escalas de rastreio inicial correspondentes. `BASELINE_BY_BAND` aplica SRQ-20 como rastreio universal para adultos e idosos independente do sintoma relatado.

### 3.2 Escalonamento condicional

`ESCALATION_RULES` (linhas 337-549) tem **31 regras** que decidem, a partir do resultado de uma escala já respondida, se uma nova escala deve ser injetada no fluxo. Cobre depressão, ansiedade, sofrimento geral, via de risco (ASQ/RISCO-ADO), álcool, substâncias (ASSIST por substância), jogo patológico, TOC, trauma, somatização, espectro bipolar, tabaco, perinatal, transtornos alimentares, sono, neurodesenvolvimento, saúde ocupacional e cognição. `applyEscalations()` aplica essas regras e retorna o plano atualizado.

### 3.3 Trava biológica da EPDS

`isMaleSex()` (linhas 622-644) detecta sexo masculino a partir do campo de sexo/gênero **e** dos pronomes declarados (`isMalePatient()`, linhas 650-666). `buildTriagePlan()` e `applyEscalations()` expurgam a EPDS do fluxo em qualquer ponto — na entrada por sintoma, na escalada condicional e no filtro final (`safeFlow`/`safeIndicated`) — para pacientes identificados como do sexo masculino. A escala EPDS em si (`scales-ampliadas.ts`) tem `minAge: 12` e nenhuma flag de exclusão por sexo própria; a trava é inteiramente responsabilidade da árvore de decisão, não da definição da escala.

---

## 4. Telemetria de dwell-time (`clinical-engine/dwell-time.ts`)

Analisa o tempo de resposta por item (`response_time_ms`) para detectar hesitação comportamental e preenchimento desatento. Usado de verdade em produção por [`painel.$id.tsx`](file:///mnt/armazenamento/Projetos/triagem-medica/src/routes/_authenticated/painel.$id.tsx) e [`TelemetryCard.tsx`](file:///mnt/armazenamento/Projetos/triagem-medica/src/components/medical/TelemetryCard.tsx).

- **Baseline do paciente:** média aritmética dos tempos de item da sessão, com piso de 800ms (`Math.max(800, patientAverageTimeMs)`) — não a mediana.
- **Alerta crítico** (`alert_level: "critical"`): item marcado como `is_risk_item` com tempo ≥ **3.0x** a média do paciente, OU tempo absoluto ≥ 10.000ms.
- **Alerta de advertência** (`alert_level: "warning"`): qualquer item com tempo ≥ **4.0x** a média **e** ≥ 8.000ms absolutos.
- **Detecção de preenchimento desatento** (`random_answering_detected`): 3 ou mais itens consecutivos respondidos em menos de 400ms.
- Campo agregado de saída: `has_risk_hesitation` (booleano, true se houver ao menos um alerta `critical`). Não existe campo `focal_hesitation_alert` no código real.

---

## 5. Apoio à decisão clínica (`clinical-decision-support.ts`)

`getClinicalDecisionSupport()` recebe os resultados já pontuados e gera cartões de orientação para o psiquiatra (não substitui julgamento clínico). 8 regras reais, avaliadas em ordem:

1. **Urgente — risco de suicídio:** PHQ-9 item 9 positivo, C-SSRS de risco, `RISK-COMPOSITE` positivo, ou `riskPathway` já ativo — orienta plano de segurança e canais CVV 188 / SAMU 192.
2. **Alerta — espectro bipolar:** MDQ positivo (≥ 7 ou banda "positivo") + PHQ-9 ≥ 10 — alerta contra antidepressivo em monoterapia.
3. **Alerta — depressão + insônia:** PHQ-9 ≥ 10 + ISI ≥ 15 — recomenda TCC-I antes de escalar benzodiazepínicos.
4. **Alerta — substâncias + sofrimento afetivo:** (AUDIT ≥ 8 ou DAST-10 ≥ 3 ou CRAFFT ≥ 2) + (PHQ-9 ≥ 10 ou GAD-7 ≥ 10) — orienta FRAMES.
5. **Orientativo — TDAH vs. ansiedade:** ASRS-18 positivo + GAD-7 ≥ 10 — diferencial diagnóstico.
6. **Alerta — trauma + sono:** PCL-5 ≥ 31 + ISI ≥ 15.
7. **Orientativo — burnout:** MBI-HSS ≥ 28 ou PSS-10 ≥ 27.
8. **Orientativo — prevenção:** fallback quando nenhuma das regras acima dispara.

Nota: as regras 4, 6 e 7 referenciam `DAST-10` e `PSS-10`. Essas escalas existem no catálogo (`scales-official-28.ts`, `status: "ativa"`) mas **não aparecem em nenhuma `ROUTING_RULES`/`ESCALATION_RULES` de `triage-tree.ts`** — ou seja, nenhum caminho automático do questionário do paciente as aplica hoje; só entram no cálculo se um escore for atribuído a elas manualmente. É uma divergência pré-existente entre este módulo e a árvore de decisão ativa, não corrigida nesta sessão por estar fora do escopo da decisão do motor duplicado.

---

## 6. Psicoeducação (`psychoeducation.ts`)

`PSYCHOEDUCATION_TRIGGER_SPECS` (10 tópicos) + `evaluatePsychoeducationTriggers()` decidem quais trilhas educativas mostrar ao paciente/família a partir dos resultados:

| Tópico | Critério real |
|---|---|
| Crise emocional | PHQ-9 item 9 ≥ 1, C-SSRS positivo ou via de risco |
| Depressão e humor | PHQ-9 ≥ 10 ou PHQ-2 ≥ 3 |
| Ansiedade | GAD-7 ≥ 10 ou GAD-2 ≥ 3 |
| Insônia | ISI ≥ 15 |
| TDAH adultos | ASRS-18 Parte A positiva ou banda moderada/grave |
| Oscilações de humor | MDQ positivo (≥ 7) |
| Álcool e substâncias | AUDIT ≥ 8, DAST-10 ≥ 3 ou CRAFFT ≥ 2 |
| Trauma / TEPT | PCL-5 ≥ 31 |
| Burnout | MBI-HSS exaustão ≥ 28 ou PSS-10 ≥ 27 |
| Bem-estar / prevenção | WHO-5 ≤ 12, ou disparo universal como fallback |

Prioridade de crise > rotina; tópicos podem ter override por clínica (`ClinicPsychoOverride`, `is_enabled`/`auto_trigger`).

---

## 7. Cobertura de teste do motor legado

- Testes unitários de lógica pura: `scoring.ts`, `scales-data.ts`/`scales-28-official.ts`, `triage-tree.ts` (via os testes acima), `psychoeducation.test.ts`.
- **Simulação de 10 casos clínicos ricos** (`clinical-engine/exercise-lumina-10-cases.test.ts`) exercitando `buildTriagePlan`/`applyEscalations` do motor legado ponta a ponta com perfis realistas (TDAH, pós-parto com risco, TOC, insônia + ansiedade, geriatria por hetero-relato, limítrofe PHQ-2, bipolaridade, burnout ocupacional, TEPT, dependência de substâncias).
- E2E via Playwright (`e2e/`) cobrindo o fluxo de triagem do paciente na UI.
- **Lacuna conhecida:** zero testes (unitários ou E2E) para `admin.tsx` e `painel.index.tsx` — ver roadmap item de itens incrementais.
