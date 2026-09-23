import { AGE_BAND_LABEL, SYMPTOM_QUESTION, type AgeBand } from "@/config/triage-tree";
import { SCALE_BY_CODE } from "@/lib/scales-data";

export type Decision = { step: string; reason: string };
export type IndicatedScale = { code: string; name: string; reason: string };
export type ScaleSnapshot = {
  scale_code: string;
  score: number | null;
  band: string | null;
  risk?: boolean;
};

export type DecisionRowData = {
  kind: "entrada" | "escalonamento";
  /** característica do paciente que acionou a decisão */
  trigger: string;
  /** critério objetivo observado (escore/banda) quando existir */
  criterion: string | null;
  /** regra aplicada */
  rule: string;
  risk: boolean;
  /** explicação em linguagem clara para o médico */
  plain: string;
};

const SYMPTOM_IDS = new Set(SYMPTOM_QUESTION.options.map((o) => o.id));

export function symptomLabel(id: string) {
  return SYMPTOM_QUESTION.options.find((o) => o.id === id)?.label ?? id;
}

export function ageBandLabel(band?: string | null, age?: number | null) {
  if (!band) return age != null ? `${age} anos` : null;
  const label = AGE_BAND_LABEL[band as AgeBand] ?? band;
  return age != null ? `${label} · ${age} anos` : label;
}

/** Traduz a trilha bruta em linhas "característica → critério → regra". */
export function buildDecisionRows(
  decisions: Decision[],
  results: ScaleSnapshot[],
  ageLabel: string | null,
): DecisionRowData[] {
  const byCode = new Map(results.map((r) => [r.scale_code, r]));

  return decisions.map((d) => {
    if (SYMPTOM_IDS.has(d.step)) {
      return {
        kind: "entrada" as const,
        trigger: symptomLabel(d.step),
        criterion: ageLabel,
        rule: d.reason,
        risk: /risco/i.test(d.reason),
        plain: `O paciente marcou “${symptomLabel(d.step).toLowerCase()}” na queixa inicial${
          ageLabel ? ` e está na faixa ${ageLabel.toLowerCase()}` : ""
        }. ${d.reason}.`,
      };
    }

    const scale = SCALE_BY_CODE[d.step];
    const r = byCode.get(d.step);
    const criterion =
      r && r.score != null ? `Escore ${r.score}${r.band ? ` — ${r.band}` : ""}` : ageLabel;

    const entradaPorSintoma = /^Sintoma "|^Rastreio geral/.test(d.reason);
    const nome = scale ? `${scale.code} (${scale.fullName})` : d.step;
    const resultado =
      r && r.score != null
        ? ` O resultado foi ${r.score}${r.band ? `, classificado como ${r.band.toLowerCase()}` : ""}.`
        : "";

    const plain = entradaPorSintoma
      ? `A escala ${nome} entrou no questionário porque ${d.reason.toLowerCase()}.${resultado}`
      : `A escala ${nome} foi acrescentada durante o preenchimento: ${d.reason.toLowerCase()}.${resultado}`;

    return {
      kind: entradaPorSintoma ? ("entrada" as const) : ("escalonamento" as const),
      trigger: scale ? `${scale.code} — ${scale.name}` : d.step,
      criterion: entradaPorSintoma ? ageLabel : criterion,
      rule: d.reason,
      risk: Boolean(r?.risk) || /risco|suic/i.test(d.reason),
      plain,
    };
  });
}

/** Monta a explicação corrida, em linguagem clara, do caminho percorrido. */
export function buildNarrative({
  ageLabel,
  symptoms,
  entradas,
  escalonamentos,
  indicated,
  riskPathway,
}: {
  ageLabel: string | null;
  symptoms: string[];
  entradas: DecisionRowData[];
  escalonamentos: DecisionRowData[];
  indicated: IndicatedScale[];
  riskPathway?: boolean;
}): string[] {
  const out: string[] = [];
  const queixas = symptoms.map((s) => symptomLabel(s).toLowerCase());

  out.push(
    `Paciente ${ageLabel ? `na faixa ${ageLabel.toLowerCase()}` : "sem idade informada"}${
      queixas.length
        ? `, que relatou ${queixas.join(", ")} na queixa inicial.`
        : ", sem queixa específica marcada na abertura."
    }`,
  );

  out.push(
    entradas.length
      ? `A partir da idade e dessas queixas, o sistema abriu ${entradas.length} instrumento(s) de entrada: ${entradas
          .map((e) => e.trigger)
          .join("; ")}.`
      : "Nenhum instrumento foi aberto automaticamente pela idade ou pelas queixas iniciais.",
  );

  out.push(
    escalonamentos.length
      ? `Durante o preenchimento, as respostas atingiram pontos de corte e acrescentaram ${escalonamentos.length} escala(s) de aprofundamento: ${escalonamentos
          .map((e) => `${e.trigger}${e.criterion ? ` (${e.criterion})` : ""}`)
          .join("; ")}.`
      : "Nenhuma resposta atingiu ponto de corte que exigisse aprofundamento adicional.",
  );

  out.push(
    riskPathway
      ? "Foram identificados sinais de risco: a via de risco foi ativada, o paciente recebeu orientação de emergência na tela e o caso deve ter prioridade de agendamento e avaliação presencial."
      : "Não foram identificados critérios de risco imediato; o caso segue o fluxo padrão de agendamento.",
  );

  if (indicated.length) {
    out.push(
      `Ficaram indicadas, mas não aplicadas online, ${indicated.length} escala(s) — ${indicated
        .map((i) => i.code)
        .join(", ")} — que devem ser consideradas na consulta.`,
    );
  }

  return out;
}

/** Resumo + trilha prontos para renderização (painel e PDF). */
export function buildDecisionSummary(input: {
  decisions: Decision[];
  results: ScaleSnapshot[];
  symptoms: string[];
  indicated: IndicatedScale[];
  ageBand?: string | null;
  age?: number | null;
  riskPathway?: boolean;
}) {
  const ageLabel = ageBandLabel(input.ageBand, input.age);
  const rows = buildDecisionRows(input.decisions, input.results, ageLabel);
  const entradas = rows.filter((r) => r.kind === "entrada");
  const escalonamentos = rows.filter((r) => r.kind === "escalonamento");
  const narrative = buildNarrative({
    ageLabel,
    symptoms: input.symptoms,
    entradas,
    escalonamentos,
    indicated: input.indicated,
    riskPathway: input.riskPathway,
  });
  return { ageLabel, rows, entradas, escalonamentos, narrative };
}
