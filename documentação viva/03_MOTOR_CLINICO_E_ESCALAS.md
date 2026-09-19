# 03. Motor Clínico e Escalas Psiquiátricas — Saraiva Clínica de Psiquiatria

> **Dr. José Ribamar Fernandes Saraiva Junior** | CRM-RS 29349 · RQE 30038  
> *“Cuidado psiquiátrico com escuta, ciência e humanidade”*

O coração do TriagemPsi é o seu motor clínico adaptativo puro (`src/lib/scoring.ts`, `src/lib/triage-tree.ts`, `src/lib/clinical-decision-support.ts` e `src/lib/safety-plan.ts`). Desenvolvido sob a ótica da prática psiquiátrica integrativa do Dr. Saraiva — aliando a escuta da Medicina de Família, evidências em Terapia Cognitivo-Comportamental (TCC), princípios de redução de danos em Dependência Química e a psicodinâmica do Envelhecimento Humano.

Em vez de submeter o paciente a um formulário estático exaustivo, a plataforma utiliza uma **árvore de decisão com ramificação adaptativa** baseada em funções puras (sem efeitos colaterais de UI), garantindo precisão psicométrica e 100% de cobertura por testes automatizados.

---

## 1. As 28 Escalas Psiquiátricas Oficiais

Cada escala atende rigorosamente ao contrato padronizado: `scale_code`, `score` (numérico), `band` (texto da faixa), `band_level` (0 a 4) e `risk` (booleano).

