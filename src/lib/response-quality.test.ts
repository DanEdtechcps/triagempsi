import { describe, expect, it } from "vitest";
import {
  assessResponseQuality,
  longestRun,
  type QualityScaleInput,
  type TelemetryInput,
} from "@/lib/response-quality";

const scale = (code: string, answers: Record<string, number>, extra: Partial<QualityScaleInput> = {}): QualityScaleInput => ({
  scale_code: code,
  answers,
  option_count: 4,
  value_range: [0, 3],
  ...extra,
});
const times = (ms: number, n: number, risk = false): TelemetryInput[] =>
  Array.from({ length: n }, (_, i) => ({ scale_code: "PHQ-9", item_id: String(i + 1), response_time_ms: ms, is_risk_item: risk }));

describe("longestRun", () => {
  it("maior sequência de valores iguais", () => {
    expect(longestRun([])).toBe(0);
    expect(longestRun([1, 1, 2, 2, 2, 1])).toBe(3);
    expect(longestRun([3, 3, 3])).toBe(3);
  });
});

describe("assessResponseQuality — nunca altera risco", () => {
  it("sempre informativo e sem dados devolve 'adequada' com telemetria ausente", () => {
    const r = assessResponseQuality({ scales: [] });
    expect(r.level).toBe("adequada");
    expect(r.telemetry_available).toBe(false);
    expect(r.informational_only).toBe(true);
  });

  it("ritmo apressado: ≥50% das respostas em <600 ms, com ≥10 itens", () => {
    const r = assessResponseQuality({ scales: [scale("PHQ-9", { "1": 1 })], telemetry: times(300, 12) });
    expect(r.flags.map((f) => f.code)).toContain("ritmo_apressado");
    expect(r.level).toBe("baixa");
  });
  it("poucos itens não bastam para julgar o ritmo", () => {
    const r = assessResponseQuality({ scales: [], telemetry: times(200, 5) });
    expect(r.flags).toHaveLength(0);
  });
  it("itens de risco ficam fora do cálculo de tempo", () => {
    const r = assessResponseQuality({ scales: [], telemetry: times(100, 20, true) });
    expect(r.flags).toHaveLength(0);
  });
  it("idoso/leitura lenta (tempos altos) não é sinalizado", () => {
    const r = assessResponseQuality({ scales: [], telemetry: times(9000, 20) });
    expect(r.level).toBe("adequada");
  });

  it("respostas uniformes em escala longa de 4 opções geram atenção (não 'baixa' sozinha)", () => {
    const answers = Object.fromEntries(Array.from({ length: 15 }, (_, i) => [String(i + 1), 2]));
    const r = assessResponseQuality({ scales: [scale("PHQ-15", answers)] });
    expect(r.flags.map((f) => f.code)).toEqual(["respostas_uniformes"]);
    expect(r.level).toBe("atencao");
  });
  it("não avalia 'tudo igual' em escala Sim/Não, escala curta, ou itens estimados pela parada adaptativa", () => {
    const yn = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [String(i + 1), 0]));
    expect(assessResponseQuality({ scales: [scale("SRQ-20", yn, { option_count: 2 })] }).flags).toHaveLength(0);
    expect(assessResponseQuality({ scales: [scale("PHQ-2", { "1": 1, "2": 1 })] }).flags).toHaveLength(0);
    const est = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [String(i + 1), 0]));
    expect(
      assessResponseQuality({ scales: [scale("GDS-15", est, { estimated_items: Array.from({ length: 10 }, (_, i) => String(i + 1)) })] }).flags,
    ).toHaveLength(0);
  });

  it("mesmo enunciado em escalas diferentes com respostas distantes → inconsistência", () => {
    const text = "Pouco interesse ou prazer em fazer as coisas";
    const r = assessResponseQuality({
      scales: [
        scale("PHQ-2", { "1": 0 }, { item_texts: { "1": text } }),
        scale("PHQ-9", { "1": 3 }, { item_texts: { "1": text } }),
      ],
    });
    expect(r.flags.map((f) => f.code)).toContain("item_repetido_inconsistente");
  });
  it("diferença de 1 ponto no mesmo enunciado é tolerada", () => {
    const text = "Pouco interesse ou prazer em fazer as coisas";
    const r = assessResponseQuality({
      scales: [
        scale("PHQ-2", { "1": 1 }, { item_texts: { "1": text } }),
        scale("PHQ-9", { "1": 2 }, { item_texts: { "1": text } }),
      ],
    });
    expect(r.flags).toHaveLength(0);
  });

  it("risco discordante: PHQ-9 item 9 positivo com ASQ negativo, ou sintoma 'morte' com ASQ negativo", () => {
    const a = assessResponseQuality({ scales: [scale("PHQ-9", { "9": 2 }), scale("ASQ", { "1": 0, "2": 0 })] });
    expect(a.flags.map((f) => f.code)).toContain("risco_discordante");
    const b = assessResponseQuality({ scales: [scale("ASQ", { "1": 0 })], symptoms: ["morte"] });
    expect(b.flags.map((f) => f.code)).toContain("risco_discordante");
    // ASQ positivo: sem discordância
    const c = assessResponseQuality({ scales: [scale("PHQ-9", { "9": 2 }), scale("ASQ", { "1": 1 })], symptoms: ["morte"] });
    expect(c.flags).toHaveLength(0);
  });
  it("risco discordante isolado nunca vira 'baixa' (continua pedindo atenção)", () => {
    const r = assessResponseQuality({ scales: [scale("ASQ", { "1": 0 })], symptoms: ["morte"] });
    expect(r.level).toBe("atencao");
  });

  it("duas sinalizações de qualidade elevam para 'baixa'", () => {
    const text = "Pouco interesse ou prazer em fazer as coisas";
    const uniform = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [String(i + 1), 3]));
    const r = assessResponseQuality({
      scales: [
        scale("PHQ-9", uniform, { item_texts: { "1": text } }),
        scale("PHQ-2", { "1": 0 }, { item_texts: { "1": text } }),
      ],
    });
    expect(r.level).toBe("baixa");
  });
});
