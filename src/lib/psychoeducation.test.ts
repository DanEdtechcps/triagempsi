import { describe, expect, it } from "vitest";
import {
  evaluatePsychoeducationTriggers,
  isSafetyPlanTriggered,
  OFFICIAL_SAFETY_PLAN,
  getClinicalDecisionSupport,
} from "./psychoeducation";
import { OFFICIAL_PSYCHOEDUCATION_TOPICS } from "./psychoeducation-data";

describe("Módulo de Psicoeducação - Motor de Triggers", () => {
  it("contém os 10 temas oficiais com títulos e conteúdos válidos", () => {
    expect(OFFICIAL_PSYCHOEDUCATION_TOPICS.length).toBe(10);
    const slugs = OFFICIAL_PSYCHOEDUCATION_TOPICS.map((t) => t.slug);
    expect(slugs).toContain("depressao-humor");
    expect(slugs).toContain("ansiedade-preocupacao");
    expect(slugs).toContain("crise-emocional");
    expect(slugs).toContain("insonia-sono");
    expect(slugs).toContain("tdah-adultos");
    expect(slugs).toContain("oscilacoes-humor");
    expect(slugs).toContain("alcool-substancias");
    expect(slugs).toContain("trauma-tept");
    expect(slugs).toContain("burnout-esgotamento");
    expect(slugs).toContain("bem-estar-prevencao");
  });

  it("ativa 'crise-emocional' com prioridade máxima quando item 9 do PHQ-9 for positivo", () => {
    const results = [
      {
        scale_code: "PHQ-9",
        score: 12,
        band: "Depressão moderada",
        band_level: 2,
        risk: true,
        answers: { "9": 1 },
      },
    ];
    const recs = evaluatePsychoeducationTriggers(results);
    expect(recs.length).toBeGreaterThanOrEqual(2);
    expect(recs[0].topic.slug).toBe("crise-emocional");
    expect(recs[0].priority).toBe(1);
    expect(recs[0].trigger_reason).toContain("item 9");
  });

  it("ativa 'ansiedade-preocupacao' quando GAD-7 >= 10", () => {
    const results = [
      {
        scale_code: "GAD-7",
        score: 11,
        band: "Ansiedade moderada",
        band_level: 2,
        risk: false,
      },
    ];
    const recs = evaluatePsychoeducationTriggers(results);
    const slugs = recs.map((r) => r.topic.slug);
    expect(slugs).toContain("ansiedade-preocupacao");
  });

  it("ativa 'insonia-sono' quando ISI >= 15", () => {
    const results = [
      {
        scale_code: "ISI",
        score: 18,
        band: "Insônia moderada",
        band_level: 3,
        risk: false,
      },
    ];
    const recs = evaluatePsychoeducationTriggers(results);
    const slugs = recs.map((r) => r.topic.slug);
    expect(slugs).toContain("insonia-sono");
  });

  it("ativa 'alcool-substancias' para AUDIT, DAST-10 ou CRAFFT positivos", () => {
    const auditRes = evaluatePsychoeducationTriggers([
      { scale_code: "AUDIT", score: 9, band_level: 2 },
    ]);
    expect(auditRes.map((r) => r.topic.slug)).toContain("alcool-substancias");

    const dastRes = evaluatePsychoeducationTriggers([
      { scale_code: "DAST-10", score: 4, band_level: 2 },
    ]);
    expect(dastRes.map((r) => r.topic.slug)).toContain("alcool-substancias");
  });

  it("oferece 'bem-estar-prevencao' quando nenhuma escala ultrapassa o ponto de corte", () => {
    const results = [
      { scale_code: "PHQ-9", score: 2, band_level: 0, answers: { "9": 0 } },
      { scale_code: "GAD-7", score: 1, band_level: 0 },
    ];
    const recs = evaluatePsychoeducationTriggers(results);
    expect(recs.length).toBe(1);
    expect(recs[0].topic.slug).toBe("bem-estar-prevencao");
  });

  it("respeita overrides e desativação por clínica", () => {
    const results = [
      { scale_code: "ISI", score: 20, band_level: 3 },
    ];
    const recsDisabled = evaluatePsychoeducationTriggers(results, {
      clinicOverrides: {
        "insonia-sono": { is_enabled: false, auto_trigger: false },
      },
    });
    expect(recsDisabled.map((r) => r.topic.slug)).not.toContain("insonia-sono");
  });

  it("permite liberação manual com prioridade 0", () => {
    const results = [
      { scale_code: "PHQ-9", score: 2, band_level: 0, answers: { "9": 0 } },
    ];
    const recs = evaluatePsychoeducationTriggers(results, {
      manualSlugs: ["tdah-adultos"],
    });
    expect(recs[0].topic.slug).toBe("tdah-adultos");
    expect(recs[0].is_manual).toBe(true);
  });
});