| # | Código | Nome Completo | Alvo Clínico | Cut-offs / Bandas Principais | Risk Flag |
|---|---|---|---|---|---|
| 1 | **PHQ-9** | Patient Health Questionnaire-9 | Depressão maior e gravidade | 0-4 Mínima, 5-9 Leve, 10-14 Moderada, 15-19 Mod. Grave, 20-27 Grave. | Item 9 ≥ 1 (pensamento de morte/autolesão) |
| 2 | **GAD-7** | Generalized Anxiety Disorder-7 | Transtorno de ansiedade generalizada | 0-4 Mínima, 5-9 Leve, 10-14 Moderada, 15-21 Grave. | Score ≥ 15 (ansiedade severa) |
| 3 | **ASRS-18** | Adult ADHD Self-Report Scale | TDAH em adultos (Partes A + B) | Parte A ≥ 4 sintomas frequentes = rastreio positivo; scores totais de desatenção e hiperatividade. | Atenção clínica para diagnóstico diferencial |
| 4 | **MDQ** | Mood Disorder Questionnaire | Espectro bipolar e virada maníaca | ≥ 7 sintomas simultâneos com prejuízo moderado/grave = rastreio positivo. | Alerta para risco de prescrição isolada de antidepressivo |
| 5 | **ISI** | Insomnia Severity Index | Gravidade da insônia | 0-7 Sem insônia, 8-14 Subclínica, 15-21 Moderada, 22-28 Grave. | Insônia grave como amplificador de risco |
| 6 | **AUDIT** | Alcohol Use Disorders Identification | Padrão de consumo de álcool | 0-7 Baixo risco, 8-15 Uso de risco, 16-19 Uso nocivo, ≥ 20 Provável dependência. | Score ≥ 20 (dependência severa) |
| 7 | **DAST-10** | Drug Abuse Screening Test | Uso abusivo de substâncias ilícitas | 0 Sem problemas, 1-2 Baixo, 3-5 Moderado, 6-8 Substancial, 9-10 Grave. | Score ≥ 6 (risco substancial/grave) |
| 8 | **C-SSRS** | Columbia Suicide Severity Rating Scale | Avaliação e gravidade do risco de suicídio | 0 Sem risco, 1-2 Risco baixo (ideação passiva), 3 Risco moderado, 4-6 Risco crítico / iminente. | Qualquer resposta positiva ativa via de risco; ≥ 4 emergência |
| 9 | **Y-BOCS** | Yale-Brown Obsessive Compulsive Scale | Sintomas obsessivo-compulsivos (TOC) | 0-7 Subclínico, 8-15 Leve, 16-23 Moderado, 24-31 Grave, 32-40 Extremo. | Angústia severa e prejuízo funcional |
| 10 | **PCL-5** | PTSD Checklist for DSM-5 | Estresse pós-traumático (TEPT) | 0-30 Negativo, 31-80 TEPT provável (corte ≥ 31-33). Avalia 4 clusters do DSM-5. | Score ≥ 33 ou histórico de violência ativa |
| 11 | **EPDS** | Edinburgh Postnatal Depression Scale | Depressão perinatal e pós-parto | 0-9 Sem indicação, 10-12 Sintomas possíveis, 13-30 Rastreio positivo. | Item 10 ≥ 1 (ideação de autolesão) |
| 12 | **AQ-10** | Autism Spectrum Quotient-10 | Traços do espectro autista em adultos | 0-5 Negativo, 6-10 Rastreio positivo indicativo de avaliação especializada. | Encaminhamento diagnóstico |
| 13 | **SPIN** | Social Phobia Inventory | Fobia social e ansiedade social | 0-19 Subclínico, 20-30 Leve, 31-40 Moderada, 41-50 Grave, 51-68 Muito grave. | Prejuízo de esquiva fóbica |
| 14 | **PDSS-SR** | Panic Disorder Severity Scale | Transtorno de pânico e agorafobia | 0-3 Normal, 4-7 Borderline, 8-10 Leve, 11-13 Moderado, 14-28 Grave. | Ataques recorrentes e agorafobia |
| 15 | **BES** | Binge Eating Scale | Compulsão alimentar periódica | 0-17 Ausente, 18-26 Compulsão moderada, 27-48 Compulsão grave. | Episódios frequentes de perda de controle |
| 16 | **PHQ-15** | Patient Health Questionnaire-15 | Somatização e sintomas físicos | 0-4 Mínima, 5-9 Baixa, 10-14 Média, 15-30 Alta gravidade somática. | Hiperfrequência e sofrimento físico |
| 17 | **MBI-HSS** | Maslach Burnout Inventory | Síndrome de Burnout no trabalho | Exaustão emocional, despersonalização e baixa realização profissional. | Score ≥ 28 (risco elevado de Burnout) |
| 18 | **CRAFFT** | CRAFFT 2.1 Screening Tool | Substâncias em jovens e adolescentes (< 21 anos) | 0-1 Baixo risco, 2-6 Risco significativo de abuso/dependência. | Score ≥ 2 (risco clínico na juventude) |
| 19 | **SCOFF** | SCOFF Questionnaire | Rastreio de transtornos alimentares | 0-1 Negativo, 2-5 Rastreio positivo para anorexia/bulimia. | Vômitos provocados ou perda rápida de peso |
| 20 | **HADS** | Hospital Anxiety and Depression Scale | Ansiedade e depressão hospitalar/ambulatorial | Subescalas HADS-A e HADS-D: 0-7 Normal, 8-10 Borderline, 11-21 Caso provável. | Casos moderados a graves |
| 21 | **PSS-10** | Perceived Stress Scale-10 | Nível de estresse percebido | 0-13 Baixo estresse, 14-26 Estresse moderado, 27-40 Alto estresse. | Sobrecarga crônica de adaptabilidade |
| 22 | **WHO-5** | WHO-5 Well-Being Index | Índice de bem-estar da OMS | 51-100% Adequado, 29-50% Baixo bem-estar, 0-28% Muito comprometido. | Score ≤ 28% (forte indicativo de depressão) |
| 23 | **ASRS-C** | ASRS-Criança e Adolescente | TDAH infantojuvenil (< 18 anos) | 0-15 Negativo, 16-24 Limítrofe, 25-48 Rastreio positivo. | Avaliação combinada com responsáveis |
| 24 | **SNAP-IV** | Swanson, Nolan and Pelham | TDAH e Transtorno Opositor Desafiador | Desatenção (1-9), Hiperatividade (10-18) e Oposição (19-26). | Sintomas em ambiente escolar e familiar |
| 25 | **CGI-S** | Clinical Global Impressions (Paciente) | Gravidade global percebida | 1-2 Normal/Limítrofe, 3 Leve, 4 Moderado, 5 Acentuado, 6-7 Severo/Extremo. | Score ≥ 6 (sofrimento psíquico incapacitante) |
| 26 | **WSAS** | Work and Social Adjustment Scale | Prejuízo funcional e impacto social | 0-9 Mínimo, 10-20 Prejuízo significativo, 21-40 Prejuízo severo/incapacitante. | Incapacidade laboral ou social severa |
| 27 | **PHQ-2 + GAD-2** | Screeners Ultrarrápidos | Rastreio inicial ultra-breve (~1 minuto) | PHQ-2 ≥ 3 dispara expansão para PHQ-9; GAD-2 ≥ 3 dispara expansão para GAD-7. | Gatilho para bateria diagnóstica |
| 28 | **RISK-COMPOSITE** | Risk Composite (Engine Interna) | Sinais agregados de risco psiquiátrico imediato | Alerta integrado: ideação suicida, psicose, virada maníaca, violência, gravidez. | Score ≥ 1 aciona prioridade máxima na fila |

