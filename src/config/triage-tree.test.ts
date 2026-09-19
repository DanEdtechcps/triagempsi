import { describe, expect, it } from "vitest";
import { ageBand, buildTriagePlan, calcAge, isMaleSex } from "@/config/triage-tree";

describe("faixas etárias", () => {
  it("classifica os limites de cada banda", () => {
    expect(ageBand(0)).toBe("crianca");
    expect(ageBand(11)).toBe("crianca");
    expect(ageBand(12)).toBe("adolescente");
    expect(ageBand(17)).toBe("adolescente");
    expect(ageBand(18)).toBe("adulto");
    expect(ageBand(59)).toBe("adulto");
    expect(ageBand(60)).toBe("idoso");
    expect(ageBand(null)).toBe("adulto");
  });

  it("calcAge devolve null para datas inválidas", () => {
    expect(calcAge("")).toBeNull();
    expect(calcAge("data-invalida")).toBeNull();
    expect(calcAge("1800-01-01")).toBeNull();
  });
});

describe("sintoma → escala inicial", () => {
  it("adulto com tristeza faz SRQ-20 (base) e PHQ-2", () => {
    const plan = buildTriagePlan(["tristeza"], 30);
    expect(plan.flow).toEqual(["SRQ-20", "PHQ-2"]);
    expect(plan.riskPathway).toBe(false);
  });

  it("idoso com tristeza troca PHQ-2 por GDS-15", () => {
    const plan = buildTriagePlan(["tristeza"], 72);
    expect(plan.flow).toContain("GDS-15");
    expect(plan.flow).not.toContain("PHQ-2");
  });

  it("adolescente com tristeza vai direto ao PHQ-2, sem SRQ-20 de base", () => {
    const plan = buildTriagePlan(["tristeza"], 15);
    expect(plan.flow).toEqual(["PHQ-2"]);
  });

  it("criança com tristeza não recebe escala online, mas gera nota clínica", () => {
    const plan = buildTriagePlan(["tristeza"], 8);
    expect(plan.flow).toHaveLength(0);
    expect(plan.indicated.length).toBeGreaterThan(0);
    expect(plan.decisions.some((d) => d.step === "tristeza")).toBe(true);
  });

  it("ansiedade abre GAD-2 em adolescente, adulto e idoso", () => {
    for (const age of [14, 40, 70]) {
      expect(buildTriagePlan(["ansiedade"], age).flow).toContain("GAD-2");
    }
  });

  it("substâncias: adolescente só AUDIT-C; adulto AUDIT-C + CAGE", () => {
    expect(buildTriagePlan(["substancias"], 16).flow).toContain("AUDIT-C");
    expect(buildTriagePlan(["substancias"], 16).flow).not.toContain("CAGE");
    const adulto = buildTriagePlan(["substancias"], 35).flow;
    expect(adulto).toContain("AUDIT-C");
    expect(adulto).toContain("CAGE");
  });

  it("atenção usa SNAP-IV até 17 anos e ASRS-18 a partir de 18", () => {
    const cri = buildTriagePlan(["atencao"], 9);
    const ado = buildTriagePlan(["atencao"], 16);
    const adu = buildTriagePlan(["atencao"], 25);
    for (const p of [cri, ado]) {
      expect([...p.flow, ...p.indicated.map((i) => i.code)]).toContain("SNAP-IV");
    }
    expect([...adu.flow, ...adu.indicated.map((i) => i.code)]).toContain("ASRS-18");
  });

  it("pensamentos de morte ativam a via de risco em qualquer idade", () => {
    for (const age of [10, 15, 40, 80]) {
      expect(buildTriagePlan(["morte"], age).riskPathway).toBe(true);
    }
  });

  it("adulto com morte responde ASQ e o ASQ vem primeiro na ordem", () => {
    const plan = buildTriagePlan(["morte", "tristeza"], 40);
    expect(plan.flow[0]).toBe("ASQ");
    expect(plan.flow).toContain("PHQ-2");
  });

  it("sintoma obsessivo aplica o OCI-R a partir dos 14 anos", () => {
    const plan = buildTriagePlan(["obsessivo"], 40);
    expect(plan.flow).toContain("OCI-R");
    const crianca = buildTriagePlan(["obsessivo"], 9);
    expect(crianca.flow).not.toContain("OCI-R");
    expect(crianca.indicated.some((i) => /obsessiv/i.test(i.reason))).toBe(true);
  });

  it("substâncias abrem o ASSIST e apostas abrem o PGSI", () => {
    expect(buildTriagePlan(["substancias"], 35).flow).toContain("ASSIST");
    expect(buildTriagePlan(["jogos"], 35).flow).toContain("PGSI");
    expect(buildTriagePlan(["jogos"], 8).flow).not.toContain("PGSI");
  });

  it("não duplica escalas quando dois sintomas apontam para a mesma", () => {
    const plan = buildTriagePlan(["angustia", "tristeza"], 40);
    expect(plan.flow.filter((c) => c === "SRQ-20")).toHaveLength(1);
  });

  it("sem sintomas o adulto ainda faz o rastreio geral", () => {
    expect(buildTriagePlan([], 40).flow).toEqual(["SRQ-20"]);
    expect(buildTriagePlan([], 8).flow).toEqual([]);
  });
});

describe("filtro clínico de sexo / gênero para EPDS", () => {
  it("detecta corretamente sexo masculino em diferentes formatos", () => {
    expect(isMaleSex("Masculino (cisgênero)")).toBe(true);
    expect(isMaleSex("masculino")).toBe(true);
    expect(isMaleSex("M")).toBe(true);
    expect(isMaleSex("Feminino (cisgênero)")).toBe(false);
    expect(isMaleSex("Mulher transgênero")).toBe(false);
    expect(isMaleSex(null)).toBe(false);
    expect(isMaleSex(undefined)).toBe(false);
  });

  it("paciente masculino com sintomas perinatais NUNCA recebe EPDS", () => {
    const plan = buildTriagePlan(["perinatal"], 30, "Masculino (cisgênero)");
    expect(plan.flow).not.toContain("EPDS");
    expect(plan.indicated.some((i) => i.code === "EPDS")).toBe(false);
    expect(plan.decisions.some((d) => d.step === "EPDS")).toBe(true);
  });

  it("paciente masculino (string simples 'masculino') com sintomas perinatais NUNCA recebe EPDS", () => {
    const plan = buildTriagePlan(["perinatal"], 30, "masculino");
    expect(plan.flow).not.toContain("EPDS");
    expect(plan.indicated.some((i) => i.code === "EPDS")).toBe(false);
  });

  it("paciente feminino com sintomas perinatais recebe EPDS normalmente", () => {
    const plan = buildTriagePlan(["perinatal"], 30, "Feminino (cisgênero)");
    expect(plan.flow).toContain("EPDS");
  });

  it("paciente sem sexo informado com sintomas perinatais recebe EPDS (compatibilidade)", () => {
    const plan = buildTriagePlan(["perinatal"], 30);
    expect(plan.flow).toContain("EPDS");
  });
});

