import { describe, expect, it } from "vitest";
import {
  averageSentenceLength,
  checkContent,
  parseFrontMatter,
  type ContentFront,
} from "@/lib/content-guardrails";

const BASE = "RASCUNHO/TESTE\n\nTexto simples e curto.\n\n## Fontes\n- capitulos/02_delirium.md\n";
const rules = (front: ContentFront, text: string, extra = {}) =>
  checkContent({ front, text, ...extra }).violations.map((v) => v.rule);

describe("piso comum", () => {
  it("aceita um rascunho limpo com fonte", () => {
    const text = `${BASE}\nEste conteúdo não substitui consulta.`;
    expect(checkContent({ front: "psiqway", text }).ok).toBe(true);
  });
  it("exige a marca RASCUNHO/TESTE e a seção de Fontes", () => {
    expect(rules("medfam", "Texto sem marca.\n## Fontes\n- x")).toContain("RASCUNHO");
    expect(rules("medfam", "RASCUNHO/TESTE\nTexto sem fontes.")).toContain("FONTE");
  });
  it("bloqueia as citações do Dr. Saraiva não verificadas", () => {
    expect(rules("corte800", `${BASE}\n(Saraiva & Diehl, 2014)`)).toContain("CITACAO_NAO_VERIFICADA");
    expect(rules("corte800", `${BASE}\n(Saraiva Jr et al., 2015)`)).toContain("CITACAO_NAO_VERIFICADA");
  });
  it("bloqueia promessa de cura e termos etaristas", () => {
    expect(rules("psiqway", `${BASE}\nÉ a cura definitiva.`)).toContain("PROMESSA");
    expect(rules("caminhos", `${BASE}\nO velhinho precisa de cuidado.`)).toContain("ETARISMO");
  });
  it("bloqueia chancela/CRM/RQE sem autorização e libera com autorização", () => {
    const text = `${BASE}\nChancela Médica: Dr. X (CRM-RS 29349 · RQE 30038)`;
    expect(rules("corte800", text)).toContain("CHANCELA");
    expect(rules("corte800", text, { authorizedEndorsement: true })).not.toContain("CHANCELA");
  });
});

describe("crise", () => {
  it("tema de risco exige SAMU 192; ao paciente exige também CVV 188", () => {
    const risco = `${BASE}\nSe houver pensamento de suicídio, procure ajuda.`;
    expect(rules("caminhos", risco)).toContain("CRISE_SAMU");
    expect(rules("psiqway", risco)).toEqual(expect.arrayContaining(["CRISE_SAMU", "CRISE_CVV"]));
    const ok = `${risco} Ligue 188 (CVV) ou 192 (SAMU).`;
    expect(rules("psiqway", ok)).not.toContain("CRISE_CVV");
    expect(rules("psiqway", ok)).not.toContain("CRISE_SAMU");
  });
});

describe("dose e desmame por frente", () => {
  const dose = `${BASE}\nUse 5 mg por dia.`;
  it("nunca em psiqway nem caminhos", () => {
    expect(rules("psiqway", dose)).toContain("DOSE");
    expect(rules("caminhos", dose)).toContain("DOSE");
    expect(rules("caminhos", `${BASE}\nReduzir 25% a cada semana.`)).toContain("DESMAME");
  });
  it("em corte800/medfam só com ressalva e fonte", () => {
    expect(rules("corte800", dose)).toEqual(
      expect.arrayContaining(["DOSE_SEM_RESSALVA", "DOSE_SEM_FONTE"]),
    );
    const ok = `${dose} [F: capitulos/02_delirium.md, tratamento] Não substitui bula nem julgamento clínico.`;
    const r = rules("medfam", ok);
    expect(r).not.toContain("DOSE_SEM_RESSALVA");
    expect(r).not.toContain("DOSE_SEM_FONTE");
  });
});

describe("regras específicas", () => {
  it("psiqway: não diagnostica e exige aviso", () => {
    expect(rules("psiqway", `${BASE}\nVocê tem depressão.`)).toContain("DIAGNOSTICO");
    expect(rules("psiqway", BASE)).toContain("AVISO");
  });
  it("psiqway: avisa de frases longas", () => {
    const frase = Array(45).fill("palavra").join(" ") + ". ";
    const longa = frase.repeat(6);
    expect(averageSentenceLength(longa)).toBeGreaterThan(22);
    const r = checkContent({ front: "psiqway", text: `${BASE}\n${longa}\nNão substitui consulta.` });
    expect(r.violations.find((x) => x.rule === "LEITURA")?.severity).toBe("aviso");
  });
  it("caminhos: bloqueia linguagem estigmatizante", () => {
    expect(rules("caminhos", `${BASE}\nO viciado precisa de ajuda.`)).toContain("ESTIGMA");
  });
});

describe("parseFrontMatter", () => {
  it("lê o cabeçalho simples", () => {
    const { meta, body } = parseFrontMatter("---\nfront: psiqway\ntopic: delirium\n---\nCorpo");
    expect(meta).toEqual({ front: "psiqway", topic: "delirium" });
    expect(body).toBe("Corpo");
  });
  it("sem cabeçalho devolve o texto inteiro", () => {
    expect(parseFrontMatter("só corpo").meta).toEqual({});
  });
});
