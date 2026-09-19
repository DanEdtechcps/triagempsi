/**
 * Tipos estritos da DSL declarativa de Escalas Psiquiátricas (padrão JSON Schema / Form.io).
 * Permite a definição de instrumentos clínicos, regras de elegibilidade,
 * itens psicométricos e faixas de corte de forma desacoplada de código TypeScript imperativo.
 */

export type ScaleItemOption = {
  label: string;
  value: number;
};

export type ScaleItem = {
  id: string;
  text: string;
  hint?: string;
  options?: ScaleItemOption[];
  is_risk?: boolean;
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