describe("Módulo de Plano de Segurança Estruturado (Feature A)", () => {
  it("contém todos os elementos éticos obrigatórios (CVV 188, SAMU 192, 4 etapas)", () => {
    expect(OFFICIAL_SAFETY_PLAN.versao).toBe("v1 (2026.1)");
    expect(OFFICIAL_SAFETY_PLAN.contatos_emergencia.some((c) => c.numero === "188")).toBe(true);
    expect(OFFICIAL_SAFETY_PLAN.contatos_emergencia.some((c) => c.numero === "192")).toBe(true);
    expect(OFFICIAL_SAFETY_PLAN.rede_apoio.mensagem_modelo).toContain("pensamentos");
    expect(OFFICIAL_SAFETY_PLAN.estrategias_distracao.length).toBeGreaterThanOrEqual(2);
    expect(OFFICIAL_SAFETY_PLAN.seguranca_ambiente.orientacoes.length).toBeGreaterThanOrEqual(3);
  });

  it("dispara isSafetyPlanTriggered para PHQ-9 item 9 >= 1", () => {
    const triggered = isSafetyPlanTriggered({
      scaleResults: [
        { scale_code: "PHQ-9", score: 14, answers: { "9": 1 } },
      ],
    });
    expect(triggered).toBe(true);
  });

  it("dispara isSafetyPlanTriggered para C-SSRS positivo", () => {
    const triggered = isSafetyPlanTriggered({
      scaleResults: [
        { scale_code: "C-SSRS", score: 3, risk: true },
      ],
    });
    expect(triggered).toBe(true);
  });

  it("dispara isSafetyPlanTriggered para RISK-COMPOSITE ou via de risco", () => {
    expect(isSafetyPlanTriggered({ riskPathway: true })).toBe(true);
    expect(isSafetyPlanTriggered({ hasRiskFlags: true })).toBe(true);
    expect(
      isSafetyPlanTriggered({
        scaleResults: [{ scale_code: "RISK-COMPOSITE", score: 2, risk: true }],
      }),
    ).toBe(true);
  });

  it("não dispara isSafetyPlanTriggered para perfil assintomático ou depressão sem ideação", () => {
    const triggered = isSafetyPlanTriggered({
      scaleResults: [
        { scale_code: "PHQ-9", score: 12, answers: { "9": 0 } },
        { scale_code: "GAD-7", score: 14 },
      ],
    });
    expect(triggered).toBe(false);
  });
});

