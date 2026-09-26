/**
 * Checklist de QC clínico para conteúdo de psicoeducação gerado por IA.
 *
 * Redesenho deliberado do "DNA CENE" (esteira de origem que inspirou este
 * módulo): lá, o objetivo era NUNCA aprofundar risco de suicídio num
 * material dirigido a profissionais em formação. Aqui o triagem-medica fala
 * com pacientes reais e já tem um protocolo de crise ativo (PHQ-9 item 9 ≥
 * 1 / C-SSRS positivo → CVV 188 / SAMU 192, ver
 * `documentação viva/07_SKILLS_E_RULES_AGENTICAS.md`) — então a postura
 * correta é o OPOSTO: exigir ativamente a presença desses canais sempre que
 * o conteúdo tocar em risco/crise, não suprimir o assunto.
 *
 * Isto nunca substitui a aprovação humana (etapa final antes de publicar) —
 * só produz `notes` visíveis ao admin no painel antes de aprovar/rejeitar.
 */

const CRISIS_KEYWORDS =
  /suic[ií]d|autoles[aã]o|automutila[cç][aã]o|n[aã]o.{0,15}quero.{0,15}viver|acabar com (a|minha) vida/i;

const CRISIS_CHANNELS_PATTERN = /\b188\b/;
const SAMU_PATTERN = /\b192\b/;

const NAMED_DOCTOR_PATTERN = /\bDr\.?a?\.?\s+[A-ZÀ-Ú][a-zà-ú]+(\s+[A-ZÀ-Ú][a-zà-ú]+)*/;

const DOSAGE_PATTERN = /\b\d+([.,]\d+)?\s?(mg|mcg|ml|g|comprimidos?|cápsulas?)\b/i;

const CLOSED_DIAGNOSIS_PATTERN =
  /voc[eê]\s+(tem|possui|sofre de|est[aá] com)\s+(depress[aã]o|ansiedade|transtorno|tdah|bipolaridade|burnout)/i;

const SELF_HARM_METHOD_PATTERN =
  /(como|maneiras?|formas?)\s+(de\s+)?(se\s+)?(matar|cortar|enforcar|envenenar)/i;

export type PsychoeducationQCResult = {
  /** Avisos e observações — sempre exibidos ao admin antes de aprovar. */
  notes: string[];
  /**
   * true quando há um achado que exige revisão humana atenta antes de
   * qualquer aprovação (nunca bloqueia a gravação do job — só sinaliza).
   */
  hasCriticalIssues: boolean;
};

/**
 * Roda o checklist sobre um texto gerado (leitura, quiz, flashcards) para um
 * job de geração de psicoeducação.
 *
 * @param text Texto gerado a ser verificado.
 * @param opts.isCrisisTopic O tópico já é classificado como crise/risco
 *   (ex.: slug `crise-emocional`) — nesse caso a exigência dos canais de
 *   emergência é sempre aplicada, mesmo que o texto em si não contenha as
 *   palavras-chave de risco (para blindar contra geração incompleta).
 */
export function runPsychoeducationQC(
  text: string,
  opts: { isCrisisTopic: boolean },
): PsychoeducationQCResult {
  const notes: string[] = [];
  let hasCriticalIssues = false;

  const touchesCrisis = opts.isCrisisTopic || CRISIS_KEYWORDS.test(text);
  if (touchesCrisis) {
    const hasCvv = CRISIS_CHANNELS_PATTERN.test(text);
    const hasSamu = SAMU_PATTERN.test(text);
    if (!hasCvv || !hasSamu) {
      notes.push(
        "Conteúdo toca em crise/risco mas não menciona os dois canais de emergência obrigatórios (CVV 188 e SAMU 192). Corrigir antes de aprovar.",
      );
      hasCriticalIssues = true;
    }
  }

  if (NAMED_DOCTOR_PATTERN.test(text)) {
    notes.push(
      'Texto nomeia um médico específico ("Dr./Dra. ..."). Trocar por "profissional especializado" — pendência clínica nunca deve apontar para uma pessoa específica.',
    );
    hasCriticalIssues = true;
  }

  if (DOSAGE_PATTERN.test(text)) {
    notes.push(
      "Texto contém uma dose/quantidade de medicamento. Material de psicoeducação não deve prescrever nem sugerir dosagem — revisar antes de aprovar.",
    );
    hasCriticalIssues = true;
  }

  if (CLOSED_DIAGNOSIS_PATTERN.test(text)) {
    notes.push(
      'Texto afirma um diagnóstico fechado ("você tem X"). Psicoeducação deve informar, não diagnosticar — revisar antes de aprovar.',
    );
    hasCriticalIssues = true;
  }

  if (SELF_HARM_METHOD_PATTERN.test(text)) {
    notes.push(
      "Texto parece descrever método de autolesão/suicídio. Isto nunca pode ser publicado — revisar e regenerar.",
    );
    hasCriticalIssues = true;
  }

  return { notes, hasCriticalIssues };
}
