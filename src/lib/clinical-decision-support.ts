/**
 * Motor de Apoio à Decisão Clínica (Clinical Decision Support) - TriagemPsi
 * Gera recomendações diagnósticas, diferenciais e de conduta terapêutica para o médico/psiquiatra
 * com base na combinação de escores das 28 escalas.
 *
 * Estritamente orientativo (Decision Support): não substitui o julgamento clínico soberano.
 */

export interface ClinicalDecisionItem {
  id: string;
  title: string;
  level: "urgente" | "alerta" | "orientativo";
  rationale: string;
  clinical_guidance: string;
  suggested_actions: string[];
  evidence_basis: string;
}

export function getClinicalDecisionSupport(
  scaleResults: Array<{
    scale_code: string;
    score?: number | null;
    band?: string | null;
    band_level?: number | null;
    risk?: boolean;
    answers?: Record<string, number>;
  }>,
  options?: {
    riskPathway?: boolean;
  },
): ClinicalDecisionItem[] {
  const mapResults = new Map(
    scaleResults.map((r) => [r.scale_code.toUpperCase(), r]),
  );
  const items: ClinicalDecisionItem[] = [];

  const phq9 = mapResults.get("PHQ-9");
  const cssrs = mapResults.get("C-SSRS");
  const riskComp = mapResults.get("RISK-COMPOSITE");
  const gad7 = mapResults.get("GAD-7");
  const isi = mapResults.get("ISI");
  const mdq = mapResults.get("MDQ");
  const asrs = mapResults.get("ASRS-18");
  const audit = mapResults.get("AUDIT");
  const dast = mapResults.get("DAST-10");
  const crafft = mapResults.get("CRAFFT");
  const pcl5 = mapResults.get("PCL-5");
  const mbi = mapResults.get("MBI-HSS");
  const pss = mapResults.get("PSS-10");
  const who5 = mapResults.get("WHO-5");

  const hasItem9 = phq9?.answers && Number(phq9.answers["9"]) >= 1;
  const hasCssrsRisk = cssrs && (cssrs.risk || (cssrs.score ?? 0) >= 1);
  const hasCompositeRisk = riskComp && (riskComp.risk || (riskComp.score ?? 0) >= 1);

  // 1. Urgência: Risco de Suicídio / Crise Aguda
  if (options?.riskPathway || hasItem9 || hasCssrsRisk || hasCompositeRisk) {
    const triggers: string[] = [];
    if (hasItem9) triggers.push("PHQ-9 item 9 positivo");
    if (hasCssrsRisk) triggers.push(`C-SSRS escore ${cssrs?.score}`);
    if (hasCompositeRisk) triggers.push("Composto de risco positivo");

    items.push({
      id: "urgencia-suicidio",
      title: "Risco de Ideação/Comportamento Suicida Sinalizado",
      level: "urgente",
      rationale: `Gatilho de risco acionado (${triggers.join(", ") || "Via de acolhimento ativa"}).`,
      clinical_guidance:
        "Necessária investigação imediata de intencionalidade, planejamento e letalidade. Revisar o Plano de Segurança Estruturado com o paciente e familiar acompanhante. Avaliar suporte de emergência hospitalar se risco iminente.",
      suggested_actions: [
        "Revisar o Plano de Segurança Estruturado e os canais de emergência (CVV 188 / SAMU 192).",
        "Garantir a remoção preventiva de meios letais no domicílio em conjunto com acompanhante.",
        "Avaliar necessidade de encaminhamento presencial urgente a pronto-socorro / CAPS III.",
        "Não liberar o paciente sem rede de suporte presencial confirmada se risco alto.",
      ],
      evidence_basis: "Diretrizes ABP / CFM de Manejo do Comportamento Suicida e Protocolo C-SSRS.",
    });
  }

  // 2. Alerta: Espectro Bipolar e Risco de Virada Maníaca
  const mdqPositive =
    mdq &&
    ((mdq.score ?? 0) >= 7 || (mdq.band ?? "").toLowerCase().includes("positivo"));
  const phq9Elevated = (phq9 && (phq9.score ?? 0) >= 10);

  if (mdqPositive && phq9Elevated) {
    items.push({
      id: "bipolar-virada-antidepressivo",
      title: "Alerta de Espectro Bipolar: Risco de Virada Maníaca",
      level: "alerta",
      rationale: `MDQ positivo (${mdq?.score} pontos) associado a sintomas depressivos moderados/graves (PHQ-9 = ${phq9?.score}).`,
      clinical_guidance:
        "Atenção crítica à prescrição de antidepressivos em monoterapia: risco elevado de deflagrar hipomania/mania, estados mistos ou ciclagem rápida. Considerar estabilizadores de humor ou antipsicóticos atípicos com evidência para depressão bipolar.",
      suggested_actions: [
        "Investigar histórico longitudinal minucioso de períodos de aceleração, insônia sem fadiga e impulsividade.",
        "Evitar monoterapia com ISRS/duais sem proteção prévia com estabilizador de humor.",
        "Orientar paciente e familiares sobre sinais precoces de aceleração psíquica.",
      ],
      evidence_basis: "Diretrizes CANMAT / ISBD para Manejo do Transtorno Bipolar.",
    });
  }

  // 3. Alerta: Comorbidade Depressão + Insônia Clínica Relevante
  const isiSevere = isi && (isi.score ?? 0) >= 15;
  if (phq9Elevated && isiSevere) {
    items.push({
      id: "depressao-insonia-tcci",
      title: "Comorbidade Depressão + Insônia Clínica Relevante",
      level: "alerta",
      rationale: `PHQ-9 elevado (${phq9?.score}) concomitante a insônia moderada a severa (ISI = ${isi?.score}).`,
      clinical_guidance:
        "A insônia residual é um dos maiores fatores de risco para recidiva depressiva e ideação suicida. Recomenda-se instituir TCC-I (controle de estímulos e restrição de sono) em paralelo ao tratamento do humor, evitando escalada precoce de benzodiazepínicos com risco de dependência.",
      suggested_actions: [
        "Introduzir princípios da TCC-I (horário fixo para despertar e controle de estímulos na cama).",
        "Considerar agentes com perfil sedativo e promotor de arquitetura do sono (ex: Trazodona, Mirtazapina) se farmacoterapia for indicada.",
        "Evitar benzodiazepínicos crônicos em idosos e adultos devido a déficits cognitivos e risco de quedas.",
      ],
      evidence_basis: "Consenso da Academia Americana de Medicina do Sono (AASM) e TCC-I.",
    });
  }

  // 4. Alerta: Uso de Substâncias com Sofrimento Psíquico
  const auditElevated = audit && (audit.score ?? 0) >= 8;
  const dastElevated = dast && (dast.score ?? 0) >= 3;
  const crafftElevated = crafft && (crafft.score ?? 0) >= 2;
  const gad7Elevated = gad7 && (gad7.score ?? 0) >= 10;

  if ((auditElevated || dastElevated || crafftElevated) && (phq9Elevated || gad7Elevated)) {
    const substances: string[] = [];
    if (auditElevated) substances.push(`Álcool (AUDIT ${audit?.score})`);
    if (dastElevated) substances.push(`Drogas (DAST-10 ${dast?.score})`);
    if (crafftElevated) substances.push(`Substâncias jovem (CRAFFT ${crafft?.score})`);

    items.push({
      id: "substancias-comorbidade",
      title: "Uso Problemático de Substâncias com Sintomas Afetivos",
      level: "alerta",
      rationale: `Escores elevados em substâncias (${substances.join(", ")}) em paciente com sintomas ansiosos ou depressivos.`,
      clinical_guidance:
        "Investigar se o consumo funciona como tentativa de automedicação para ansiedade, fobia social ou insônia. Aplicar princípios de Intervenção Breve (FRAMES) e Redução de Danos. Mapear gravidade do padrão de uso e histórico de abstinência.",
      suggested_actions: [
        "Aplicar Intervenção Breve no modelo FRAMES (Feedback, Responsabilidade, Aconselhamento, Menu de opções, Empatia, Autoeficácia).",
        "Rastrear sintomas de abstinência física prévia (tremores, sudorese, convulsões).",
        "Trabalhar metas realistas de redução gradual de danos sem estigmatização.",
      ],
      evidence_basis: "Protocolo OMS / ASSIST para Intervenção Breve e Redução de Danos.",
    });
  }

  // 5. Orientativo: TDAH vs. Hiperativação Ansiosa
  const asrsPositive =
    asrs &&
    ((asrs.band_level ?? 0) >= 2 || (asrs.band ?? "").toLowerCase().includes("positivo"));

  if (asrsPositive && gad7Elevated) {
    items.push({
      id: "tdah-ansiedade-diferencial",
      title: "Diagnóstico Diferencial: TDAH vs. Ansiedade Generalizada",
      level: "orientativo",
      rationale: `ASRS-18 positivo em paciente com ansiedade significativa (GAD-7 = ${gad7?.score}).`,
      clinical_guidance:
        "A ansiedade crônica gera déficits de memória de trabalho e concentração que mimetizam TDAH. Da mesma forma, o TDAH não tratado gera ansiedade secundária pela desorganização crônica. Recomenda-se investigar a cronologia na infância antes de iniciar estimulantes que possam exacerbar a ansiedade.",
      suggested_actions: [
        "Coletar histórico escolar e de infância com pais ou boletins para verificar início prévio aos 12 anos.",
        "Considerar estabilização prioritária do quadro ansioso antes de estimulantes dopaminérgicos.",
        "Prescrever técnicas comportamentais de externalização da rotina (listas, blocos de tempo visíveis).",
      ],
      evidence_basis: "Diretrizes da World Federation of ADHD e DSM-5-TR.",
    });
  }

  // 6. Alerta: Trauma com Sintomas do Sono
  const pcl5Elevated = pcl5 && (pcl5.score ?? 0) >= 31;
  if (pcl5Elevated && isiSevere) {
    items.push({
      id: "trauma-sono-tept",
      title: "Sintomas Pós-Traumáticos com Sono Fragmentado",
      level: "alerta",
      rationale: `PCL-5 elevado (${pcl5?.score}) com insônia grave (ISI = ${isi?.score}).`,
      clinical_guidance:
        "Frequente presença de pesadelos e hipervigilância noturna secundários a trauma. Evitar benzodiazepínicos de longo prazo, que prejudicam o reprocessamento cognitivo do trauma e têm risco de tolerância.",
      suggested_actions: [
        "Encaminhar para psicoterapia baseada em evidências focada em trauma (TCC / EMDR).",
        "Investigar pesadelos recorrentes e avaliar antagonistas alfa-1 (como prazosina) se indicado.",
        "Trabalhar estratégias de ancoragem de segurança física no quarto e na rotina noturna.",
      ],
      evidence_basis: "Diretrizes APA e VA/DoD para Manejo do Transtorno de Estresse Pós-Traumático.",
    });
  }

  // 7. Orientativo: Esgotamento Ocupacional / Burnout
  const mbiHigh = mbi && (mbi.score ?? 0) >= 28;
  const pssHigh = pss && (pss.score ?? 0) >= 27;
  if (mbiHigh || pssHigh) {
    items.push({
      id: "burnout-trabalho",
      title: "Sobrecarga Ocupacional e Esgotamento (Burnout)",
      level: "orientativo",
      rationale: `Marcadores de estresse elevado ou exaustão emocional (${mbiHigh ? `MBI = ${mbi?.score}` : `PSS-10 = ${pss?.score}`}).`,
      clinical_guidance:
        "Quadro caracterizado por exaustão, despersonalização e baixa eficácia ligada ao ambiente de trabalho ou cuidados. Exige abordagem que transcende a psicofarmacologia: reorganização de carga horária, redefinição de limites e eventual afastamento terapêutico temporário.",
      suggested_actions: [
        "Avaliar necessidade de atestado médico para afastamento breve e recuperação inicial.",
        "Orientar desligamento digital formal fora do expediente de trabalho.",
        "Reforçar apoio psicoterápico focado em assertividade e estabelecimento de limites.",
      ],
      evidence_basis: "Critérios CID-11 (QD85) e Síndrome de Burnout (MBI).",
    });
  }

  // 8. Orientativo: Saúde Mental Preventiva e Estilo de Vida
  if (items.length === 0) {
    items.push({
      id: "prevencao-longevidade",
      title: "Promoção de Saúde Mental e Longevidade Saudável",
      level: "orientativo",
      rationale: "Ausência de sinais clínicos de alarme ou transtornos psiquiátricos moderados a graves na triagem.",
      clinical_guidance:
        "Paciente em rastreio favorável. Momento oportuno para medicina do estilo de vida, fortalecimento de fatores de proteção, higiene circadiana e cultivo de conexões sociais significativas.",
      suggested_actions: [
        "Incentivar a prática de exercícios físicos regulares (estímulo a BDNF e neurogênese).",
        "Reforçar a importância de hábitos regulares de sono e exposição solar matinal.",
        "Disponibilizar material de psicoeducação sobre bem-estar e longevidade.",
      ],
      evidence_basis: "Medicina do Estilo de Vida e Diretrizes de Promoção da Saúde Mental OMS.",
    });
  }

  return items;
}
