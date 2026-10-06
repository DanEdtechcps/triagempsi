/**
 * Guardrails de conteúdo educativo gerado a partir do material do Dr. Saraiva.
 *
 * Quatro frentes, cada uma com regras próprias (não há herança do CENE):
 *  - psiqway  : paciente idoso e família/cuidador (leitura simples, nunca dose/diagnóstico);
 *  - caminhos : equipe de CAPS / redução de danos (sem moralismo, sem esquema de dose);
 *  - corte800 : médico/estudante (raciocínio clínico; dose só com fonte e ressalva);
 *  - medfam   : médico de família e equipe da APS (formação; sem decisão clínica individual).
 *
 * Lint determinístico e sem rede: devolve violações (erro) e avisos. Nada aqui
 * decide clínica; só impede que um rascunho saia com um defeito conhecido.
 */

export type ContentFront = "psiqway" | "caminhos" | "corte800" | "medfam";

export type GuardrailSeverity = "erro" | "aviso";

export type GuardrailViolation = {
  rule: string;
  severity: GuardrailSeverity;
  message: string;
  excerpt?: string;
};

export type GuardrailInput = {
  front: ContentFront;
  text: string;
  /** Só `true` depois de autorização escrita do Dr. Saraiva para esta peça. */
  authorizedEndorsement?: boolean;
  /** Exige a marca RASCUNHO/TESTE (padrão: sim, enquanto nada foi aprovado). */
  requireDraftMark?: boolean;
};

export type GuardrailResult = {
  ok: boolean;
  violations: GuardrailViolation[];
};

const excerptOf = (text: string, index: number, len = 80) =>
  text
    .slice(Math.max(0, index - 20), index + len)
    .replace(/\s+/g, " ")
    .trim();

/** dose: número + unidade de medicamento, ou esquema percentual de redução. */
const DOSE_RE =
  /\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|ug|g\/dia|gotas?|comprimidos?|cps?|ml)\b(?:\s*(?:\/|por|ao)\s*(?:dia|noite|vez|dose))?/gi;
const TAPER_RE =
  /\b(?:reduz\w*|diminu\w*|retir\w*)\b[^.\n]{0,60}\b\d{1,3}\s*(?:%|por cento)/gi;

const RISK_RE =
  /suic[ií]d|autoles[ãa]o|se matar|tirar a pr[óo]pria vida|overdose|intoxica[çc][ãa]o|abstin[êe]ncia (?:grave|alco[óo]lica)|delirium tremens|ideia[çc][ãa]o/gi;

const ENDORSEMENT_RE = /chancela m[ée]dica|\bCRM[-\s/]*[A-Z]{0,2}\s*\d{3,}|\bRQE\s*\d{2,}/gi;

/** Citações atribuídas ao Dr. Saraiva que não foram localizadas em nenhuma base (aguardam confirmação dele). */
const UNVERIFIED_CITATIONS_RE =
  /Saraiva\s*(?:&|e|and)\s*Diehl\s*,?\s*2014|Saraiva\s*Jr\.?\s*et\s*al\.?\s*,?\s*2015/gi;

const PROMISE_RE = /cura definitiva|solu[çc][ãa]o m[áa]gica|100\s*%\s*eficaz|resultado garantido|garantimos/gi;

const AGEIST_RE = /\bvelhinh[oa]s?\b|\bidosinh[oa]s?\b|\bdecr[ée]pit\w*|\bcaduc\w*|\bsenil\w*\b/gi;

const STIGMA_RE = /\bdrogad[oa]s?\b|\bviciad[oa]s?\b|\bnoi[ao]s?\b|\bcracud[oa]s?\b|\bb[êe]bad[oa]s?\b|\bjunkies?\b/gi;

const DIAGNOSIS_TO_PATIENT_RE =
  /\bvoc[êe]\s+(?:tem|est[áa] com|sofre de|apresenta)\s+(?:um\s+|uma\s+)?(?:depress|transtorno|bipolar|dem[êe]ncia|alzheimer|delirium|ansiedade generalizada)/gi;

const SOURCE_MARK_RE = /(?:^|\n)\s*(?:#{1,6}\s*)?(?:fontes?\b|refer[êe]ncias?\b)/i;
const DISCLAIMER_RE = /n[ãa]o substitui/i;

function collect(
  text: string,
  re: RegExp,
  build: (m: RegExpExecArray) => GuardrailViolation,
): GuardrailViolation[] {
  const out: GuardrailViolation[] = [];
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push(build(m));
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return out;
}

/** Média de palavras por frase (aproximação) — conteúdo ao paciente deve ser curto e simples. */
export function averageSentenceLength(text: string): number {
  const clean = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^\s*[#>|-].*$/gm, " ")
    .replace(/\[[^\]]*\]\([^)]*\)/g, " ");
  const sentences = clean.split(/[.!?]+\s/).filter((s) => s.trim().split(/\s+/).length > 2);
  if (!sentences.length) return 0;
  const words = sentences.reduce((n, s) => n + s.trim().split(/\s+/).length, 0);
  return words / sentences.length;
}