describe("Apoio à Decisão Clínica do Médico (Decision Support - Feature B)", () => {
  it("Caso 1: Paciente em crise (PHQ-9 item 9 + C-SSRS) gera alerta urgente com protocolo de segurança", () => {
    const cds = getClinicalDecisionSupport([
      { scale_code: "PHQ-9", score: 22, answers: { "9": 2 } },
      { scale_code: "C-SSRS", score: 4, risk: true },
    ]);
    const urgente = cds.find((c) => c.level === "urgente");
    expect(urgente).toBeDefined();
    expect(urgente?.title).toContain("Suicida");
    expect(urgente?.suggested_actions.some((a) => a.includes("188"))).toBe(true);
  });

  it("Caso 2: Depressão + Insônia Clínica Severa recomenda TCC-I concomitante", () => {
    const cds = getClinicalDecisionSupport([
      { scale_code: "PHQ-9", score: 16 },
      { scale_code: "ISI", score: 19 },
    ]);
    const ins = cds.find((c) => c.id === "depressao-insonia-tcci");
    expect(ins).toBeDefined();
    expect(ins?.level).toBe("alerta");
    expect(ins?.clinical_guidance).toContain("TCC-I");
  });

  it("Caso 3: Rastreio Bipolar Positivo (MDQ) com Depressão alerta sobre risco de virada maníaca", () => {
    const cds = getClinicalDecisionSupport([
      { scale_code: "MDQ", score: 8, band: "Rastreio Positivo" },
      { scale_code: "PHQ-9", score: 15 },
    ]);
    const bip = cds.find((c) => c.id === "bipolar-virada-antidepressivo");
    expect(bip).toBeDefined();
    expect(bip?.level).toBe("alerta");
    expect(bip?.clinical_guidance).toContain("monoterapia");
  });

  it("Caso 4: Uso problemático de substâncias (AUDIT) com sofrimento afetivo orienta FRAMES e redução de danos", () => {
    const cds = getClinicalDecisionSupport([
      { scale_code: "AUDIT", score: 14 },
      { scale_code: "GAD-7", score: 15 },
    ]);
    const sub = cds.find((c) => c.id === "substancias-comorbidade");
    expect(sub).toBeDefined();
    expect(sub?.level).toBe("alerta");
    expect(sub?.suggested_actions.some((a) => a.includes("FRAMES"))).toBe(true);
  });

  it("Caso 5: ASRS-18 positivo com ansiedade elevada sinaliza diagnóstico diferencial TDAH vs Ansiedade", () => {
    const cds = getClinicalDecisionSupport([
      { scale_code: "ASRS-18", band_level: 2, band: "Positivo" },
      { scale_code: "GAD-7", score: 12 },
    ]);
    const tdah = cds.find((c) => c.id === "tdah-ansiedade-diferencial");
    expect(tdah).toBeDefined();
    expect(tdah?.level).toBe("orientativo");
    expect(tdah?.clinical_guidance).toContain("ansiedade");
  });

  it("Caso 6: TEPT (PCL-5) com Insônia alerta sobre pesadelos e cautela com benzodiazepínicos", () => {
    const cds = getClinicalDecisionSupport([
      { scale_code: "PCL-5", score: 38 },
      { scale_code: "ISI", score: 18 },
    ]);
    const tept = cds.find((c) => c.id === "trauma-sono-tept");
    expect(tept).toBeDefined();
    expect(tept?.clinical_guidance).toContain("trauma");
  });

  it("Caso 7: Burnout (MBI-HSS ou PSS-10) orienta reorganização de limites e possível afastamento", () => {
    const cds = getClinicalDecisionSupport([
      { scale_code: "MBI-HSS", score: 32 },
    ]);
    const burn = cds.find((c) => c.id === "burnout-trabalho");
    expect(burn).toBeDefined();
    expect(burn?.clinical_guidance).toContain("exaustão");
  });

  it("Caso 8: Paciente assintomático recebe orientação de medicina do estilo de vida e longevidade", () => {
    const cds = getClinicalDecisionSupport([
      { scale_code: "PHQ-9", score: 1, answers: { "9": 0 } },
      { scale_code: "GAD-7", score: 2 },
      { scale_code: "WHO-5", score: 22 },
    ]);
    expect(cds.length).toBe(1);
    expect(cds[0].id).toBe("prevencao-longevidade");
    expect(cds[0].level).toBe("orientativo");
  });
});
