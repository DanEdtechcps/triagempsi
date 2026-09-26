import { describe, expect, test } from "vitest";
import {
  buildWorkersAiPrompt,
  extractJsonArray,
  partitionRequestedFormats,
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
