import { describe, expect, it } from "vitest";
import { ALL_SCALES, SCALE_BY_CODE, getItemOptions } from "./scales-data";

// Achado #34 da auditoria (o mais grave encontrado): getItemOptions() só
// tratava AUDIT/AUDIT-C como caso especial e caía pra scale.options pra
// qualquer outro item — inclusive os itens de pontuação reversa que
// declaram seu próprio `options` (rótulo e/ou polaridade diferentes do
// resto da escala). Isso invertia silenciosamente a pontuação de itens
// reais de EPDS (depressão perinatal), GDS-15, FTND, ISI, AQ-10 e PSS-10.
// Regra geral: item.options, quando declarado, é sempre a fonte de
// verdade, antes de qualquer fallback.
describe("getItemOptions", () => {
  it("usa as opções do próprio item quando declaradas, mesmo diferindo das da escala", () => {
    // EPDS item 1 é positivo/reverso: "Sempre, como antes" (saudável) = 0,
    // "Quase nada" (grave) = 3 — a escala em si usa "Nunca"(0)..."Sempre"(3)
    // pros itens diretos. Confundir os dois inverteria a pontuação.
    const epds = SCALE_BY_CODE["EPDS"];
    const resolved = getItemOptions(epds, "1");
    expect(resolved).toEqual(epds.items.find((i) => i.id === "1")!.options);
    expect(resolved[0]).toEqual({ label: "Sempre, como antes", value: 0 });
    expect(resolved[3]).toEqual({ label: "Quase nada", value: 3 });
  });

  it("resolve o intervalo correto (0-3) do FTND item 1, não o Sim/Não padrão da escala", () => {
    const ftnd = SCALE_BY_CODE["FTND"];
    const resolved = getItemOptions(ftnd, "1");
    expect(resolved).toHaveLength(4);
    expect(resolved[3]).toEqual({ label: "Nos primeiros 5 minutos", value: 3 });
  });

  it("resolve a polaridade correta dos itens reversos do PSS-10 (Nunca=4, não 0)", () => {
    const pss = SCALE_BY_CODE["PSS-10"];
    const resolved = getItemOptions(pss, "4");
    expect(resolved[0]).toEqual({ label: "Nunca", value: 4 });
  });

  it("mantém o comportamento de AUDIT/AUDIT-C via seus mapas externos de opções", () => {
    const auditC = SCALE_BY_CODE["AUDIT-C"];
    const audit = SCALE_BY_CODE["AUDIT"];
    expect(getItemOptions(auditC, "1")[0]).toEqual({ label: "Nunca", value: 0 });
    expect(getItemOptions(audit, "9")).toEqual([
      { label: "Não", value: 0 },
      { label: "Sim, mas não no último ano", value: 2 },
      { label: "Sim, no último ano", value: 4 },
    ]);
  });

  it("cai pras opções da escala quando o item não declara as próprias", () => {
    const phq9 = SCALE_BY_CODE["PHQ-9"];
    expect(getItemOptions(phq9, "1")).toEqual(phq9.options);
  });

  it("regressão estrutural: toda opção declarada por item é a que getItemOptions resolve, em todas as escalas", () => {
    for (const scale of ALL_SCALES) {
      for (const item of scale.items) {
        if (!item.options) continue;
        expect(getItemOptions(scale, item.id)).toEqual(item.options);
      }
    }
  });
});
