import { describe, expect, test } from "vitest";
import { runPsychoeducationQC } from "./psychoeducation-qc";

describe("runPsychoeducationQC", () => {
  test("aprova sem observações um texto neutro sobre higiene do sono", () => {
    // Arrange
    const text = "Manter horário fixo para dormir e acordar ajuda a regular o ritmo circadiano.";

    // Act
    const result = runPsychoeducationQC(text, { isCrisisTopic: false });

    // Assert
    expect(result.hasCriticalIssues).toBe(false);
    expect(result.notes).toEqual([]);
  });

  test("bloqueia tópico de crise sem CVV 188 nem SAMU 192 (teste negativo do plano)", () => {
    // Arrange — texto de crise deliberadamente incompleto, sem os canais de emergência
    const text = "Se você está pensando em suicídio, converse com alguém de confiança agora.";

    // Act
    const result = runPsychoeducationQC(text, { isCrisisTopic: true });

    // Assert
    expect(result.hasCriticalIssues).toBe(true);
    expect(result.notes.some((n) => n.includes("CVV 188"))).toBe(true);
  });

  test("aprova tópico de crise quando os dois canais de emergência estão presentes", () => {
    // Arrange
    const text =
      "Se você está em sofrimento intenso, ligue para o CVV 188 (24h, gratuito) ou o SAMU 192.";

    // Act
    const result = runPsychoeducationQC(text, { isCrisisTopic: true });

    // Assert
    expect(result.hasCriticalIssues).toBe(false);
  });

  test("sinaliza texto que nomeia um médico específico", () => {
    // Arrange
    const text = "Procure o Dr. José Saraiva para uma avaliação completa.";

    // Act
    const result = runPsychoeducationQC(text, { isCrisisTopic: false });

    // Assert
    expect(result.hasCriticalIssues).toBe(true);
    expect(result.notes.some((n) => n.includes("profissional especializado"))).toBe(true);
  });

  test("sinaliza texto com dosagem de medicamento", () => {
    // Arrange
    const text = "Tome 50mg do medicamento antes de dormir.";

    // Act
    const result = runPsychoeducationQC(text, { isCrisisTopic: false });

    // Assert
    expect(result.hasCriticalIssues).toBe(true);
    expect(result.notes.some((n) => n.toLowerCase().includes("dosagem"))).toBe(true);
  });

  test("sinaliza texto com diagnóstico fechado", () => {
    // Arrange
    const text = "Você tem depressão e precisa iniciar tratamento imediatamente.";

    // Act
    const result = runPsychoeducationQC(text, { isCrisisTopic: false });

    // Assert
    expect(result.hasCriticalIssues).toBe(true);
    expect(result.notes.some((n) => n.toLowerCase().includes("diagnóstico"))).toBe(true);
  });

  test("sinaliza texto que descreve método de autolesão", () => {
    // Arrange
    const text = "Este artigo explica formas de se enforcar em situações extremas.";

    // Act
    const result = runPsychoeducationQC(text, { isCrisisTopic: false });

    // Assert
    expect(result.hasCriticalIssues).toBe(true);
  });
});
