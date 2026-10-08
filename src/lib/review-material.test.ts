import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  contarNos,
  corrigirEscolha,
  asFormato,
  driveOpenUrl,
  isSafeMediaUrl,
  parseFlashcards,
  parseMapa,
  parseMidias,
  parseQuiz,
  respostaConfere,
} from "./review-material";
import { REVIEW_KINDS, type JsonValue } from "./review-studio";

describe("mídias", () => {
  it("aceita só http(s) e descarta o resto", () => {
    expect(isSafeMediaUrl("https://drive.google.com/file/d/abc/preview")).toBe(true);
    expect(isSafeMediaUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeMediaUrl("data:text/html,<b>x</b>")).toBe(false);
    expect(isSafeMediaUrl("não é url")).toBe(false);
  });

  it("lê a lista, define formato padrão e ignora itens inválidos", () => {
    const m = parseMidias([
      { url: "https://x.test/a.png", titulo: "Logo", formato: "imagem" },
      { url: "https://x.test/b.mp4" },
      { url: "javascript:1" },
      { titulo: "sem url" },
      "lixo",
    ]);
    expect(m).toEqual([
      { url: "https://x.test/a.png", titulo: "Logo", formato: "imagem" },
      { url: "https://x.test/b.mp4", titulo: "Material", formato: "vertical" },
    ]);
    expect(parseMidias(undefined)).toEqual([]);
  });

  it("usa vertical quando o formato não é reconhecido", () => {
    expect(asFormato("horizontal")).toBe("horizontal");
    expect(asFormato("qualquer")).toBe("vertical");
    expect(asFormato(undefined)).toBe("vertical");
  });

  it("monta o link de abertura do Drive só para arquivos do Drive", () => {
    expect(driveOpenUrl("https://drive.google.com/file/d/ID123/preview")).toBe(
      "https://drive.google.com/file/d/ID123/view",
    );
    expect(driveOpenUrl("https://x.test/a.mp4")).toBeNull();
  });
});

describe("quiz", () => {
  const quiz: JsonValue = {
    title: "Teste",
    questions: [
      {
        type: "multiple_choice",
        question: "Qual?",
        hint: "pense",
        answerOptions: [
          { text: "A", isCorrect: true, rationale: "porque sim" },
          { text: "B", isCorrect: false, rationale: "não" },
        ],
      },
      {
        type: "multiple_select",
        question: "Quais?",
        answerOptions: [
          { text: "A", isCorrect: true },
          { text: "B", isCorrect: true },
          { text: "C", isCorrect: false },
        ],
      },
      {
        type: "fill_in_the_blank",
        question: "A ___ dose",
        bestAnswer: "metade",
        acceptableAnswers: ["1/2", "50%"],
        rationale: "idoso",
      },
      {
        type: "short_answer",
        question: "Conduta?",
        grading: { modelAnswer: "Suspender.", rationale: "risco" },
      },
      { type: "multiple_choice", question: "" },
      { type: "short_answer", question: "sem resposta modelo" },
    ],
  };

  it("normaliza os quatro tipos e descarta perguntas sem conteúdo", () => {
    const q = parseQuiz(quiz);
    expect(q?.titulo).toBe("Teste");
    expect(q?.perguntas.map((p) => p.tipo)).toEqual(["escolha", "escolha", "resposta", "resposta"]);
    const [a, b, c, d] = q!.perguntas;
    expect(a).toMatchObject({ tipo: "escolha", multipla: false, dica: "pense" });
    expect(b).toMatchObject({ tipo: "escolha", multipla: true });
    expect(c).toMatchObject({ tipo: "resposta", modelo: "metade", aceitas: ["1/2", "50%"] });
    expect(d).toMatchObject({ tipo: "resposta", modelo: "Suspender.", justificativa: "risco" });
  });

  it("devolve nulo quando não há perguntas aproveitáveis", () => {
    expect(parseQuiz(undefined)).toBeNull();
    expect(parseQuiz({ title: "x", questions: [] })).toBeNull();
    expect(parseQuiz("texto")).toBeNull();
  });

  it("corrige escolha única e múltipla (certo, parcial, errado)", () => {
    const opcoes = [
      { texto: "A", correta: true, justificativa: "" },
      { texto: "B", correta: true, justificativa: "" },
      { texto: "C", correta: false, justificativa: "" },
    ];
    expect(corrigirEscolha(opcoes, new Set([0, 1]))).toBe("certo");
    expect(corrigirEscolha(opcoes, new Set([0]))).toBe("parcial");
    expect(corrigirEscolha(opcoes, new Set([0, 2]))).toBe("errado");
    expect(corrigirEscolha(opcoes, new Set())).toBe("errado");
  });

  it("confere a resposta digitada sem acento, caixa nem espaços extras", () => {
    expect(respostaConfere("  METADE ", "metade", [])).toBe(true);
    expect(respostaConfere("1/2", "metade", ["1/2", "50%"])).toBe(true);
    expect(respostaConfere("Metadé", "metade", [])).toBe(true);
    expect(respostaConfere("dobro", "metade", ["1/2"])).toBe(false);
    expect(respostaConfere("", "metade", [])).toBe(false);
  });
});

describe("flashcards e mapa mental", () => {
  it("lê cartões do formato do NotebookLM e de lista simples", () => {
    expect(
      parseFlashcards({ title: "x", cards: [{ front: "P?", back: "R" }, { front: "só frente" }] }),
    ).toEqual([{ frente: "P?", verso: "R" }]);
    expect(parseFlashcards([{ front: "a", back: "b" }])).toEqual([{ frente: "a", verso: "b" }]);
    expect(parseFlashcards(null)).toEqual([]);
  });

  it("lê a árvore, conta nós e limita a profundidade", () => {
    const mapa = parseMapa({
      name: "Raiz",
      children: [{ name: "A", children: [{ name: "A1" }] }, { name: "B" }, { children: [] }],
    });
    expect(mapa).toEqual({
      nome: "Raiz",
      filhos: [
        { nome: "A", filhos: [{ nome: "A1", filhos: [] }] },
        { nome: "B", filhos: [] },
      ],
    });
    expect(contarNos(mapa!)).toBe(4);
    expect(parseMapa("x")).toBeNull();

    let fundo: { [k: string]: unknown } = { name: "fim" };
    for (let i = 0; i < 20; i++) fundo = { name: `n${i}`, children: [fundo] };
    expect(contarNos(parseMapa(fundo as never)!)).toBeLessThanOrEqual(10);
  });
});

describe("tipos de item no código e nas migrações", () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const mig = (nome: string) =>
    readFileSync(join(dir, "..", "..", "supabase", "migrations", nome), "utf8");

  it("todo tipo do código é aceito pela restrição mais recente do banco", () => {
    const sql = mig("20261008200000_review_kinds_materiais.sql");
    for (const k of REVIEW_KINDS) expect(sql).toContain(`'${k}'`);
  });

  it("a migração nova só amplia: mantém os seis tipos originais", () => {
    const sql = mig("20261008200000_review_kinds_materiais.sql");
    for (const k of ["video", "frase", "escala", "marca", "pendencia", "estilo"]) {
      expect(sql).toContain(`'${k}'`);
    }
    expect(sql).not.toMatch(/DROP\s+TABLE|DELETE\s+FROM|TRUNCATE/i);
  });
});