---

## 2. A Árvore de Decisão Adaptativa (`triage-tree.ts`)

A jornada do paciente é dividida em 3 fases puras:

### Fase 1: Identificação e Queixas Iniciais
- Nome, Idade, Tipo de respondente (`'paciente'` ou `'familiar'`).
- Seleção de queixas subjetivas (tristeza, ansiedade, atenção, sono, substâncias, trauma, oscilação de humor, pensamentos de morte, trabalho, etc.).

### Fase 2: Rastreio Ultra-Rápido (PHQ-2 + GAD-2)
- Se o **PHQ-2** for positivo (≥ 3), o motor injeta automaticamente os 9 itens completos do **PHQ-9**.
- Se o **GAD-2** for positivo (≥ 3), o motor expande para o **GAD-7** completo.

### Fase 3: Ramificação Adaptativa Especializada
- **Gatilho Bipolar (MDQ):** Ativado por queixa de oscilação de humor ou quando o PHQ-9 atinge faixa moderada/grave, prevenindo o erro médico comum de prescrever antidepressivo sem investigar histórico hipomaníaco.
- **Gatilho de TDAH (ASRS-18 ou ASRS-C):** Acionado por idade (adultos recebem ASRS-18; menores de 18 anos recebem ASRS-C / SNAP-IV).
- **Gatilho de Risco (C-SSRS / CVV):** Se o item 9 do PHQ-9 for positivo ou se o C-SSRS for ativado, a via de risco prioritária é ligada imediatamente, apresentando acolhimento ao paciente (CVV 188 e SAMU 192) sem interromper a coleta dos dados.

---

## 3. Diretriz Ética: Rastreio vs. Diagnóstico

- **Nunca emitir diagnóstico conclusivo no documento do paciente:** O PDF do paciente contém apenas informações psicoeducativas, faixas de sintomas e acolhimento.
- **Relatório Médico (PDF Clínico):** Apresenta ao psiquiatra os escores brutos, subescalas calculadas, pontos de corte, histórico longitudinal e alertas de segurança.

---

## 4. Módulo de Psicoeducação (Curadoria Dr. Saraiva)

O TriagemPsi integra um motor de **Psicoeducação Clínica Híbrida** (`src/lib/psychoeducation.ts` e `src/lib/psychoeducation-data.ts`), alinhado à visão médica integrativa (Medicina de Família, Psiquiatria ABP, TCC, Dependência Química e Envelhecimento Humano):

