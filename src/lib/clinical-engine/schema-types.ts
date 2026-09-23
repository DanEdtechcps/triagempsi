/**
 * Tipos estritos da DSL declarativa de Escalas Psiquiátricas (padrão JSON Schema / Form.io).
 * Permite a definição de instrumentos clínicos, regras de elegibilidade,
 * itens psicométricos e faixas de corte de forma desacoplada de código TypeScript imperativo.
 */

export type ScaleItemOption = {
  label: string;
  value: number;
};

export type TRIParameters = {
  /** Parâmetro 'a' de discriminação do item (ex: PROMIS / GRM) */
  a_discrimination: number;
  /** Limiares 'b' de transição entre categorias da escala Likert */
  b_thresholds: number[];
};

export type ScaleItem = {
  id: string;
  text: string;
  hint?: string;
  options?: ScaleItemOption[];
  is_risk?: boolean;
  tri_parameters?: TRIParameters;
};

export type ScaleEligibility = {
  /** Sexos biológicos ou identidades excluídas do instrumento (ex: ["masculino"]) */
  sex_exclude?: string[];
  /** Sexos biológicos ou identidades exigidas exclusivamente */
  sex_include?: string[];
  /** Idade mínima permitida para resposta ao instrumento */
  min_age?: number;
  /** Idade máxima permitida para o instrumento */
  max_age?: number;
  /** Sintomas/queixas que tornam esta escala elegível na triagem inicial */
  required_symptoms?: string[];
  /** Se deve ser omitida silenciosamente quando fora da faixa etária */
  quiet_if_out_of_range?: boolean;
};

export type ScoringBand = {
  min: number;
  max: number;
  label: string;
  level: number;
  is_risk?: boolean;
};

export type ScaleSchema = {
  $schema?: string;
  code: string;
  name: string;
  fullName: string;
  version: string;
  domain: string;
  instructions: string;
  timeframe?: string;
  eligibility: ScaleEligibility;
  /** Opções padrão de resposta (ex: Likert 0-3) se não customizadas por item */
  options?: ScaleItemOption[];
  items: ScaleItem[];
  bands: ScoringBand[];
  positiveCutoff?: number;
  triggersScale?: string;
  riskItems?: string[];
  /**
   * Como a faixa (band) é escolhida:
   * - "sum" (padrão): pela soma dos escores dos itens — correto pra
   *   instrumentos Likert somados (PHQ-9, AUDIT etc.).
   * - "highest_item_band": pelo item de maior severidade respondido
   *   positivamente (posição no array `items`, 1-based) — pra instrumentos
   *   hierárquicos onde os itens têm severidade crescente e a soma sub-
   *   estima o risco (ex.: C-SSRS — alguém que só endossa o item 6
   *   "comportamento preparatório" tem score=1 pela soma, mas é o item
   *   clinicamente mais grave da escala).
   */
  scoringMethod?: "sum" | "highest_item_band";
};

export type EvaluationContext = {
  sex?: string | null;
  age?: number | null;
  symptoms?: string[];
};

export type SchemaScoreResult = {
  scale_code: string;
  score: number;
  maxScore: number;
  band: ScoringBand | null;
  isPositive: boolean;
  isRisk: boolean;
  riskItemsTriggered: string[];
};
