# 03. Motor Clínico, Escalas Psiquiátricas e Inteligência Adaptativa

> **Saraiva Clínica de Psiquiatria** & **Instituto Lumina de Saúde Mental**  
> **Dr. José Ribamar Fernandes Saraiva Junior** | CRM-RS 29349 · RQE 30038  
> **Versão do Motor Clínico:** v1.30.0 (Isolated Clinical Engine)

---

## 1. Visão Geral da Arquitetura Clínica

O motor clínico do **TriagemPsi** foi projetado para operar com **zero acoplamento com a interface do usuário (UI)**. Localizado em [`src/lib/clinical-engine/`](file:///mnt/armazenamento/Projetos/triagem-medica/src/lib/clinical-engine/) e complementado por [`src/lib/scoring.ts`](file:///mnt/armazenamento/Projetos/triagem-medica/src/lib/scoring.ts), ele executa funções determinísticas puras, garantindo:

1. **Rigor Psicométrico:** Instrumentos internacionais validados (DSM-5, OMS, CID-11).
2. **Eficiência Adaptativa:** O paciente não responde perguntas desnecessárias; árvores reativas (DAG) e Teoria de Resposta ao Item (TRI/CAT) selecionam apenas itens informativos.
3. **Detecção Comportamental Fina (Dwell-Time):** Monitoramento de milissegundos de hesitação em itens sensíveis de risco.
4. **Isolamento e Segurança Multi-Tenant:** Contexto de execução selado contra vazamento entre clínicas.
5. **Apoio à Decisão Médica (Decision Support):** Tradução dos escores brutos em condutas orientativas práticas para o psiquiatra.

---

## 2. As 28 Escalas Psiquiátricas Catalogadas

| # | Código | Nome Completo | Alvo Clínico | Cut-offs / Bandas Principais | Flag de Risco |
|---|---|---|---|---|---|
| 1 | **PHQ-9** | Patient Health Questionnaire-9 | Depressão maior | 0-4 Mínima, 5-9 Leve, 10-14 Moderada, 15-19 Mod. Grave, 20-27 Grave. | Item 9 ≥ 1 (ideação suicida) |
| 2 | **GAD-7** | Generalized Anxiety Disorder-7 | Ansiedade generalizada | 0-4 Mínima, 5-9 Leve, 10-14 Moderada, 15-21 Grave. | Score ≥ 15 (ansiedade severa) |
| 3 | **ASRS-18** | Adult ADHD Self-Report Scale | TDAH em adultos (Partes A + B) | Parte A ≥ 4 itens frequentes = positivo; subtotais de desatenção e hiperatividade. | Atenção para diagnóstico diferencial |
| 4 | **MDQ** | Mood Disorder Questionnaire | Espectro bipolar / hipomania | ≥ 7 sintomas simultâneos com prejuízo moderado/grave = positivo. | Risco crítico de virada com antidepressivo |
| 5 | **ISI** | Insomnia Severity Index | Gravidade da insônia | 0-7 Normal, 8-14 Subclínica, 15-21 Moderada, 22-28 Grave. | Amplificador de ideação e desregulação |
| 6 | **AUDIT** | Alcohol Use Disorders Identification | Padrão de consumo alcoólico | 0-7 Baixo risco, 8-15 Uso de risco, 16-19 Uso nocivo, ≥ 20 Provável dependência. | Score ≥ 20 (dependência severa) |
| 7 | **DAST-10** | Drug Abuse Screening Test | Uso nocivo de substâncias ilícitas | 0 Sem problemas, 1-2 Baixo, 3-5 Moderado, 6-8 Substancial, 9-10 Grave. | Score ≥ 6 (risco substancial/grave) |
| 8 | **C-SSRS** | Columbia Suicide Severity Rating Scale | Avaliação e gravidade de risco de suicídio | 0 Inexistente, 1-2 Passiva, 3 Ativa sem método, 4-6 Crítica / Iminente. | Qualquer resposta positiva ativa via de crise |
| 9 | **Y-BOCS** | Yale-Brown Obsessive Compulsive Scale | Sintomas obsessivo-compulsivos (TOC) | 0-7 Subclínico, 8-15 Leve, 16-23 Moderado, 24-31 Grave, 32-40 Extremo. | Angústia severa e prejuízo de tempo |
| 10 | **PCL-5** | PTSD Checklist for DSM-5 | Estresse pós-traumático (TEPT) | 0-30 Negativo, 31-80 TEPT provável (cut-off clínico ≥ 31-33). | Score ≥ 33 ou flashbacks incapacitantes |
| 11 | **EPDS** | Edinburgh Postnatal Depression Scale | Depressão perinatal / pós-parto | 0-9 Normal, 10-12 Sintomas possíveis, 13-30 Rastreio positivo. | Item 10 ≥ 1 (pensamento de autolesão) |
| 12 | **AQ-10** | Autism Spectrum Quotient-10 | Traços do espectro autista em adultos | 0-5 Negativo, 6-10 Rastreio positivo indicativo de avaliação especializada. | Encaminhamento para neuropsicologia |
| 13 | **SPIN** | Social Phobia Inventory | Ansiedade social e fobia social | 0-19 Subclínico, 20-30 Leve, 31-40 Moderada, 41-50 Grave, 51-68 Muito grave. | Prejuízo acentuado de esquiva social |
| 14 | **PDSS-SR** | Panic Disorder Severity Scale | Pânico e agorafobia | 0-3 Normal, 4-7 Borderline, 8-10 Leve, 11-13 Moderado, 14-28 Grave. | Ataques recorrentes e esquiva |
| 15 | **BES** | Binge Eating Scale | Compulsão alimentar periódica | 0-17 Ausente, 18-26 Moderada, 27-48 Severa compulsão. | Perda de controle alimentar frequente |
| 16 | **PHQ-15** | Patient Health Questionnaire-15 | Somatização e queixas físicas | 0-4 Mínima, 5-9 Baixa, 10-14 Média, 15-30 Alta gravidade somática. | Sofrimento físico sem causa orgânica |
| 17 | **MBI-HSS** | Maslach Burnout Inventory | Esgotamento profissional / Burnout | Exaustão emocional, despersonalização e baixa realização profissional. | Score elevado (risco ocupacional NR-01) |
| 18 | **CRAFFT** | CRAFFT 2.1 Screening Tool | Substâncias em adolescentes (< 21 anos) | 0-1 Baixo risco, 2-6 Risco significativo de abuso/dependência. | Score ≥ 2 em jovens |
| 19 | **SCOFF** | SCOFF Questionnaire | Rastreio de transtornos alimentares | 0-1 Negativo, 2-5 Rastreio positivo para anorexia/bulimia. | Vômitos induzidos ou perda rápida de peso |
| 20 | **HADS** | Hospital Anxiety and Depression Scale | Ansiedade e depressão ambulatorial | Subescalas HADS-A e HADS-D: 0-7 Normal, 8-10 Limítrofe, 11-21 Provável. | Sintomatologia moderada a severa |
| 21 | **PSS-10** | Perceived Stress Scale-10 | Nível de estresse percebido | 0-13 Baixo estresse, 14-26 Estresse moderado, 27-40 Alto estresse. | Sobrecarga alostática crônica |
| 22 | **WHO-5** | WHO-5 Well-Being Index | Índice de bem-estar da OMS | 51-100% Adequado, 29-50% Baixo bem-estar, 0-28% Muito comprometido. | Score ≤ 28% (forte alerta depressivo) |
| 23 | **ASRS-C** | ASRS Criança e Adolescente | TDAH infantojuvenil (< 18 anos) | 0-15 Negativo, 16-24 Limítrofe, 25-48 Positivo. | Avaliação combinada com cuidadores |
| 24 | **SNAP-IV** | Swanson, Nolan and Pelham | TDAH e Transtorno Desafiador Opositor | Desatenção (1-9), Hiperatividade (10-18) e Oposição (19-26). | Sintomas no ambiente escolar e familiar |
| 25 | **CGI-S** | Clinical Global Impressions (Paciente) | Gravidade global subjetiva | 1-2 Normal/Limítrofe, 3 Leve, 4 Moderado, 5 Acentuado, 6-7 Severo/Extremo. | Score ≥ 6 (sofrimento incapacitante) |
| 26 | **WSAS** | Work and Social Adjustment Scale | Impacto e prejuízo funcional | 0-9 Mínimo, 10-20 Prejuízo significativo, 21-40 Prejuízo severo/incapacitante. | Incapacidade laboral ou relacional |
| 27 | **PHQ-2 + GAD-2** | Screeners Ultrarrápidos | Rastreio inicial ultra-breve | PHQ-2 ≥ 3 dispara PHQ-9; GAD-2 ≥ 3 dispara GAD-7. | Gatilho para expansão de escalas |
| 28 | **RISK-COMPOSITE** | Risk Composite (Engine Interna) | Agregador de emergência psiquiátrica | Ideação suicida ativa, sintomas psicóticos, virada maníaca, violência. | Ativa protocolo de emergência imediato |

---

## 3. O Motor Clínico Isolado (`src/lib/clinical-engine/`)

### 3.1 Schemas Declarativos em JSON (`schemas/`)
Cada instrumento clínico possui um schema JSON estruturado com validações de faixa, cut-offs psicométricos e regras de elegibilidade:
* **`epds.json`**: Contém a regra de elegibilidade biológica estrita:
  ```json
  "eligibility": {
    "gender": "female_only",
    "biologicalSexRequired": "female"
  }
  ```
* **`c-ssrs.json`**: Mapeia as 6 perguntas do Columbia com pesos de risco exponencial.
* **`phq9.json`**: Define as 9 perguntas do PHQ-9 e isola o item 9 como gatilho automático de risco.
* Demais schemas: `phq2`, `snap-iv`, `asrs-18`, `ad8`, `gds15`, `y-bocs`, `pcl-5`, `isi`, `mbi-hss`, `audit`, `assist`, `srq20`.

### 3.2 Avaliador Puro (`schema-evaluator.ts`)
Executa a validação psicométrica de qualquer schema sem tocar no banco ou na interface:
- **Trava Biológica EPDS:** Se o paciente for do sexo masculino (`biologicalSex === 'male'`), o avaliador rejeita a execução do EPDS e retorna inelegibilidade imediata com aviso seguro.
- **Cálculo de Bandas:** Mapeia pontuações brutas para faixas clínicas (`minimal`, `mild`, `moderate`, `severe`).
- **Detecção de Gatilho de Risco:** Identifica se itens críticos foram pontuados positivamente.

### 3.3 Grafo Reativo Acíclico Dirigido (`reactive-dag.ts` & `reactions.ts`)
Orquestra o avanço e desdobramento das escalas através de nós e arestas de decisão:
- **Prevenção de Deadlocks e Loops:** Utiliza busca em profundidade (**DFS — Depth-First Search**) para validar a aciclicidade do grafo no momento do registro das regras. Se um ciclo for detectado, um erro de integridade é lançado antes do processamento.
- **Reações Cruzadas Catalogadas (`reactions.ts`):**
  - `PHQ-2 >= 3` ➔ Dispara expansão para `PHQ-9`.
  - `GAD-2 >= 3` ➔ Dispara expansão para `GAD-7`.
  - `PHQ-9 item 9 >= 1` ➔ Dispara `C-SSRS` e aciona a Via de Risco Crítica.
  - `Idade >= 60 anos + Queixa de Memória` ➔ Aciona `AD-8` e `GDS-15`.
  - `Idade < 18 anos + Queixa Escolar/Atenção` ➔ Aciona `SNAP-IV` / `ASRS-C`.

### 3.4 Motor CAT/TRI (`cat-estimator.ts`) — Teste Adaptativo Computadorizado
Baseado na **Teoria de Resposta ao Item (TRI)** unidimensional politômica:
- **Modelo de Resposta Graduada de Samejima (GRM):** Modela a probabilidade de um paciente com traço latente $\theta$ responder a cada categoria ordinal de um item:
  $$P_{jk}(\theta) = P^*_{jk}(\theta) - P^*_{j,k+1}(\theta)$$
  Onde $P^*_{jk}(\theta) = \frac{1}{1 + e^{-a_j(\theta - b_{jk})}}$.
- **Seleção do Próximo Item:** O motor calcula a **Informação de Fisher** $I_j(\theta)$ para todos os itens ainda não respondidos e seleciona aquele que maximiza a informação no nível estimado atual de $\theta$:
  $$I_j(\theta) = \sum_{k=0}^{K} \frac{[P'_{jk}(\theta)]^2}{P_{jk}(\theta)}$$
- **Estimativa do Traço Latente:** Atualização bayesiana via **EAP (Expected A Posteriori)** com prior normal padrão $\mathcal{N}(0, 1)$.
- **Critério de Parada:** O teste é finalizado de forma inteligente quando o erro padrão atinge:
  $$SE(\theta) \le 0.30$$
  Ou quando atinge o teto máximo de itens configurado, economizando até 60% do tempo de resposta do paciente sem perda de precisão diagnóstica.

### 3.5 Telemetria de Dwell-Time (`dwell-time.ts`)
Analisa o padrão temporal de resposta do paciente:
- **Média vs. Mediana:** Registra a média aritmética e a mediana de tempo por item em milissegundos. A mediana é utilizada como linha de base robusta, ignorando pausas distrativas externas.
- **Detector de Hesitação Focal (Focal Hesitation Detector):** Se um item crítico de risco (ex: autolesão no PHQ-9, traumas no PCL-5, ideação no C-SSRS) apresentar tempo de permanência significativamente superior à linha de base do paciente:
  $$T_{item} \ge 2.5 \times \text{Mediana do Paciente}$$
  O motor sinaliza um alerta de hesitação focal (`focal_hesitation_alert: true`), indicando ao psiquiatra conflito interno, ambivalência ou sofrimento agudo durante a resposta daquele item.

### 3.6 Isolamento de Tenant (`tenant-context.ts`)
- O contexto da clínica é congelado em tempo de execução via `Object.freeze()`.
- O middleware rejeita requisições onde o `clinic_id` da avaliação divirja do tenant autenticado, impedindo vazamento de dados entre consultórios.

### 3.7 Comparador Sombra (`shadow-runner.ts`)
Permite executar o novo motor clínico em paralelo com o motor de pontuação legado sem afetar a experiência do usuário final, comparando divergências em logs estruturados para auditoria contínua.

---

## 4. Apoio à Decisão Clínica (Decision Support — Dr. Saraiva)

O motor em [`src/lib/clinical-decision-support.ts`](file:///mnt/armazenamento/Projetos/triagem-medica/src/lib/clinical-decision-support.ts) gera cartões de raciocínio médico no prontuário:
1. **Espectro Bipolar (MDQ Positivo + Depressão):** Alerta em vermelho contra o uso de antidepressivos em monoterapia devido ao risco iminente de virada maníaca, ciclagem rápida ou indução de estados mistos com ideação suicida.
2. **Insônia e Desregulação (ISI ≥ 15):** Recomenda priorizar intervenções de Higiene do Sono e TCC-I antes de escalar medicações hipnóticas de tarja preta.
3. **Substâncias (AUDIT / DAST-10):** Sugere a aplicação imediata da intervenção breve pelo modelo **FRAMES** (*Feedback, Responsibility, Advice, Menu of options, Empathy, Self-efficacy*).
4. **Trauma e Dissociação (PCL-5 ≥ 33):** Orienta acolhimento prévio, descompressão e encaminhamento para TCC focada em trauma, evitando exposição abrupta na primeira sessão.

---

## 5. Módulo de Psicoeducação e Gatilhos Clínicos

O sistema aciona automaticamente as trilhas educativas correspondentes ao perfil apurado:

```
[ Escores e Respostas ] ──► [ Avaliador Psicométrico ]
                                      │
           ┌──────────────────────────┴──────────────────────────┐
           ▼                                                     ▼
 [ Gatilhos de Psicoeducação ]                         [ Gatilhos de Risco ]
 1. Depressão (PHQ-9 >= 10)                           1. Item 9 PHQ-9 >= 1
 2. Ansiedade (GAD-7 >= 10)                           2. C-SSRS Positivo
 3. Sono / TCC-I (ISI >= 15)                          3. RISK-COMPOSITE
 4. Bipolaridade (MDQ Positivo)                                  │
 5. TDAH Adulto (ASRS-18 Positivo)                              ▼
 6. Substâncias (AUDIT >= 8 / DAST >= 3)              [ BANNER DE EMERGÊNCIA ]
 7. Burnout / NR-01 (MBI-HSS Positivo)                - Ativação imediata do CVV 188
 8. Trauma / TEPT (PCL-5 >= 31)                       - Chamada de emergência SAMU 192
 9. Longevidade / Bem-Estar (WHO-5 <= 50)             - Aterramento e descompressão
```
