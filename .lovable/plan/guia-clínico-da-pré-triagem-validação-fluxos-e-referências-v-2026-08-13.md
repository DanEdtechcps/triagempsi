# Guia Clínico da Pré-Triagem — validação, fluxos e referências (v1.18.0)

## Entregas

1. **Página interna no painel** (`/referencias`): guia vivo, gerado a partir dos dados reais do sistema (escalas, árvore de decisão, regras) — nunca fica desatualizado.
2. **Documento PDF + DOCX** em /mnt/documents para distribuir aos médicos (mesmo conteúdo, formato consolidado).

## Conteúdo do guia

### 1. Arquitetura da triagem (como funciona)
- Catálogo: **24 escalas ativas** + 3 estruturais (GHQ-12, BDI-II, ASRS-18 aguardando curadoria/licença).
- **17 portas de entrada** (queixas iniciais), **4 faixas etárias** (criança 5–11, adolescente 12–17, adulto 18–59, idoso 60+).
- **31 regras de escalonamento** por escore — triagem em dois estágios (rastreio breve → instrumento completo), padrão ouro em screening.

### 2. Acuidade e validação (a pergunta central)
Tabela por escala: condição rastreada · ponto de corte · sensibilidade/especificidade · referência original · validação brasileira. Pesquisa web de evidências já em andamento; base inicial bem estabelecida na literatura:
- PHQ-9 (Kroenke 2001; validação BR: Bergerot 2014 / Santos 2013)
- GAD-7 (Spitzer 2006; BR: Bergerot 2014)
- AUDIT/AUDIT-C (OMS; BR: Lima 2005), ASSIST (OMS/WHO ASSIST Working Group 2002)
- PGSI (Ferris & Wynne 2001), OCI-R (Foa 2002), MDQ (Hirschfeld 2000)
- EPDS (Cox 1987; BR: Santos 1999), SCOFF (Morgan 1999), ISI (Bastien 2001)
- AQ-10 (Allison 2012), AD-8 (Galvin 2005; BR: Correia 2011)
- SRQ-20 (OMS; BR: Santos/Araújo 2009), GDS-15 (Yesavage; BR: Paradela 2005)
- ASQ (Horowitz 2012), CAGE (Ewing 1984), FTND (Heatherton 1991; BR: Carmo 2007)
- COPSOQ-BR / NR-1 (riscos psicossociais ocupacionais)
- Seção honesta de **limitações**: rastreio ≠ diagnóstico; trade-off sensibilidade/especificidade; papel do parecer médico como confirmador.

### 3. Fluxos exemplificados por especialidade
Passo a passo com os caminhos reais da árvore (simulados do código):
- **Adulto — depressão**: tristeza → PHQ-2 → (≥3) PHQ-9 → (item 9 > 0) ASQ → parecer
- **Adulto — substâncias**: ASSIST-Lite com ramificação → álcool ≥2 → AUDIT; tabaco ≥1 → FTND; alto risco → PHQ-2
- **Jogos/bets**: PGSI → ≥3 PHQ-2+GAD-2 → ≥8 ASQ
- **Infantojuvenil**: atenção (criança) → SNAP-IV; adolescente → RISCO-ADO
- **Geriatria**: memória → AD-8 + GDS-15
- **Perinatal**: gestante/puérpera → EPDS → escalonamento por escore
- **Ocupacional (NR-1)**: sofrimento no trabalho → COPSOQ-BR (relatório coletivo)

### 4. Mapa de patologias rastreáveis
Tabela das **~20 condições** que a pré-triagem indica, com CID-10: depressão (F32/F33), TAG (F41.1), risco de suicídio, TOC (F42), TEPT (F43.1), sintomas somáticos (F45), bipolaridade (F31), uso de álcool (F10) e outras 6 classes de substâncias (F11–F19), nicotina (F17), jogo patológico (F63.0), transtornos alimentares (F50), insônia (F51/G47), depressão perinatal (F53), TDAH infantil e adulto (F90), espectro autista (F84), declínio cognitivo (F00–F03), depressão no idoso, sofrimento psíquico geral e riscos psicossociais ocupacionais.

### 5. Qualidade de dados para pesquisa (somente documentação)
Propostas detalhadas para implementação futura, com justificativa metodológica e LGPD/ética (CAAE):
- Diagnóstico final (CID-10) no parecer médico → mede acuidade real do serviço (concordância triagem × diagnóstico)
- Campos sociodemográficos opcionais (escolaridade, ocupação, UF, tempo de sintomas)
- Métricas de qualidade do respondente: tempo por item, abandono por tela, detecção de resposta reta (straight-lining)
- Consentimento específico para pesquisa; dataset anonimizado (CSV/FHIR) com dicionário de dados

## Implementação técnica
- `src/config/scale-evidence.ts` — base curada de evidências (escala → corte, sensibilidade, especificidade, referências); dados estáticos versionados.
- `src/routes/_authenticated/referencias.tsx` — página com PainelShell: tabela de acuidade, fluxos por especialidade, mapa de patologias, seção de pesquisa. Link em /materiais e /ajuda.
- Teste de consistência: toda escala ativa deve ter entrada na tabela de evidências (evita guia desatualizado).
- Documento: geração de PDF + DOCX em /mnt/documents com o mesmo conteúdo; QA visual página a página antes de entregar.
- Registro no roadmap via `node scripts/roadmap-add.mjs` (v1.18.0, pendente de aprovação).

## Observação
O enriquecimento do PGSI (LOINC/CID-10 no FHIR + descrições de faixa) do plano anterior fica como pendente separado — retomo quando você quiser.
