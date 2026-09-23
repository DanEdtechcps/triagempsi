import { describe, it, expect } from "vitest";
import { evaluateScaleEligibility, scoreSchemaScale } from "./schema-evaluator";
import type { ScaleSchema } from "./schema-types";

import epdsSchemaRaw from "./schemas/epds.json";
import phq2SchemaRaw from "./schemas/phq2.json";
import phq9SchemaRaw from "./schemas/phq9.json";
import cssrsSchemaRaw from "./schemas/c-ssrs.json";

const epdsSchema = epdsSchemaRaw as unknown as ScaleSchema;
const phq2Schema = phq2SchemaRaw as unknown as ScaleSchema;
const phq9Schema = phq9SchemaRaw as unknown as ScaleSchema;
const cssrsSchema = cssrsSchemaRaw as unknown as ScaleSchema;

describe("Clinical Engine — Avaliador de Schemas Declarativos (DSL)", () => {
  describe("Elegibilidade Declarativa (evaluateScaleEligibility)", () => {
    it("bloqueia estritamente EPDS para paciente do sexo masculino, mesmo com queixa perinatal", () => {
      const maleProfiles = [
        { sex: "masculino", age: 30, symptoms: ["perinatal"] },
        { sex: "homem", age: 40, symptoms: ["perinatal"] },
        { sex: "M", age: 25, symptoms: ["perinatal"] },
        { sex: "male", age: 28, symptoms: ["perinatal"] },
        { sex: "Homem Cisgênero", age: 32, symptoms: ["perinatal"] },
      ];

      for (const profile of maleProfiles) {
        const eligible = evaluateScaleEligibility(epdsSchema, profile);
        expect(eligible).toBe(false);
      }
    });

    it("libera EPDS para paciente feminina adulta com queixa perinatal", () => {
      const eligible = evaluateScaleEligibility(epdsSchema, {
        sex: "feminino",
        age: 28,
        symptoms: ["perinatal"],
      });
      expect(eligible).toBe(true);
    });

    it("bloqueia EPDS para paciente feminina sem a queixa perinatal requerida", () => {
      const eligible = evaluateScaleEligibility(epdsSchema, {
        sex: "feminino",
        age: 28,
        symptoms: ["ansiedade", "tristeza"],
      });
      expect(eligible).toBe(false);
    });

    it("bloqueia EPDS para paciente abaixo da idade mínima (< 12 anos)", () => {
      const eligible = evaluateScaleEligibility(epdsSchema, {
        sex: "feminino",
        age: 11,
        symptoms: ["perinatal"],
      });
      expect(eligible).toBe(false);
    });

    it("libera PHQ-2 e PHQ-9 para homens e mulheres com queixa depressiva", () => {
      const maleProfile = {
        sex: "masculino",
        age: 35,
        symptoms: ["tristeza"],
      };
      const femaleProfile = {
        sex: "feminino",
        age: 35,
        symptoms: ["angustia"],
      };

      expect(evaluateScaleEligibility(phq2Schema, maleProfile)).toBe(true);
      expect(evaluateScaleEligibility(phq9Schema, maleProfile)).toBe(true);
      expect(evaluateScaleEligibility(phq2Schema, femaleProfile)).toBe(true);
      expect(evaluateScaleEligibility(phq9Schema, femaleProfile)).toBe(true);
    });
  });

  describe("Pontuação Psicométrica Declarativa (scoreSchemaScale)", () => {
    it("classifica corretamente as faixas de gravidade do PHQ-9", () => {
      // Mínima (0-4)
      const resMin = scoreSchemaScale(phq9Schema, { "1": 1, "2": 1, "3": 1 });
      expect(resMin.score).toBe(3);
      expect(resMin.band?.label).toBe("Mínima");
      expect(resMin.isPositive).toBe(false);
      expect(resMin.isRisk).toBe(false);

      // Leve (5-9)
      const resLeve = scoreSchemaScale(phq9Schema, { "1": 2, "2": 2, "4": 2, "5": 1 });
      expect(resLeve.score).toBe(7);
      expect(resLeve.band?.label).toBe("Leve");
      expect(resLeve.isPositive).toBe(false);
      expect(resLeve.isRisk).toBe(false);

      // Moderada (10-14)
      const resMod = scoreSchemaScale(phq9Schema, { "1": 3, "2": 3, "3": 3, "4": 3 });
      expect(resMod.score).toBe(12);
      expect(resMod.band?.label).toBe("Moderada");
      expect(resMod.isPositive).toBe(true);
      expect(resMod.isRisk).toBe(false);

      // Moderadamente grave (15-19)
      const resModGrav = scoreSchemaScale(phq9Schema, {
        "1": 3,
        "2": 3,
        "3": 3,
        "4": 3,
        "5": 2,
        "6": 2,
      });
      expect(resModGrav.score).toBe(16);
      expect(resModGrav.band?.label).toBe("Moderadamente grave");
      expect(resModGrav.isPositive).toBe(true);

      // Grave (20-27)
      const resGrave = scoreSchemaScale(phq9Schema, {
        "1": 3,
        "2": 3,
        "3": 3,
        "4": 3,
        "5": 3,
        "6": 3,
        "7": 3,
        "8": 2,
      });
      expect(resGrave.score).toBe(23);
      expect(resGrave.band?.label).toBe("Grave");
      expect(resGrave.isPositive).toBe(true);
      expect(resGrave.isRisk).toBe(true);
    });

    it("sinaliza risco imediato se o item 9 do PHQ-9 for pontuado > 0", () => {
      const res = scoreSchemaScale(phq9Schema, {
        "1": 1,
        "9": 1, // ideação suicida
      });
      expect(res.score).toBe(2);
      expect(res.isRisk).toBe(true);
      expect(res.riskItemsTriggered).toContain("9");
    });

    it("avalia ponto de corte positivo no PHQ-2 (corte >= 3)", () => {
      const resNeg = scoreSchemaScale(phq2Schema, { "1": 1, "2": 1 });
      expect(resNeg.score).toBe(2);
      expect(resNeg.isPositive).toBe(false);

      const resPos = scoreSchemaScale(phq2Schema, { "1": 2, "2": 1 });
      expect(resPos.score).toBe(3);
      expect(resPos.isPositive).toBe(true);
    });

    it("avalia ponto de corte e item de risco (10) no EPDS", () => {
      const res = scoreSchemaScale(epdsSchema, {
        "3": 2,
        "4": 2,
        "10": 1, // autoagressão
      });
      expect(res.score).toBe(5);
      expect(res.isRisk).toBe(true);
      expect(res.riskItemsTriggered).toContain("10");

      const resAltaGravidade = scoreSchemaScale(epdsSchema, {
        "3": 3,
        "4": 3,
        "5": 3,
        "6": 3,
        "7": 3,
      });
      expect(resAltaGravidade.score).toBe(15);
      expect(resAltaGravidade.isPositive).toBe(true);
      expect(resAltaGravidade.isRisk).toBe(true); // band level 4 tem is_risk: true
    });

    // Achado #30 da auditoria: o C-SSRS é hierárquico (item 6 = comportamento
    // preparatório é o mais grave da escala), não um Likert somado — usar a
    // soma pra escolher a banda faz alguém que só endossa o item 6 cair na
    // banda de "ideação passiva" (score=1) em vez de "alto risco iminente".
    // scoringMethod: "highest_item_band" corrige isso usando o item de maior
    // severidade endossado, não a soma.
    it("C-SSRS: classifica pelo item de maior severidade endossado, não pela soma (achado #30)", () => {
      // Só o item 6 (comportamento preparatório, o mais grave) — soma seria
      // 1, caindo erroneamente na banda de ideação passiva.
      const soItem6 = scoreSchemaScale(cssrsSchema, { "6": 1 });
      expect(soItem6.score).toBe(1);
      expect(soItem6.band?.label).toBe("Alto risco iminente — protocolo de segurança ativado");
      expect(soItem6.band?.level).toBe(4);

      // Só o item 1 (ideação passiva, o menos grave) — deve permanecer na
      // banda de ideação passiva.
      const soItem1 = scoreSchemaScale(cssrsSchema, { "1": 1 });
      expect(soItem1.band?.label).toBe("Risco de ideação passiva");
      expect(soItem1.band?.level).toBe(2);

      // Itens 1 e 2 juntos (soma 2) — ainda ideação, banda intermediária.
      const items1e2 = scoreSchemaScale(cssrsSchema, { "1": 1, "2": 1 });
      expect(items1e2.band?.label).toBe("Risco de ideação passiva");

      // Nenhum item — sem risco.
      const nenhum = scoreSchemaScale(cssrsSchema, {});
      expect(nenhum.band?.label).toBe("Sem risco detectado");
      expect(nenhum.isRisk).toBe(false);
    });
  });
});