export function checkContent(input: GuardrailInput): GuardrailResult {
  const { front, text } = input;
  const v: GuardrailViolation[] = [];
  const err = (rule: string, message: string, excerpt?: string): GuardrailViolation => ({
    rule,
    severity: "erro",
    message,
    excerpt,
  });
  const warn = (rule: string, message: string, excerpt?: string): GuardrailViolation => ({
    rule,
    severity: "aviso",
    message,
    excerpt,
  });

  // Piso comum -------------------------------------------------------------
  if (input.requireDraftMark !== false && !/RASCUNHO\s*\/\s*TESTE/i.test(text)) {
    v.push(err("RASCUNHO", "Falta a marca RASCUNHO/TESTE (nada foi aprovado para publicação)."));
  }
  if (!SOURCE_MARK_RE.test(text)) {
    v.push(err("FONTE", "Falta a seção de Fontes (toda afirmação precisa ser rastreável)."));
  }
  v.push(
    ...collect(text, UNVERIFIED_CITATIONS_RE, (m) =>
      err(
        "CITACAO_NAO_VERIFICADA",
        "Citação atribuída ao Dr. Saraiva que não foi localizada em nenhuma base; aguardar confirmação dele.",
        m[0],
      ),
    ),
  );
  v.push(
    ...collect(text, PROMISE_RE, (m) =>
      err("PROMESSA", "Promessa de resultado/“cura” é proibida.", m[0]),
    ),
  );
  v.push(
    ...collect(text, AGEIST_RE, (m) =>
      err("ETARISMO", "Termo etarista/estigmatizante para pessoa idosa.", m[0]),
    ),
  );
  if (!input.authorizedEndorsement) {
    v.push(
      ...collect(text, ENDORSEMENT_RE, (m) =>
        err(
          "CHANCELA",
          "Chancela médica/CRM/RQE só com autorização escrita do Dr. Saraiva para esta peça.",
          m[0],
        ),
      ),
    );
  }

  // Risco / crise ----------------------------------------------------------
  const mentionsRisk = RISK_RE.test(text);
  RISK_RE.lastIndex = 0;
  if (mentionsRisk) {
    if (!/\b192\b/.test(text)) {
      v.push(err("CRISE_SAMU", "Tema de risco sem o SAMU 192."));
    }
    if (front === "psiqway" && !/\b188\b/.test(text)) {
      v.push(err("CRISE_CVV", "Conteúdo ao paciente com tema de risco precisa do CVV 188."));
    }
  }

  // Regras por frente ------------------------------------------------------
  const hasDose = DOSE_RE.test(text);
  DOSE_RE.lastIndex = 0;
  const hasTaper = TAPER_RE.test(text);
  TAPER_RE.lastIndex = 0;

  if (front === "psiqway" || front === "caminhos") {
    v.push(
      ...collect(text, DOSE_RE, (m) =>
        err(
          "DOSE",
          front === "psiqway"
            ? "Conteúdo ao paciente nunca traz dose."
            : "Conteúdo da equipe de CAPS não traz dose nem esquema de prescrição.",
          excerptOf(text, m.index),
        ),
      ),
    );
    v.push(
      ...collect(text, TAPER_RE, (m) =>
        err("DESMAME", "Esquema percentual de redução/desmame não entra neste conteúdo.", m[0]),
      ),
    );
  } else if (hasDose || hasTaper) {
    // corte800 e medfam: dose só com fonte e ressalva explícita.
    if (!DISCLAIMER_RE.test(text)) {
      v.push(
        err(
          "DOSE_SEM_RESSALVA",
          'Dose citada sem a ressalva "não substitui bula nem julgamento clínico".',
        ),
      );
    }
    if (!/\[F:[^\]]+\]/.test(text)) {
      v.push(
        err("DOSE_SEM_FONTE", "Dose citada sem marcador de fonte no formato [F: capitulo, trecho]."),
      );
    }
  }

  if (front === "psiqway") {
    v.push(
      ...collect(text, DIAGNOSIS_TO_PATIENT_RE, (m) =>
        err("DIAGNOSTICO", "Conteúdo ao paciente não diagnostica ('você tem …').", m[0]),
      ),
    );
    if (!DISCLAIMER_RE.test(text)) {
      v.push(err("AVISO", 'Falta o aviso "não substitui consulta" para o paciente.'));
    }
    const avg = averageSentenceLength(text);
    if (avg > 22) {
      v.push(
        warn(
          "LEITURA",
          `Frases longas para paciente idoso (média ${avg.toFixed(1)} palavras; ideal ≤ 20).`,
        ),
      );
    }
  }

  if (front === "caminhos") {
    v.push(
      ...collect(text, STIGMA_RE, (m) =>
        err(
          "ESTIGMA",
          'Linguagem estigmatizante; use "pessoa que usa …" (redução de danos).',
          m[0],
        ),
      ),
    );
  }

  if (front === "medfam" || front === "corte800") {
    if (!/n[ãa]o substitui/i.test(text) && !/julgamento cl[ií]nico/i.test(text)) {
      v.push(warn("AVISO_PROFISSIONAL", "Sem a ressalva de que não substitui o julgamento clínico."));
    }
  }
  if (front === "medfam") {
    if (/\b(?:seu|esse|este) paciente (?:deve|precisa)\b/i.test(text)) {
      v.push(
        warn(
          "DECISAO_INDIVIDUAL",
          "Evite recomendação individual a paciente (conteúdo é formação, não decisão clínica).",
        ),
      );
    }
  }

  return { ok: !v.some((x) => x.severity === "erro"), violations: v };
}

/** Lê o cabeçalho `---` simples (chave: valor) de um arquivo de conteúdo. */
export function parseFrontMatter(raw: string): { meta: Record<string, string>; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!m) return { meta: {}, body: raw };
  const meta: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z0-9_]+)\s*:\s*(.*)$/.exec(line);
    if (kv) meta[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return { meta, body: raw.slice(m[0].length) };
}

export const CONTENT_FRONTS: ContentFront[] = ["psiqway", "caminhos", "corte800", "medfam"];

export function isContentFront(v: string): v is ContentFront {
  return (CONTENT_FRONTS as string[]).includes(v);
}
