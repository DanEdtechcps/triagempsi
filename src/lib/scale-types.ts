/**
 * Tipos do motor de escalas. As escalas são apenas dados (JSON-like):
 * adicionar uma escala nova = adicionar um objeto, sem tocar em componente.
 */

export type LikertOption = { label: string; value: number };

export type ScaleItem = {
  id: string;
  text: string;
  /** opções específicas do item (sobrescrevem as da escala) */
  options?: LikertOption[];
  /**
   * Grupo de ramificação (ex.: substância no ASSIST-Lite). Quando a
   * pergunta-porta do grupo vale 0, os demais itens do grupo são pulados
   * e pontuam 0.
   */
  branchGroup?: string;
  /** pergunta-porta do grupo de ramificação: resposta 0 encerra o grupo */
  isGateway?: boolean;
};

export type ScaleBand = {
  min: number;
  max: number;
  label: string;
  level: number; // 0 mínimo → 4 grave
};

export type SubscaleBand = ScaleBand & {
  /** conduta recomendada para a faixa (ex.: FRAMES no ASSIST-Lite) */
  recommendation?: string;
};

/** Subescala pontuada à parte, com faixas e condutas próprias. */
export type SubscaleDef = {
  key: string;
  label: string;
  items: string[];
  bands: SubscaleBand[];
};

export type ScaleDomain =
  | "depressao"
  | "ansiedade"
  | "risco"
  | "trauma"
  | "alcool"
  | "somatico"
  | "geral"
  | "tdah"
  | "obsessivo"
  | "bipolar"
  | "tabaco"
  | "perinatal"
  | "alimentar"
  | "sono"
  | "neurodesenvolvimento"
  | "cognitivo"
  | "ocupacional";

export type Scale = {
  code: string;
  name: string;
  fullName: string;
  domain: ScaleDomain;
  instructions: string;
  timeframe?: string;
  options: LikertOption[];
  items: ScaleItem[];
  bands: ScaleBand[];
  positiveCutoff?: number;
  triggersScale?: string;
  /**
   * "auto" = autorrelato (o próprio paciente responde);
   * "hetero" = respondida por responsável/observador;
   * "ambos" = validada para os dois informantes.
   */
  informantMode?: "auto" | "hetero" | "ambos";
  /** faixa etária permitida (inclusiva) */
  minAge?: number;
  maxAge?: number;

  /** quando fora da faixa, apenas ignorar (não listar como "escala indicada") */
  quietIfOutOfRange?: boolean;

  /** "ativa" entra no fluxo; "estrutura" é placeholder aguardando curadoria clínica */
  status?: "ativa" | "estrutura";
  /** observações de licenciamento / uso */
  licenseNote?: string;
  /** itens cuja resposta positiva indica risco imediato */
  riskItems?: string[];
  reverseYes?: string[];
  reverseNo?: string[];
  /** subescalas com pontuação própria (ex.: substâncias do ASSIST-Lite) */
  subscales?: SubscaleDef[];
};

export const OPTS_0_3: LikertOption[] = [
  { label: "Nenhuma vez", value: 0 },
  { label: "Vários dias", value: 1 },
  { label: "Mais da metade dos dias", value: 2 },
  { label: "Quase todos os dias", value: 3 },
];

export const OPTS_0_4: LikertOption[] = [
  { label: "Nada", value: 0 },
  { label: "Um pouco", value: 1 },
  { label: "Moderadamente", value: 2 },
  { label: "Bastante", value: 3 },
  { label: "Extremamente", value: 4 },
];

export const OPTS_SIM_NAO: LikertOption[] = [
  { label: "Não", value: 0 },
  { label: "Sim", value: 1 },
];

export const OPTS_0_2: LikertOption[] = [
  { label: "Nada", value: 0 },
  { label: "Um pouco", value: 1 },
  { label: "Muito", value: 2 },
];

export const OPTS_TDAH: LikertOption[] = [
  { label: "Nunca", value: 0 },
  { label: "Raramente", value: 1 },
  { label: "Às vezes", value: 2 },
  { label: "Frequentemente", value: 3 },
  { label: "Muito frequentemente", value: 4 },
];

export function isScaleAllowedForAge(scale: Scale, age: number | null): boolean {
  if (age == null) return true;
  if (scale.minAge != null && age < scale.minAge) return false;
  if (scale.maxAge != null && age > scale.maxAge) return false;
  return true;
}

/* ------------------------------------------------------------------ */
/* Ramificação: perguntas-gateway pulam o restante do grupo             */
/* ------------------------------------------------------------------ */

function gatewayValue(
  scale: Scale,
  group: string,
  answers: Record<string, number>,
): number {
  const gw = scale.items.find((i) => i.branchGroup === group && i.isGateway);
  return gw ? (answers[gw.id] ?? 0) : 0;
}

/**
 * Ids dos itens atualmente pulados pela regra de ramificação: pertencem a
 * um grupo cuja pergunta-porta vale 0 (ou ainda não foi respondida).
 */
export function skippedItemIds(
  scale: Scale,
  answers: Record<string, number>,
): Set<string> {
  const skipped = new Set<string>();
  const groups = new Set(
    scale.items
      .map((i) => i.branchGroup)
      .filter((g): g is string => typeof g === "string"),
  );
  for (const g of groups) {
    if (gatewayValue(scale, g, answers) !== 0) continue;
    for (const i of scale.items) {
      if (i.branchGroup === g && !i.isGateway) skipped.add(i.id);
    }
  }
  return skipped;
}

/** Próximo item visível após fromIndex; -1 quando a escala terminou. */
export function nextItemIndex(
  scale: Scale,
  fromIndex: number,
  answers: Record<string, number>,
): number {
  const skipped = skippedItemIds(scale, answers);
  for (let i = fromIndex + 1; i < scale.items.length; i++) {
    if (!skipped.has(scale.items[i].id)) return i;
  }
  return -1;
}

/** Item visível anterior a fromIndex; -1 quando não há. */
export function prevItemIndex(
  scale: Scale,
  fromIndex: number,
  answers: Record<string, number>,
): number {
  const skipped = skippedItemIds(scale, answers);
  for (let i = fromIndex - 1; i >= 0; i--) {
    if (!skipped.has(scale.items[i].id)) return i;
  }
  return -1;
}

/**
 * Inclui (zerando) os itens pulados no registro, para gravar um conjunto
 * completo: item pulado = "Não se aplica" e vale 0 no escore.
 */
export function applyBranchingSkips(
  scale: Scale,
  answers: Record<string, number>,
): Record<string, number> {
  const out = { ...answers };
  for (const id of skippedItemIds(scale, answers)) out[id] = 0;
  return out;
}

/** Posição (1-based) do item atual entre os visíveis e total de visíveis. */
export function visibleProgress(
  scale: Scale,
  index: number,
  answers: Record<string, number>,
): { position: number; total: number } {
  const skipped = skippedItemIds(scale, answers);
  const visible = scale.items.filter((i) => !skipped.has(i.id));
  const currentId = scale.items[index]?.id;
  const pos = visible.findIndex((i) => i.id === currentId);
  return { position: (pos === -1 ? 0 : pos) + 1, total: visible.length };
}

/** Rótulo do grupo de ramificação do item (ex.: "Tabaco"), se houver. */
export function groupLabelForItem(scale: Scale, itemId: string): string | null {
  const g = scale.items.find((i) => i.id === itemId)?.branchGroup;
  if (!g) return null;
  return scale.subscales?.find((s) => s.key === g)?.label ?? null;
}
