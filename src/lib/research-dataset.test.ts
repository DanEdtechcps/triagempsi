import { describe, expect, it } from "vitest";
import {
  ASSESSMENT_COLUMNS,
  ageBand,
  buildResearchDataset,
  coarseAgeBand,
  dictionaryCsv,
  pseudonym,
  sexCategory,
  toCsv,
  type RawAssessment,
} from "@/lib/research-dataset";

const CLINIC = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";

function make(i: number, over: Partial<RawAssessment> = {}): RawAssessment {
  return {
    id: `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`,
    clinic_id: CLINIC,
    created_at: "2026-10-06T12:00:00Z",
    respondent_age: 35,
    respondent_sex: "Feminino (cisgênero)",
    respondent_type: "paciente",
    symptom_path: ["tristeza"],
    risk_flags: [],
    summary: { engine_version: "motor-1", telemetry_records: [{ response_time_ms: 1200 }, { response_time_ms: 1800 }] },
    research_consent: true,
    research_consent_version: "TCLE-v1",
    scale_results: [
      { scale_code: "PHQ-2", score: 2, band_level: 0, risk: false, answers: { "1": 1, "2": 1 }, estimated_items: [] },
    ],
    outcome: { concordance: "concorda", risk_assessment: "risco_nao_confirmado", final_dx_icd10: ["F32.1"] },
    ...over,
  };
}
const OPTS = { salt: "sal-do-protocolo", k: 5, enabledClinicIds: new Set([CLINIC]) };

describe("helpers", () => {
  it("faixas etárias e generalização", () => {
    expect(ageBand(11)).toBe("0-11");
    expect(ageBand(12)).toBe("12-17");
    expect(ageBand(59)).toBe("45-59");
    expect(ageBand(90)).toBe("75+");
    expect(ageBand(null)).toBe("nao_informado");
    expect(coarseAgeBand("30-44")).toBe("18-59");
    expect(coarseAgeBand("75+")).toBe("60+");
  });
  it("sexo vira categoria, sem texto livre", () => {
    expect(sexCategory("Feminino (cisgênero)")).toBe("feminino_cis");
    expect(sexCategory("Masculino (cisgênero)")).toBe("masculino_cis");
    expect(sexCategory("Homem transgênero")).toBe("trans_nao_binario_outro");
    expect(sexCategory("Outra: qualquer coisa que identifique")).toBe("trans_nao_binario_outro");
    expect(sexCategory("Prefiro não informar")).toBe("nao_informado");
    expect(sexCategory(null)).toBe("nao_informado");
  });
  it("pseudônimo é estável com o mesmo sal e muda com outro sal", async () => {
    const a = await pseudonym("s1", "x");
    expect(a).toHaveLength(16);
    expect(await pseudonym("s1", "x")).toBe(a);
    expect(await pseudonym("s2", "x")).not.toBe(a);
    expect(a).not.toContain("x");
  });
});

describe("buildResearchDataset", () => {
  it("só inclui triagens com consentimento e de clínica habilitada", async () => {
    const rows = [
      ...Array.from({ length: 6 }, (_, i) => make(i)),
      make(100, { research_consent: false }),
      make(101, { clinic_id: OTHER }),
    ];
    const ds = await buildResearchDataset(rows, OPTS);
    expect(ds.manifest.included).toBe(6);
    expect(ds.manifest.excluded_no_consent).toBe(1);
    expect(ds.manifest.excluded_clinic_not_enabled).toBe(1);
    expect(ds.scales).toHaveLength(6);
  });

  it("não vaza nenhum identificador nem texto livre", async () => {
    const rows = Array.from({ length: 6 }, (_, i) =>
      make(i, {
        // campos que NÃO devem sair, caso o chamador os envie por engano
        ...({ respondent_name: "Maria Silva", respondent_email: "maria@x.com", main_complaint: "dor", consent_ip: "1.2.3.4" } as object),
      }),
    );
    const ds = await buildResearchDataset(rows, OPTS);
    const blob = JSON.stringify(ds) + toCsv(ds.assessments, ASSESSMENT_COLUMNS);
    for (const needle of ["Maria", "maria@x.com", "dor", "1.2.3.4", CLINIC, "00000000-0000"]) {
      expect(blob).not.toContain(needle);
    }
    expect(Object.keys(ds.assessments[0]).sort()).toEqual([...ASSESSMENT_COLUMNS].sort());
  });

  it("k-anonimato: célula pequena é generalizada e, se continuar pequena, suprimida", async () => {
    // 5 pessoas iguais + 1 única (30-44, masculino, outro mês) → a única é generalizada e depois suprimida
    const base = Array.from({ length: 5 }, (_, i) => make(i));
    const solo = make(50, { respondent_age: 70, respondent_sex: "Masculino (cisgênero)", created_at: "2026-03-01T00:00:00Z" });
    const ds = await buildResearchDataset([...base, solo], OPTS);
    expect(ds.manifest.included).toBe(5);
    expect(ds.manifest.suppressed).toBe(1);
    expect(ds.assessments.every((a) => a.age_band === "30-44")).toBe(true);
  });

  it("generaliza o mês para o ano quando isso resolve a célula", async () => {
    const rows = [
      ...Array.from({ length: 3 }, (_, i) => make(i, { created_at: "2026-09-10T00:00:00Z" })),
      ...Array.from({ length: 3 }, (_, i) => make(10 + i, { created_at: "2026-10-10T00:00:00Z" })),
    ];
    const ds = await buildResearchDataset(rows, OPTS);
    expect(ds.manifest.included).toBe(6);
    expect(ds.manifest.generalized_period).toBe(6);
    expect(ds.assessments.every((a) => a.period === "2026")).toBe(true);
  });

  it("telemetria vira mediana; desfecho e versão do motor entram", async () => {
    const ds = await buildResearchDataset(Array.from({ length: 5 }, (_, i) => make(i)), OPTS);
    const a = ds.assessments[0];
    expect(a.telemetry_available).toBe(true);
    expect(a.median_item_time_ms).toBe(1500);
    expect(a.outcome_dx_icd10).toBe("F32.1");
    expect(a.engine_version).toBe("motor-1");
    expect(a.consent_version).toBe("TCLE-v1");
  });

  it("sem desfecho e sem telemetria não inventa valores", async () => {
    const ds = await buildResearchDataset(
      Array.from({ length: 5 }, (_, i) => make(i, { outcome: null, summary: {} })),
      OPTS,
    );
    expect(ds.assessments[0].outcome_concordance).toBe("sem_desfecho");
    expect(ds.assessments[0].median_item_time_ms).toBeNull();
    expect(ds.assessments[0].engine_version).toBe("desconhecida");
  });
});

describe("csv e dicionário", () => {
  it("escapa vírgulas, aspas e quebras de linha", () => {
    const csv = toCsv([{ a: 'x,"y"', b: "l1\nl2" }], ["a", "b"]);
    expect(csv).toBe('a,b\r\n"x,""y""","l1\nl2"\r\n');
  });
  it("o dicionário cobre todas as colunas de triagens", () => {
    const dict = dictionaryCsv();
    for (const c of ASSESSMENT_COLUMNS) expect(dict).toContain(`triagens.csv,${c},`);
  });
});
