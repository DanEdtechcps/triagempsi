import { describe, expect, test } from "vitest";
import {
  buildWorkersAiPrompt,
  extractJsonArray,
  humanizeServerFnError,
  partitionRequestedFormats,
  WORKERS_AI_TEXT_MODEL,
} from "@/lib/psychoeducation-generation.functions";

describe("partitionRequestedFormats", () => {
  test("separa formatos de texto (Fase 1) dos formatos de mídia (Fase 2)", () => {
    // Arrange
    const requested = ["leitura", "quiz", "podcast", "video"];

    // Act
    const { textFormats, mediaFormats } = partitionRequestedFormats(requested);

    // Assert
    expect(textFormats).toEqual(["leitura", "quiz"]);
    expect(mediaFormats).toEqual(["podcast", "video"]);
  });

  test("retorna listas vazias quando nada foi pedido", () => {
    // Arrange / Act
    const { textFormats, mediaFormats } = partitionRequestedFormats([]);

    // Assert
    expect(textFormats).toEqual([]);
    expect(mediaFormats).toEqual([]);
  });
});

describe("extractJsonArray", () => {
  test("faz parse direto quando a resposta já é um array JSON puro", () => {
    // Arrange
    const raw = '[{"front":"a","back":"b"}]';

    // Act
    const result = extractJsonArray(raw);

    // Assert
    expect(result).toEqual([{ front: "a", back: "b" }]);
  });

  test("extrai o array JSON de uma resposta com texto ao redor (comportamento real de LLM)", () => {
    // Arrange
    const raw = 'Aqui está o quiz solicitado:\n\n[{"question":"q1"}]\n\nEspero que ajude!';

    // Act
    const result = extractJsonArray(raw);

    // Assert
    expect(result).toEqual([{ question: "q1" }]);
  });

  test("retorna null quando não há array JSON válido na resposta", () => {
    // Arrange
    const raw = "Desculpe, não consegui gerar o quiz.";

    // Act
    const result = extractJsonArray(raw);

    // Assert
    expect(result).toBeNull();
  });

  // Regressão do incidente de 2026-09-26: o job "burnout 2" quebrou com
  // "raw.match is not a function" porque o Workers AI devolveu `response`
  // num formato que não era string pura, e o código chamava .match() sem
  // checar o tipo antes.
  test("não estoura quando a resposta já vem como array (em vez de string)", () => {
    // Arrange
    const raw = [{ front: "a", back: "b" }];

    // Act
    const result = extractJsonArray(raw);

    // Assert
    expect(result).toEqual([{ front: "a", back: "b" }]);
  });

  test("retorna null em vez de estourar quando a resposta não é string nem array", () => {
    // Arrange / Act / Assert — não deve lançar "raw.match is not a function"
    expect(extractJsonArray(undefined)).toBeNull();
    expect(extractJsonArray(null)).toBeNull();
    expect(extractJsonArray(42)).toBeNull();
    expect(extractJsonArray({ question: "q1" })).toBeNull();
  });
});

describe("buildWorkersAiPrompt", () => {
  test("inclui o guardrail clínico e o material de referência em todo prompt", () => {
    // Arrange
    const material = "Diretriz sobre higiene do sono.";

    // Act
    const prompt = buildWorkersAiPrompt(material, "leitura");

    // Assert
    expect(prompt).toContain("CVV 188");
    expect(prompt).toContain("SAMU 192");
    expect(prompt).toContain(material);
  });

  test("pede explicitamente JSON para quiz e flashcards, mas não para leitura", () => {
    // Arrange
    const material = "Diretriz de exemplo.";

    // Act
    const quizPrompt = buildWorkersAiPrompt(material, "quiz");
    const flashcardsPrompt = buildWorkersAiPrompt(material, "flashcards");
    const leituraPrompt = buildWorkersAiPrompt(material, "leitura");

    // Assert
    expect(quizPrompt).toContain("JSON");
    expect(flashcardsPrompt).toContain("JSON");
    expect(leituraPrompt).not.toContain("JSON");
  });
});

describe("humanizeServerFnError", () => {
  test("extrai a mensagem legível de um array de issues do Zod (o bug real reportado)", () => {
    // Arrange — exatamente o formato que .parse() lança e o cliente recebe
    const zodIssue = [
      {
        code: "too_small",
        message: "O material precisa ter pelo menos 50 caracteres.",
        path: ["source_material"],
      },
    ];
    const err = new Error(JSON.stringify(zodIssue));

    // Act
    const result = humanizeServerFnError(err);

    // Assert
    expect(result).toBe("O material precisa ter pelo menos 50 caracteres.");
  });

  test("junta várias mensagens de issues quando há mais de uma", () => {
    // Arrange
    const zodIssues = [
      { code: "custom", message: "Primeira mensagem." },
      { code: "custom", message: "Segunda mensagem." },
    ];
    const err = new Error(JSON.stringify(zodIssues));

    // Act
    const result = humanizeServerFnError(err);

    // Assert
    expect(result).toBe("Primeira mensagem. Segunda mensagem.");
  });

  test("devolve a mensagem original quando não é um array JSON de issues", () => {
    // Arrange
    const err = new Error("Não foi possível salvar as alterações.");

    // Act
    const result = humanizeServerFnError(err);

    // Assert
    expect(result).toBe("Não foi possível salvar as alterações.");
  });

  test("devolve um texto genérico quando o erro não tem mensagem", () => {
    // Arrange / Act
    const result = humanizeServerFnError(undefined);

    // Assert
    expect(result).toBe("Não foi possível concluir a operação.");
  });
});

// Regressão do incidente de 2026-09-26: @cf/meta/llama-3.1-8b-instruct
// (sem sufixo) foi descontinuado pela Cloudflare e resolvia silenciosamente
// para uma variante "infire" também descontinuada, fazendo todo job cair em
// "erro". Trava o nome exato do modelo pra um erro de digitação/regressão
// não reintroduzir silenciosamente um alias descontinuado.
describe("WORKERS_AI_TEXT_MODEL", () => {
  test("não é o alias descontinuado que já quebrou em produção", () => {
    expect(WORKERS_AI_TEXT_MODEL).not.toBe("@cf/meta/llama-3.1-8b-instruct");
    expect(WORKERS_AI_TEXT_MODEL).not.toContain("infire");
  });
});
