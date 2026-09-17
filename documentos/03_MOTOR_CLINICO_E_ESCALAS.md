# 03. Motor Clínico e Escalas Psiquiátricas

O coração do TriagemPsi é o seu motor clínico adaptativo. Em vez de submeter o paciente a um formulário estático de 200 perguntas (o que causaria altíssima taxa de abandono), a plataforma utiliza uma **árvore de decisão com ramificação inteligente**.

---

## 1. As 28 Escalas Psiquiátricas Suportadas

O sistema integra 28 instrumentos e baterias psicométricas validadas cientificamente pela literatura psiquiátrica:

| Código | Instrumento Clínico | Alvo Clínico | Faixas / Pontuação |
|---|---|---|---|
| **PHQ-9** | Patient Health Questionnaire-9 | Depressão Maior & Ideação Suicida | 0-4 Mínima, 5-9 Leve, 10-14 Moderada, 15-19 Mod. Grave, 20-27 Grave. |
| **GAD-7** | Generalized Anxiety Disorder-7 | Ansiedade Generalizada | 0-4 Mínima, 5-9 Leve, 10-14 Moderada, 15-21 Grave. |
| **ASRS-18** | Adult ADHD Self-Report Scale | TDAH em Adultos | Desatenção e Hiperatividade/Impulsividade (Partes A e B). |
| **MDQ** | Mood Disorder Questionnaire | Transtorno Bipolar / Espectro Bipolar | Critério positivo: >= 7 sintomas simultâneos com prejuízo moderado/grave. |
| **ISI** | Insomnia Severity Index | Insônia e Qualidade do Sono | 0-7 Sem insônia, 8-14 Subclínica, 15-21 Moderada, 22-28 Grave. |
| **AUDIT** | Alcohol Use Disorders Identification | Consumo de Álcool | Risco baixo, uso de risco, uso nocivo e provável dependência. |
| **DAST-10** | Drug Abuse Screening Test | Uso de Substâncias Ilícitas / Medicamentos | 0 Sem problema, 1-2 Baixo, 3-5 Moderado, 6-8 Substancial, 9-10 Grave. |
| **C-SSRS** | Columbia Suicide Severity Rating Scale | Risco de Suicídio e Comportamento | Triagem direta de ideação passiva, ativa e planejamento. |
| **Y-BOCS** | Yale-Brown Obsessive Compulsive Scale | Sintomas Obsessivo-Compulsivos (TOC) | Obsessões e compulsões: tempo gasto, angústia e controle. |
| **PCL-5** | PTSD Checklist for DSM-5 | Estresse Pós-Traumático (TEPT) | Intrusão, evitação, alterações cognitivas e hiperativação. |
| **EPDS** | Edinburgh Postnatal Depression Scale | Depressão Pós-Parto e Perinatal | Corte >= 10 ou >= 12 com atenção ao item 10 de autolesão. |
| **AQ-10** | Autism Spectrum Quotient | Rastreio de Espectro Autista em Adultos | 0-10 pontos (corte indicativo >= 6). |
| **SPIN** | Social Phobia Inventory | Fobia Social / Ansiedade Social | Medo, evitação e sintomas fisiológicos sociais. |
| **PDSS-SR** | Panic Disorder Severity Scale | Transtorno de Pânico e Agorafobia | Frequência de ataques, ansiedade antecipatória e esquiva. |
| **Binge-10**| Binge Eating Scale | Transtornos Alimentares / Compulsão | Rastreio de episódios compulsivos e culpa associada. |
| **+ 13 Escalas** | Escalas Ampliadas, Ocupacionais e Clínicas | Burnout (MBI-HSS), Somatização (PHQ-15), etc. | Módulos secundários acionados conforme queixa principal. |

---

## 2. A Árvore de Decisão Adaptativa (`triage-tree.ts`)

A jornada do paciente é dividida em 3 fases dinâmicas:

### Fase 1: Identificação e Queixa Principal
1. Nome, Idade, Tipo de respondente (o próprio paciente ou um familiar responsável).
2. Seleção de motivos da consulta (humor, ansiedade, atenção/foco, sono, substâncias, trauma).

### Fase 2: Bateria de Rastreio Rápido (Screener)
* Aplicação das perguntas-chave do **PHQ-2** (humor deprimido e anedonia) e **GAD-2** (tensão e preocupação incontrolável).
* Se o PHQ-2 for positivo (score >= 3), o motor expande automaticamente para os 9 itens completos do **PHQ-9**.
* Se o GAD-2 for positivo, o motor expande para o **GAD-7** completo.

### Fase 3: Ramificação Direcionada (Branching)
* **Gatilho de TDAH:** Se o paciente marcou dificuldade de foco ou inquietação, a bateria do **ASRS** é injetada no fluxo.
* **Gatilho de Bipolaridade:** Se o PHQ-9 for moderado ou se houver histórico de oscilação, o **MDQ** é acionado para investigar viradas hipomaníacas/maníacas induzidas por antidepressivos.
* **Gatilho de Sono:** Queixas de sono ativam o **ISI**.
* **Gatilho de Substâncias:** O **AUDIT** e o **DAST** são apresentados de forma acolhedora e não-estigmatizante.

---

## 3. Protocolo de Alerta e Escalação de Risco

O sistema possui travas automáticas para eventos de risco iminente:

1. **Risco de Suicídio (PHQ-9 Item 9 e C-SSRS):**
   * Se o paciente pontua >= 1 no item 9 do PHQ-9 ("Pensamentos de que seria melhor estar morto ou de se ferir"), o sistema sinaliza a flag de risco no painel com tarja vermelha de prioridade alta.
   * Na interface do paciente, **nunca** bloqueia o fluxo; apresenta discretamente um card de apoio emocional (CVV 188 e SAMU 192).
2. **Risco de Psicose / Confusão Mental:**
   * Alerta no painel com prioridade de contato imediato pela secretária ou médico.

---

## 4. Geração do Prontuário em PDF (`pdf-report.ts`)

A aplicação gera dois tipos distintos de relatórios através da biblioteca `jsPDF`:

1. **PDF Clínico (Exclusivo do Médico):**
   * Inclui todos os scores brutos, percentis, sintomas relatados na íntegra, linha do tempo longitudinal, análise farmacológica prévia e alertas de segurança.
2. **PDF Resumo do Paciente:**
   * Linguagem acessível e psicoeducativa.
   * Orienta sobre como se preparar para a consulta.
   * Não emite diagnósticos fechados (em estrito cumprimento às resoluções do CFM e do Código de Ética Médica).