### Os 10 Temas Oficiais e Gatilhos:
1. **Depressão e humor baixo (`depressao-humor`):** PHQ-9 ≥ 10 ou PHQ-2 ≥ 3.
2. **Ansiedade e preocupação excessiva (`ansiedade-preocupacao`):** GAD-7 ≥ 10 ou GAD-2 ≥ 3.
3. **Crise emocional e ideação suicida (`crise-emocional`):** PHQ-9 item 9 ≥ 1, C-SSRS positivo ou RISK-COMPOSITE (Prioridade 1 Máxima + CVV 188 / SAMU 192).
4. **Insônia e higiene do sono (`insonia-sono`):** ISI ≥ 15 (Pilares da TCC-I).
5. **TDAH em adultos (`tdah-adultos`):** ASRS-18 Parte A positiva (Funções executivas e externalização).
6. **Oscilações de humor (`oscilacoes-humor`):** MDQ positivo (Espectro bipolar e ritmos circadianos).
7. **Álcool e substâncias (`alcool-substancias`):** AUDIT ≥ 8, DAST-10 ≥ 3 ou CRAFFT ≥ 2 (Redução progressiva de danos).
8. **Trauma e estresse pós-traumático (`trauma-tept`):** PCL-5 ≥ 31-33 (Neurobiologia do trauma e TCC focada).
9. **Burnout e esgotamento (`burnout-esgotamento`):** MBI-HSS elevado ou PSS-10 ≥ 27 (3 dimensões do esgotamento).
10. **Bem-estar e prevenção + Longevidade (`bem-estar-prevencao`):** WHO-5 ≤ 50% ou sempre disponível (Psicodinâmica do envelhecimento e hábitos protetores).

### Os 4 Pontos de Entrega:
- **Cards na Triagem:** Apresentados na tela de conclusão do paciente com linguagem acolhedora, botões diretos de ligação rápida para o CVV 188 e SAMU 192, e acordeão de leitura.
- **PDF do Paciente:** Resumo objetivo impresso sem emissão de diagnósticos, incluindo o Plano de Segurança Estruturado com destaque e a marcação de versão `v1 (2026.1)`.
- **Portal do Paciente:** Biblioteca filtrável por busca e tags (`#TCC`, `#Sono`, `#Humor`, etc.), status de leitura ("Lido em DD/MM/AAAA" vs "Novo") e Plano de Segurança integrado.
- **Painel do Médico:** Painel completo de Apoio à Decisão Clínica (Decision Support) com condutas orientativas, métricas de engajamento do paciente (percentual de materiais lidos e data do último acesso) e liberação de materiais complementares.

---

## 5. Evolução do Módulo de Psicoeducação e Apoio Clínico

### 5.1 Plano de Segurança Estruturado (Feature A)
Desenvolvido sob rigorosas diretrizes éticas e de proteção à vida (CVV 188 / SAMU 192 / Portarias MS), o Plano de Segurança Estruturado (`src/lib/safety-plan.ts`) é acionado preventivamente em qualquer situação de crise (PHQ-9 item 9 ≥ 1, C-SSRS positivo, RISK-COMPOSITE ou via de risco):

1. **Canais Gratuitos de Urgência 24 Horas:**
   - **CVV (Centro de Valorização da Vida):** Ligue 188 (24h, gratuito, sigiloso em todo o Brasil).
   - **SAMU (Serviço de Atendimento Móvel de Urgência):** Ligue 192 para resgate pré-hospitalar e crise aguda descompensada.
   - **UPA / Pronto-Socorro / CAPS III 24h:** Acolhimento presencial na rede de urgência municipal.
2. **Rede de Apoio e Mensagem-Modelo:**
   - Instrução de acionamento de 1 ou 2 pessoas de confiança.
   - Mensagem-modelo de WhatsApp pronta: *"Olá, estou passando por um momento difícil e tendo pensamentos muito pesados agora. Você poderia falar comigo ou me fazer companhia por um tempo?"*
