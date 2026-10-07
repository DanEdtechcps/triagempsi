import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ResponseQualityCard, buildQualityScales } from "@/components/medical/ResponseQualityCard";
import { assessResponseQuality } from "@/lib/response-quality";

describe("ResponseQualityCard / buildQualityScales", () => {
  it("usa os enunciados e opções reais: PHQ-2 × PHQ-9 com o mesmo item e respostas distantes → inconsistência", () => {
    const scales = buildQualityScales([
      { scale_code: "PHQ-2", answers: { "1": 0, "2": 0 } },
      { scale_code: "PHQ-9", answers: { "1": 3, "2": 3, "9": 0 } },
    ]);
    expect(scales[0].option_count).toBe(4);
    expect(scales[0].value_range).toEqual([0, 3]);
    const r = assessResponseQuality({ scales });
    expect(r.flags.map((f) => f.code)).toContain("item_repetido_inconsistente");
  });

  it("SRQ-20 (Sim/Não) não é avaliada como 'tudo igual'", () => {
    const answers = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [String(i + 1), 0]));
    const scales = buildQualityScales([{ scale_code: "SRQ-20", answers }]);
    expect(scales[0].option_count).toBe(2);
    expect(assessResponseQuality({ scales }).flags).toHaveLength(0);
  });

  it("renderiza o aviso de que não altera o alerta de risco e a ausência de telemetria", () => {
    const html = renderToStaticMarkup(
      createElement(ResponseQualityCard, {
        scaleResults: [{ scale_code: "PHQ-2", answers: { "1": 1, "2": 1 } }],
      }),
    );
    expect(html).toContain("Qualidade do preenchimento");
    expect(html).toContain("não altera a classificação, o escore nem o alerta de risco");
    expect(html).toContain("Sem tempos de resposta capturados");
    expect(html).toContain('data-level="adequada"');
  });
});
