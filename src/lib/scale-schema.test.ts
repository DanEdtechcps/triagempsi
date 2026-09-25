import { describe, expect, it } from "vitest";
import { ALL_SCALES, SCALE_BY_CODE } from "./scales-data";
import { ScaleSchema, validateScales } from "./scale-schema";
import type { Scale } from "./scale-types";

/** Escala mínima válida, usada como base e alterada item a item nos testes de invariante. */
function baseScale(overrides: Partial<Scale> = {}): Scale {
  return {
    code: "TEST-1",
    name: "Teste",
    fullName: "Escala de teste",
    domain: "geral",
    instructions: "Responda com sinceridade.",
    options: [
      { label: "Não", value: 0 },
      { label: "Sim", value: 1 },
    ],
    items: [
      { id: "1", text: "Item 1" },
      { id: "2", text: "Item 2" },
    ],
    bands: [
      { min: 0, max: 0, label: "Negativo", level: 0 },
      { min: 1, max: 2, label: "Positivo", level: 2 },
    ],
    ...overrides,
  };
}

describe("ScaleSchema — as 44 escalas reais", () => {
  it("todas as escalas de ALL_SCALES passam individualmente no schema", () => {
    for (const scale of ALL_SCALES) {
      const result = ScaleSchema.safeParse(scale);
      if (!result.success) {
        throw new Error(
          `${scale.code} falhou: ${result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
        );
      }
    }
  });

  it("ALL_SCALES tem exatamente 44 escalas (contrato citado no roadmap)", () => {
    expect(ALL_SCALES.length).toBe(44);
  });

  it("validateScales(ALL_SCALES) não lança — é a mesma checagem que roda no import de scales-data.ts", () => {
    expect(() => validateScales(ALL_SCALES)).not.toThrow();
  });

  it(
    "AUDIT e AUDIT-C passam mesmo com options: [] — suas opções reais vivem em mapas externos " +
      "(AUDIT_OPTIONS/AUDIT_C_OPTIONS) invisíveis ao tipo Scale; a checagem de soma total é pulada " +
      "para essas duas escalas por não ser derivável, não porque os dados estejam errados",
    () => {
      const auditC = SCALE_BY_CODE["AUDIT-C"];
      const audit = SCALE_BY_CODE["AUDIT"];
      expect(auditC.options).toEqual([]);
      expect(audit.options).toEqual([]);
      expect(ScaleSchema.safeParse(auditC).success).toBe(true);
      expect(ScaleSchema.safeParse(audit).success).toBe(true);
    },
  );

  it(
    "code duplicado entre ASSIST (ativo) e ASSIST_V0 (legado) é exceção documentada, " +
      "não entra em ALL_SCALES/validateScales",
    () => {
      const codes = ALL_SCALES.map((s) => s.code);
      expect(codes.filter((c) => c === "ASSIST")).toHaveLength(1);
    },
  );
});

describe("ScaleSchema — invariantes rejeitam escala sintética inválida", () => {
  it("aceita a escala base válida (sanity check dos outros testes)", () => {
    expect(ScaleSchema.safeParse(baseScale()).success).toBe(true);
  });

  it("rejeita bandas com buraco (não começam em 0)", () => {
    const scale = baseScale({
      bands: [
        { min: 1, max: 1, label: "A", level: 0 },
        { min: 2, max: 2, label: "B", level: 2 },
      ],
    });
    const result = ScaleSchema.safeParse(scale);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("começar em 0"))).toBe(true);
    }
  });

  it("rejeita bandas com buraco entre elas (min pula um valor)", () => {
    const scale = baseScale({
      bands: [
        { min: 0, max: 0, label: "A", level: 0 },
        { min: 2, max: 4, label: "B", level: 2 },
      ],
    });
    const result = ScaleSchema.safeParse(scale);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("não é contígua"))).toBe(true);
    }
  });

  it("rejeita bandas sobrepostas", () => {
    const scale = baseScale({
      bands: [
        { min: 0, max: 2, label: "A", level: 0 },
        { min: 1, max: 3, label: "B", level: 2 },
      ],
    });
    const result = ScaleSchema.safeParse(scale);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("não é contígua"))).toBe(true);
    }
  });

  it("rejeita item com options cujo value ultrapassa o máximo da banda mais alta", () => {
    const scale = baseScale({
      items: [
        { id: "1", text: "Item 1", options: [{ label: "Extremo", value: 99 }] },
        { id: "2", text: "Item 2" },
      ],
    });
    const result = ScaleSchema.safeParse(scale);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message.includes("maior que o máximo da banda")),
      ).toBe(true);
    }
  });

  it("rejeita quando a soma dos valores máximos dos itens não bate com o topo da banda mais alta", () => {
    const scale = baseScale({
      bands: [
        { min: 0, max: 0, label: "A", level: 0 },
        // topo declarado (5) não bate com a soma real dos 2 itens (1+1=2)
        { min: 1, max: 5, label: "B", level: 2 },
      ],
    });
    const result = ScaleSchema.safeParse(scale);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("soma dos valores máximos"))).toBe(
        true,
      );
    }
  });

  it("rejeita riskItems referenciando item inexistente", () => {
    const scale = baseScale({ riskItems: ["99"] });
    const result = ScaleSchema.safeParse(scale);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) =>
          i.message.includes("riskItems referencia item inexistente"),
        ),
      ).toBe(true);
    }
  });

  it("aceita riskItems referenciando ids não numéricos, desde que existam (ex.: RISK-COMPOSITE)", () => {
    const scale = baseScale({
      items: [{ id: "suicidio", text: "Ideação suicida" }],
      bands: [
        { min: 0, max: 0, label: "A", level: 0 },
        { min: 1, max: 1, label: "B", level: 4 },
      ],
      riskItems: ["suicidio"],
    });
    expect(ScaleSchema.safeParse(scale).success).toBe(true);
  });

  it("rejeita grupo de ramificação sem pergunta-porta (isGateway)", () => {
    const scale = baseScale({
      items: [
        { id: "1", text: "Item 1", branchGroup: "G1" },
        { id: "2", text: "Item 2", branchGroup: "G1" },
      ],
    });
    const result = ScaleSchema.safeParse(scale);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("não tem pergunta-porta"))).toBe(
        true,
      );
    }
  });

  it("rejeita grupo de ramificação com mais de uma pergunta-porta", () => {
    const scale = baseScale({
      items: [
        { id: "1", text: "Item 1", branchGroup: "G1", isGateway: true },
        { id: "2", text: "Item 2", branchGroup: "G1", isGateway: true },
      ],
    });
    const result = ScaleSchema.safeParse(scale);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message.includes("mais de uma pergunta-porta")),
      ).toBe(true);
    }
  });

  it("rejeita item isGateway sem branchGroup", () => {
    const scale = baseScale({
      items: [
        { id: "1", text: "Item 1", isGateway: true },
        { id: "2", text: "Item 2" },
      ],
    });
    const result = ScaleSchema.safeParse(scale);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("isGateway sem branchGroup"))).toBe(
        true,
      );
    }
  });

  it("rejeita ids de item duplicados", () => {
    const scale = baseScale({
      items: [
        { id: "1", text: "Item 1" },
        { id: "1", text: "Item 1 repetido" },
      ],
    });
    const result = ScaleSchema.safeParse(scale);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("ids de item duplicados"))).toBe(
        true,
      );
    }
  });

  it("rejeita subescala referenciando item inexistente", () => {
    const scale = baseScale({
      subscales: [
        {
          key: "SUB1",
          label: "Subescala",
          items: ["99"],
          bands: [{ min: 0, max: 1, label: "A", level: 0 }],
        },
      ],
    });
    const result = ScaleSchema.safeParse(scale);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message.includes("referencia item inexistente")),
      ).toBe(true);
    }
  });

  it("rejeita bandas de subescala que não cobrem 0..max contiguamente", () => {
    const scale = baseScale({
      subscales: [
        {
          key: "SUB1",
          label: "Subescala",
          items: ["1", "2"],
          bands: [
            { min: 0, max: 0, label: "A", level: 0 },
            { min: 2, max: 2, label: "B", level: 2 },
          ],
        },
      ],
    });
    const result = ScaleSchema.safeParse(scale);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) =>
          i.message.includes('subescala "SUB1": bandas não cobrem 0..max contiguamente'),
        ),
      ).toBe(true);
    }
  });

  it("rejeita minAge maior que maxAge", () => {
    const scale = baseScale({ minAge: 20, maxAge: 10 });
    const result = ScaleSchema.safeParse(scale);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("maior que maxAge"))).toBe(true);
    }
  });

  it("rejeita escala sem items", () => {
    const scale = baseScale({ items: [] });
    expect(ScaleSchema.safeParse(scale).success).toBe(false);
  });

  it("rejeita escala sem bands", () => {
    const scale = baseScale({ bands: [] });
    expect(ScaleSchema.safeParse(scale).success).toBe(false);
  });

  it("rejeita domain fora do enum conhecido", () => {
    const scale = { ...baseScale(), domain: "inexistente" } as unknown as Scale;
    expect(ScaleSchema.safeParse(scale).success).toBe(false);
  });
});

describe("validateScales — agrega problemas e detecta code duplicado", () => {
  it("lança um único erro listando problemas de várias escalas de uma vez", () => {
    const invalidA = baseScale({ code: "A", riskItems: ["99"] });
    const invalidB = baseScale({ code: "B", items: [] });
    expect(() => validateScales([invalidA, invalidB])).toThrow(/problema/);
  });

  it("detecta code duplicado entre duas escalas válidas", () => {
    const a = baseScale({ code: "DUP" });
    const b = baseScale({ code: "DUP" });
    expect(() => validateScales([a, b])).toThrow(/code duplicado/);
  });

  it("não lança para uma lista de escalas válidas com codes únicos", () => {
    const a = baseScale({ code: "A" });
    const b = baseScale({ code: "B" });
    expect(() => validateScales([a, b])).not.toThrow();
  });
});