3. **Estratégias Imediatas de Distração e Descompressão:**
   - **Aterramento Sensorial (Grounding 5-4-3-2-1):** 5 objetos visíveis, 4 texturas táteis, 3 sons perceptíveis, 2 aromas, 1 sabor.
   - **Respiração Ritmada Calmante (4-4-6):** Inspiração em 4s, retenção em 4s, expiração lenta em 6s (5 ciclos para induzir relaxamento vagal).
4. **Segurança do Ambiente e Remoção de Meios:**
   - Abafar impulso de isolamento físico em quartos fechados.
   - Afastamento imediato de medicamentos em quantidade, bebidas alcoólicas e objetos perfurocortantes.
   - Transferência da custódia de itens e remédios para pessoa de confiança.

### 5.2 Apoio à Decisão Clínica do Médico (Clinical Decision Support - Feature B)
O motor puro `src/lib/clinical-decision-support.ts` avalia as interações entre as 28 escalas e gera cards de orientação diagnóstica e terapêutica orientativos no painel do psiquiatra:

- **Risco Suicida / Crise Aguda (Urgente):** Protocolo imediato de contenção, revisão do plano conjunto e averiguação de encaminhamento a pronto-socorro / CAPS III.
- **Espectro Bipolar e Risco de Virada Maníaca (Alerta):** MDQ positivo com sintomas depressivos (PHQ-9). Alerta contra o uso de antidepressivos em monoterapia devido ao risco de ciclagem e hipomania; recomendação de estabilizadores de humor (Diretrizes CANMAT / ISBD).
- **Comorbidade Depressão + Insônia Clínica Grave (Alerta):** PHQ-9 ≥ 10 + ISI ≥ 15. Recomendação de TCC-I concomitante ao manejo do humor, evitando escalada precoce de benzodiazepínicos com risco de dependência e fragmentação da arquitetura do sono (Diretrizes AASM).
- **Uso Problemático de Substâncias com Sintomas Afetivos (Alerta):** AUDIT ≥ 8 ou DAST-10 ≥ 3 com PHQ-9 / GAD-7 elevados. Aplicação de Intervenção Breve no modelo FRAMES (Feedback, Responsabilidade, Aconselhamento, Menu de opções, Empatia, Autoeficácia), mapeamento de risco de abstinência e redução de danos.
- **Diagnóstico Diferencial: TDAH vs. Hiperativação Ansiosa (Orientativo):** ASRS-18 positivo + GAD-7 elevado. Cautela com estimulantes antes de investigar se os déficits executivos decorrem de ansiedade crônica ou se há início na infância prévio aos 12 anos.
- **Sintomas Pós-Traumáticos com Sono Fragmentado (Alerta):** PCL-5 ≥ 31 + ISI ≥ 15. Encaminhamento para psicoterapias focadas em trauma (TCC / EMDR); evitar dependência de BZDs.
- **Sobrecarga Ocupacional e Esgotamento (Burnout) (Orientativo):** MBI-HSS ≥ 28 ou PSS-10 ≥ 27. Reorganização de limites laborais, afastamento temporário orientado e suporte psicoterápico.
- **Promoção de Saúde Mental e Longevidade (Orientativo):** Triagens assintomáticas. Medicina do estilo de vida, sono regular, conexões sociais e longevidade digna.

### 5.3 Biblioteca Filtrável e Métricas de Engajamento (Features C, D e E)
- **Portal do Paciente:** Sistema de busca textual reativa, abas de leitura ("Todos", "Novos", "Lidos") e badges de tags (`#TCC`, `#Sono`, `#Humor`, etc.), com indicação de data de leitura e visualização de Plano de Segurança.
- **Painel do Médico:** Contador dinâmico de engajamento (*"X de Y materiais lidos pelo paciente — Z%"*), barra de progresso visual colorida e registro do horário do último acesso pelo paciente.
- **Versionamento de Conteúdo:** Todos os temas e entregas exibem a versão de publicação formal `v1 (2026.1)`.

