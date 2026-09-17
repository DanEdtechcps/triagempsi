import { describe, expect, it } from "vitest";
import { SCALE_BY_CODE } from "@/lib/scales-data";
import {
  applyBranchingSkips,
  nextItemIndex,
  prevItemIndex,
  skippedItemIds,
  visibleProgress,
} from "@/lib/scale-types";

const ASSIST = SCALE_BY_CODE["ASSIST"];

describe("ramificação (ASSIST-Lite)", () => {
  it("gateway 'Não' pula os itens da substância", () => {
    const answers = { "801": 0 };
    const skipped = skippedItemIds(ASSIST, answers);
    expect(skipped.has("802")).toBe(true);
    expect(skipped.has("803")).toBe(true);
    expect(skipped.has("804")).toBe(false); // próximo gateway continua visível
  });

  it("gateway 'Sim' mantém as perguntas de aprofundamento", () => {
    const skipped = skippedItemIds(ASSIST, { "801": 1 });
    expect(skipped.has("802")).toBe(false);
    expect(skipped.has("803")).toBe(false);
  });

  it("nextItemIndex salta do gateway do tabaco para o gateway do álcool", () => {
    expect(nextItemIndex(ASSIST, 0, { "801": 0 })).toBe(3); // 801 → 804
    expect(nextItemIndex(ASSIST, 0, { "801": 1 })).toBe(1); // 801 → 802
  });

  it("prevItemIndex volta para o gateway quando os itens seguintes estão pulados", () => {
    const answers = { "801": 0, "804": 1 };
    expect(prevItemIndex(ASSIST, 3, answers)).toBe(0); // 804 → 801
  });

  it("item pulado é gravado com 0 e respostas existentes são preservadas", () => {
    const out = applyBranchingSkips(ASSIST, { "801": 0, "804": 1, "805": 1 });
    expect(out["802"]).toBe(0);
    expect(out["803"]).toBe(0);
    expect(out["804"]).toBe(1);
    expect(out["805"]).toBe(1);
  });

  it("progresso visível desconta os itens pulados", () => {
    const allNo = Object.fromEntries(
      ["801", "804", "808", "811", "814", "817", "820"].map((id) => [id, 0]),
    );
    const p = visibleProgress(ASSIST, 19, allNo);
    expect(p.total).toBe(7); // só os 7 gateways
    expect(p.position).toBe(7);
  });

  it("escalas sem ramificação avançam de um em um e não pulam nada", () => {
    const phq9 = SCALE_BY_CODE["PHQ-9"];
    expect(nextItemIndex(phq9, 0, {})).toBe(1);
    expect(skippedItemIds(phq9, {}).size).toBe(0);
  });

  it("último item visível com todos os gateways negativos é a pergunta 820", () => {
    const allNo = Object.fromEntries(
      ["801", "804", "808", "811", "814", "817"].map((id) => [id, 0]),
    );
    expect(nextItemIndex(ASSIST, 18, allNo)).toBe(19); // 819 → 820
    expect(nextItemIndex(ASSIST, 19, { ...allNo, "820": 0 })).toBe(-1);
  });
});
