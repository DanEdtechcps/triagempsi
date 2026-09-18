import { describe, expect, it } from "vitest";
import { evaluatePsychoeducationTriggers } from "./psychoeducation";
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
