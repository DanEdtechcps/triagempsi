import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TelemetryCard } from "@/components/medical/TelemetryCard";

describe("TelemetryCard", () => {
  it("sem telemetria real NÃO inventa tempos: mostra aviso e nenhum número de tempo", () => {
    const html = renderToStaticMarkup(
      createElement(TelemetryCard, {
        telemetryRecords: [],
        scaleResults: [
          { scale_code: "PHQ-9", answers: { "9": 3, "1": 2 } },
          { scale_code: "SRQ-20", answers: { "17": 1 } },
        ],
      }),
    );
    expect(html).toContain("Telemetria não capturada");
    expect(html).toContain("telemetry-unavailable");
    expect(html).not.toMatch(/14[.,]5\s?s/);
    expect(html).not.toContain("Hesitação");
    expect(html).not.toContain("Tempo Total de Triagem");
  });

  it("com registros reais, mostra a análise", () => {
    const html = renderToStaticMarkup(
      createElement(TelemetryCard, {
        telemetryRecords: [
          { scale_code: "PHQ-9", item_id: "1", response_time_ms: 1500, value: 1 },
          { scale_code: "PHQ-9", item_id: "2", response_time_ms: 1700, value: 0 },
          { scale_code: "PHQ-9", item_id: "9", response_time_ms: 15000, value: 1, is_risk_item: true },
        ],
      }),
    );
    expect(html).not.toContain("Telemetria não capturada");
    expect(html).toContain("Tempo Total de Triagem");
    expect(html).toContain("Hesitação");
  });
});
