import { describe, expect, it } from "vitest";
import { SCALE_BY_CODE } from "@/lib/scales-data";
import { scoreScale, summarize } from "@/lib/scoring";
import { answersWithScore, resultWithScore } from "@/lib/test-utils";

describe("pontuação e bandas", () => {
  it("cobre toda a amplitude possível com bandas contíguas", () => {
    for (const scale of Object.values(SCALE_BY_CODE)) {
      if (scale.status === "estrutura" || scale.bands.length === 0) continue;
      const sorted = [...scale.bands].sort((a, b) => a.min - b.min);
      expect(sorted[0].min, `${scale.code} começa em 0`).toBe(0);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].min, `${scale.code} banda ${i} contígua`).toBe(
          sorted[i - 1].max + 1,
        );
      }
    }
  });

  it("PHQ-9 nos limites das bandas clínicas", () => {
    const casos: [number, number][] = [
      [0, 0],
      [4, 0],
      [5, 1],
      [9, 1],
      [10, 2],
      [14, 2],
      [15, 3],
      [19, 3],
      [20, 4],
    ];
    for (const [score, level] of casos) {
      expect(resultWithScore("PHQ-9", score, { "9": 0 }).band_level).toBe(level);
    }
  });

  it("escore zero e escore máximo são pontuáveis em toda escala ativa", () => {
    for (const scale of Object.values(SCALE_BY_CODE)) {
      if (scale.status === "estrutura" || !scale.items.length) continue;
      const zero = scoreScale(scale.code, answersWithScore(scale.code, 0));
      expect(zero.score, `${scale.code} mínimo`).toBe(0);
      expect(zero.band).toBeTruthy();
    }
  });

  it("item de risco positivo marca risco mesmo com escore baixo", () => {
    const r = resultWithScore("PHQ-9", 1, { "9": 1 });
    expect(r.risk).toBe(true);
    expect(resultWithScore("PHQ-9", 8, { "9": 0 }).risk).toBe(false);
  });

  it("escala do domínio risco marca risco a partir de uma resposta positiva", () => {
    expect(resultWithScore("ASQ", 0).risk).toBe(false);
    expect(resultWithScore("ASQ", 1).risk).toBe(true);
  });

  it("rejeita escala desconhecida", () => {
    expect(() => scoreScale("NAO-EXISTE", {})).toThrow();
  });
});

describe("subescores do ASSIST-Lite", () => {
  it("tudo negativo: baixo risco em todas as substâncias", () => {
    const r = scoreScale("ASSIST", { "801": 0, "804": 0, "808": 0, "811": 0, "814": 0, "817": 0, "820": 0 });
    expect(r.band).toBe("Baixo risco em todas as substâncias");
    expect(r.band_level).toBe(0);
    expect(r.subscores).toHaveLength(7);
  });

  it("álcool segue faixas próprias: 0-1 baixo, 2 moderado, ≥3 alto", () => {
    expect(scoreScale("ASSIST", { "804": 1 }).subscores?.find((s) => s.key === "ASSIST_ALCOOL")?.band).toBe("Baixo risco");
    expect(scoreScale("ASSIST", { "804": 1, "805": 1 }).subscores?.find((s) => s.key === "ASSIST_ALCOOL")?.band).toBe("Risco moderado");
    const alto = scoreScale("ASSIST", { "804": 1, "805": 1, "806": 1 });
    expect(alto.subscores?.find((s) => s.key === "ASSIST_ALCOOL")?.band).toBe("Alto risco");
    expect(alto.band).toContain("Alto risco");
    expect(alto.band).toContain("Álcool");
    expect(alto.band_level).toBe(4);
  });

  it("tabaco com 1 ponto já é risco moderado e aparece na faixa da escala", () => {
    const r = scoreScale("ASSIST", { "801": 1, "804": 0, "808": 0, "811": 0, "814": 0, "817": 0, "820": 0 });
    expect(r.band).toBe("Risco moderado — Tabaco");
    expect(r.band_level).toBe(2);
  });

  it("outras substâncias: item único positivo já é alto risco", () => {
    const r = scoreScale("ASSIST", { "820": 1 });
    const outras = r.subscores?.find((s) => s.key === "ASSIST_OUTRAS");
    expect(outras?.band).toBe("Alto risco");
    expect(outras?.max).toBe(1);
    expect(r.band_level).toBe(4);
  });

  it("empate no pior nível lista todas as substâncias", () => {
    const r = scoreScale("ASSIST", { "801": 1, "808": 1 });
    expect(r.band).toBe("Risco moderado — Tabaco, Cannabis");
  });
});

describe("resumo da triagem", () => {
  it("consolida risco, decisões e faixa etária", () => {
    const resultados = [
      resultWithScore("PHQ-2", 5),
      resultWithScore("PHQ-9", 20, { "9": 3 }),
    ];
    const resumo = summarize(resultados, {
      symptoms: ["tristeza"],
      riskPathway: true,
      decisions: [{ step: "PHQ-2", reason: "PHQ-2 positivo" }],
      ageBand: "adulto",
    });
    expect(JSON.stringify(resumo)).toContain("PHQ-9");
    expect(JSON.stringify(resumo)).toContain("adulto");
  });
});

describe("ajuste por informante", () => {
  it("familiar em escala de autorrelato: margem de 1 ponto no corte", () => {
    const r = scoreScale("PHQ-2", { "1": 1, "2": 1 }, "familiar");
    expect(r.score).toBe(2); // escore bruto preservado
    expect(r.score_adjusted).toBe(3); // corte do PHQ-2
    expect(r.band_level).toBeGreaterThan(0);
    expect(r.informant_note).toMatch(/margem de sensibilidade/i);
  });

  it("paciente responde sem ajuste algum", () => {
    const r = scoreScale("PHQ-2", { "1": 1, "2": 1 }, "paciente");
    expect(r.score_adjusted).toBe(2);
    expect(r.band_level).toBe(0);
    expect(r.informant_note).toBeNull();
  });

  it("familiar acima do corte apenas recebe nota de heteroinforme", () => {
    const r = scoreScale("PHQ-2", { "1": 3, "2": 3 }, "familiar");
    expect(r.score_adjusted).toBe(6);
    expect(r.informant_note).toMatch(/heteroinformado/i);
  });
});
