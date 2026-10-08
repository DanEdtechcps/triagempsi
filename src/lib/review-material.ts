/**
 * Estúdio de validação — leitura dos materiais de psicoeducação (quiz, flashcards, mapa mental, mídias).
 * Lógica pura e tolerante: o catálogo vem de JSON gerado por ferramentas externas, então cada
 * leitor ignora o que não reconhece em vez de quebrar a tela.
 */
import type { JsonValue } from "./review-studio";

type Obj = { [key: string]: JsonValue };

function obj(v: JsonValue | undefined): Obj | null {
  return v && typeof v === "object" && !Array.isArray(v) ? v : null;
}

function text(v: JsonValue | undefined): string {
  return typeof v === "string" ? v.trim() : "";
}

function list(v: JsonValue | undefined): JsonValue[] {
  return Array.isArray(v) ? v : [];
}

// ---------- Mídias (Drive, imagem, vídeo, PDF, áudio) ----------

export const MIDIA_FORMATOS = [
  "vertical",
  "horizontal",
  "pagina",
  "imagem",
  "logo",
  "audio",
] as const;
export type MidiaFormato = (typeof MIDIA_FORMATOS)[number];

export type MidiaRef = { url: string; titulo: string; formato: MidiaFormato };

/** Formato declarado no catálogo; o padrão (vertical) é o dos vídeos curtos de 9:16. */
export function asFormato(v: JsonValue | undefined): MidiaFormato {
  const t = text(v);
  return (MIDIA_FORMATOS as readonly string[]).includes(t) ? (t as MidiaFormato) : "vertical";
}

/** Aceita só http(s): o catálogo não pode injetar `javascript:` nem `data:` no iframe/vídeo. */
export function isSafeMediaUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export function parseMidias(v: JsonValue | undefined): MidiaRef[] {
  return list(v).flatMap((m) => {
    const o = obj(m);
    const url = text(o?.url);
    if (!o || !url || !isSafeMediaUrl(url)) return [];
    return [{ url, titulo: text(o.titulo) || "Material", formato: asFormato(o.formato) }];
  });
}

const DRIVE_FILE = /drive\.google\.com\/file\/d\/([^/?#]+)/;

/** Link para abrir o arquivo do Drive numa aba (útil quando o visualizador embutido não carrega). */
export function driveOpenUrl(url: string): string | null {
  const id = DRIVE_FILE.exec(url)?.[1];
  return id ? `https://drive.google.com/file/d/${id}/view` : null;
}

export function isDriveUrl(url: string): boolean {
  return url.includes("drive.google.com");
}

// ---------- Quiz ----------

export type QuizOpcao = { texto: string; correta: boolean; justificativa: string };

export type QuizPergunta =
  | {
      tipo: "escolha";
      multipla: boolean;
      pergunta: string;
      dica: string;
      opcoes: QuizOpcao[];
    }
  | {
      tipo: "resposta";
      pergunta: string;
      dica: string;
      /** Resposta esperada (lacuna) ou resposta-modelo (resposta curta). */
      modelo: string;
      aceitas: string[];
      justificativa: string;
    };

export type Quiz = { titulo: string; perguntas: QuizPergunta[] };

export function parseQuiz(v: JsonValue | undefined): Quiz | null {
  const o = obj(v);
  if (!o) return null;
  const perguntas = list(o.questions).flatMap((q): QuizPergunta[] => {
    const qo = obj(q);
    const pergunta = text(qo?.question);
    if (!qo || !pergunta) return [];
    const dica = text(qo.hint);
    const opcoes = list(qo.answerOptions).flatMap((a): QuizOpcao[] => {
      const ao = obj(a);
      const texto = text(ao?.text);
      if (!ao || !texto) return [];
      return [{ texto, correta: ao.isCorrect === true, justificativa: text(ao.rationale) }];
    });
    if (opcoes.length >= 2) {
      const corretas = opcoes.filter((x) => x.correta).length;
      return [
        {
          tipo: "escolha",
          multipla: corretas > 1 || text(qo.type) === "multiple_select",
          pergunta,
          dica,
          opcoes,
        },
      ];
    }
    const grading = obj(qo.grading);
    const modelo = text(qo.bestAnswer) || text(grading?.modelAnswer);
    if (!modelo) return [];
    return [
      {
        tipo: "resposta",
        pergunta,
        dica,
        modelo,
        aceitas: list(qo.acceptableAnswers).map(text).filter(Boolean),
        justificativa: text(qo.rationale) || text(grading?.rationale),
      },
    ];
  });
  return perguntas.length ? { titulo: text(o.title) || "Quiz", perguntas } : null;
}

export type ResultadoEscolha = "certo" | "parcial" | "errado";

/** Corrige uma pergunta de escolha: `marcadas` são os índices selecionados. */
export function corrigirEscolha(
  opcoes: QuizOpcao[],
  marcadas: ReadonlySet<number>,
): ResultadoEscolha {
  const corretas = opcoes.flatMap((o, i) => (o.correta ? [i] : []));
  const acertos = corretas.filter((i) => marcadas.has(i)).length;
  const erros = [...marcadas].filter((i) => !opcoes[i]?.correta).length;
  if (corretas.length > 0 && acertos === corretas.length && erros === 0) return "certo";
  if (acertos > 0 && erros === 0) return "parcial";
  return "errado";
}

function normalizar(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Compara a resposta digitada (lacuna) com a esperada e as aceitas, sem acento nem caixa. */
export function respostaConfere(digitada: string, modelo: string, aceitas: string[]): boolean {
  const d = normalizar(digitada);
  if (!d) return false;
  return [modelo, ...aceitas].some((a) => normalizar(a) === d);
}

// ---------- Flashcards ----------

export type Flashcard = { frente: string; verso: string };

export function parseFlashcards(v: JsonValue | undefined): Flashcard[] {
  const raw = Array.isArray(v) ? v : list(obj(v)?.cards);
  return raw.flatMap((c) => {
    const co = obj(c);
    const frente = text(co?.front);
    const verso = text(co?.back);
    return co && frente && verso ? [{ frente, verso }] : [];
  });
}

// ---------- Mapa mental ----------

export type MapaNo = { nome: string; filhos: MapaNo[] };

const MAPA_PROFUNDIDADE_MAX = 8;

export function parseMapa(v: JsonValue | undefined, nivel = 0): MapaNo | null {
  const o = obj(v);
  const nome = text(o?.name);
  if (!o || !nome || nivel > MAPA_PROFUNDIDADE_MAX) return null;
  const filhos = list(o.children).flatMap((c) => {
    const f = parseMapa(c, nivel + 1);
    return f ? [f] : [];
  });
  return { nome, filhos };
}

export function contarNos(no: MapaNo): number {
  return 1 + no.filhos.reduce((n, f) => n + contarNos(f), 0);
}
