import { describe, it, expect } from "vitest";
import {
  calculateGRMCategoryProbabilities,
  calculateItemFisherInformation,
  estimateThetaEAP,
  selectNextCATItem,
  shouldStopCAT,
} from "./cat-estimator";
import { detectItemHesitation, analyzeSessionTelemetry, type ItemDwellRecord } from "./dwell-time";
import type { ScaleItem } from "./schema-types";

describe("Clinical Engine — Teste Adaptativo Computadorizado (CAT) & Telemetria", () => {
  // Banco mockado de 10 itens calibrados no padrão PROMIS / GRM (Samejima)
  const mockPromisBank: ScaleItem[] = [
    {
      id: "promis_dep_01",
      text: "Eu me senti para baixo ou deprimido(a)",
      options: [
        { label: "Nunca", value: 0 },
        { label: "Raramente", value: 1 },
        { label: "Às vezes", value: 2 },
        { label: "Frequentemente", value: 3 },
      ],
      tri_parameters: { a_discrimination: 2.8, b_thresholds: [-0.8, 0.2, 1.4] },
    },
    {
      id: "promis_dep_02",
      text: "Eu me senti sem esperança quanto ao futuro",
      options: [
        { label: "Nunca", value: 0 },
        { label: "Raramente", value: 1 },
        { label: "Às vezes", value: 2 },
        { label: "Frequentemente", value: 3 },
      ],
      tri_parameters: { a_discrimination: 3.1, b_thresholds: [-0.5, 0.4, 1.6] },
    },
    {
      id: "promis_dep_03",
      text: "Eu senti que nada tinha graça ou prazer",
      options: [
        { label: "Nunca", value: 0 },
        { label: "Raramente", value: 1 },
        { label: "Às vezes", value: 2 },
        { label: "Frequentemente", value: 3 },
      ],
      tri_parameters: { a_discrimination: 2.5, b_thresholds: [-0.9, 0.1, 1.2] },
    },
    {
      id: "promis_dep_04",
      text: "Eu me senti solitário(a) mesmo entre amigos",
      options: [
        { label: "Nunca", value: 0 },
        { label: "Raramente", value: 1 },
        { label: "Às vezes", value: 2 },
        { label: "Frequentemente", value: 3 },
      ],
      tri_parameters: { a_discrimination: 1.9, b_thresholds: [-0.4, 0.6, 1.8] },
    },
    {
      id: "promis_dep_05",
      text: "Eu me senti cansado(a) e sem energia para tarefas básicas",
      options: [
        { label: "Nunca", value: 0 },
        { label: "Raramente", value: 1 },
        { label: "Às vezes", value: 2 },
        { label: "Frequentemente", value: 3 },
      ],
      tri_parameters: { a_discrimination: 2.1, b_thresholds: [-1.2, -0.1, 1.0] },
    },
    {
      id: "promis_dep_06",
      text: "Eu me senti um fracasso ou decepção",
      options: [
        { label: "Nunca", value: 0 },
        { label: "Raramente", value: 1 },
        { label: "Às vezes", value: 2 },
        { label: "Frequentemente", value: 3 },
      ],
      tri_parameters: { a_discrimination: 2.7, b_thresholds: [0.0, 0.8, 1.9] },
    },
    {
      id: "promis_dep_07",
      text: "Eu tive dificuldade para me concentrar em leituras ou trabalho",
      options: [
        { label: "Nunca", value: 0 },
        { label: "Raramente", value: 1 },
        { label: "Às vezes", value: 2 },
        { label: "Frequentemente", value: 3 },
      ],
      tri_parameters: { a_discrimination: 1.7, b_thresholds: [-0.7, 0.3, 1.5] },
    },
    {
      id: "promis_dep_08",
      text: "Eu chorei ou tive vontade de chorar com frequência",
      options: [
        { label: "Nunca", value: 0 },
        { label: "Raramente", value: 1 },
        { label: "Às vezes", value: 2 },
        { label: "Frequentemente", value: 3 },
      ],
      tri_parameters: { a_discrimination: 2.3, b_thresholds: [-0.2, 0.7, 1.7] },
    },
    {
      id: "promis_dep_09",
      text: "Eu senti que tudo exigia um esforço monumental",
      options: [
        { label: "Nunca", value: 0 },
        { label: "Raramente", value: 1 },
        { label: "Às vezes", value: 2 },
        { label: "Frequentemente", value: 3 },
      ],
      tri_parameters: { a_discrimination: 2.0, b_thresholds: [-0.6, 0.2, 1.3] },
    },
    {
      id: "promis_dep_10",
      text: "Eu pensei que seria melhor se eu não acordasse amanhã",
      is_risk: true,
      options: [
        { label: "Nunca", value: 0 },
        { label: "Raramente", value: 1 },
        { label: "Às vezes", value: 2 },
        { label: "Frequentemente", value: 3 },
      ],
      tri_parameters: { a_discrimination: 3.4, b_thresholds: [0.5, 1.2, 2.2] },
    },
  ];

  describe("Matemática do Graded Response Model (GRM)", () => {
    it("garante que a soma das probabilidades das categorias seja exatamente 1.0", () => {
      const thetas = [-3.0, -1.0, 0.0, 1.2, 2.5];
      const tri = mockPromisBank[0].tri_parameters!;

      for (const theta of thetas) {
        const probs = calculateGRMCategoryProbabilities(theta, tri, 4);
        const sum = probs.reduce((acc, p) => acc + p, 0);
        expect(sum).toBeCloseTo(1.0, 5);
        probs.forEach((p) => expect(p).toBeGreaterThan(0));
      }
    });

    it("calcula informação de Fisher positiva e com pico na região dos limiares", () => {
      const tri = mockPromisBank[1].tri_parameters!; // a = 3.1
      const infoNearThreshold = calculateItemFisherInformation(0.4, tri, 4);
      const infoExtreme = calculateItemFisherInformation(4.0, tri, 4);

      expect(infoNearThreshold).toBeGreaterThan(infoExtreme);
      expect(infoNearThreshold).toBeGreaterThan(1.0);
    });
  });

  describe("Simulação de Teste Adaptativo (CAT) com Redução >= 50%", () => {
    it("converge com alta precisão e interrompe o teste aplicando no máximo 5 itens (50% de redução)", () => {
      // Simulação de um paciente com traço depressivo moderado/grave (valor de resposta 2 ou 3)
      const simulatedResponses: { item: ScaleItem; answerValue: number }[] = [];
      const answeredIds: string[] = [];
      let currentTheta = 0.0;
      let iterations = 0;
      let finalDecision: ReturnType<typeof shouldStopCAT> | null = null;

      while (iterations < mockPromisBank.length) {
        const nextItem = selectNextCATItem(mockPromisBank, currentTheta, answeredIds);
        if (!nextItem) break;

        // Paciente responde com sintoma moderado-alto (valor 2)
        simulatedResponses.push({ item: nextItem, answerValue: 2 });
        answeredIds.push(nextItem.id);

        const estimate = estimateThetaEAP(simulatedResponses);
        currentTheta = estimate.theta;

        const decision = shouldStopCAT(
          estimate.se,
          simulatedResponses.length,
          mockPromisBank.length,
          0.3,
        );

        if (decision.stop) {
          finalDecision = decision;
          break;
        }

        iterations++;
      }

      expect(finalDecision).not.toBeNull();
      expect(finalDecision?.stop).toBe(true);

      // Comprovação de redução >= 50% dos itens da escala
      expect(simulatedResponses.length).toBeLessThanOrEqual(5);
      expect(finalDecision?.reductionPercentage).toBeGreaterThanOrEqual(50);
      expect(currentTheta).toBeGreaterThan(0.5); // Detectou corretamente humor elevado/depressivo
    });
  });

  describe("Telemetria de Dwell Time e Detecção de Hesitação", () => {
    it("detecta alerta crítico de hesitação no item de risco quando tempo é >= 3x a média", () => {
      const records: ItemDwellRecord[] = [
        { scale_code: "PHQ-9", item_id: "1", response_time_ms: 1800, value: 2 },
        { scale_code: "PHQ-9", item_id: "2", response_time_ms: 1600, value: 2 },
        { scale_code: "PHQ-9", item_id: "3", response_time_ms: 2000, value: 1 },
        {
          scale_code: "PHQ-9",
          item_id: "9",
          response_time_ms: 14500, // Hesitação de 14.5s no item de ideação suicida
          value: 3,
          is_risk_item: true,
        },
      ];

      const report = analyzeSessionTelemetry(records);

      expect(report.has_risk_hesitation).toBe(true);
      expect(report.hesitations).toHaveLength(1);
      expect(report.hesitations[0].alert_level).toBe("critical");
      expect(report.hesitations[0].item_id).toBe("9");
      expect(report.hesitations[0].response_time_ms).toBe(14500);
      expect(report.random_answering_detected).toBe(false);
    });

    it("não dispara alertas quando o tempo de resposta é homogêneo (ex: 1200ms)", () => {
      const records: ItemDwellRecord[] = [
        { scale_code: "ASRS-18", item_id: "1", response_time_ms: 1200, value: 2 },
        { scale_code: "ASRS-18", item_id: "2", response_time_ms: 1150, value: 2 },
        { scale_code: "ASRS-18", item_id: "3", response_time_ms: 1250, value: 3 },
      ];

      const report = analyzeSessionTelemetry(records);

      expect(report.has_risk_hesitation).toBe(false);
      expect(report.hesitations).toHaveLength(0);
      expect(report.random_answering_detected).toBe(false);
    });

    it("detecta preenchimento desatento / randômico quando há respostas consecutivas < 400ms", () => {
      const rushedRecords: ItemDwellRecord[] = [
        { scale_code: "PHQ-9", item_id: "1", response_time_ms: 250, value: 0 },
        { scale_code: "PHQ-9", item_id: "2", response_time_ms: 280, value: 0 },
        { scale_code: "PHQ-9", item_id: "3", response_time_ms: 310, value: 0 },
      ];

      const report = analyzeSessionTelemetry(rushedRecords);
      expect(report.random_answering_detected).toBe(true);
    });
  });
});
