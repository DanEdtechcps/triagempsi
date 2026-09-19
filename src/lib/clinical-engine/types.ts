/**
 * Tipos estritos do Clinical Engine (Motor Clínico de Triagem).
 * Abrange as 28 escalas psiquiátricas oficiais, árvore de decisão,
 * planos de triagem (TriagePlan) e payloads de submissão.
 */

import type {
  LikertOption,
  ScaleItem,
  ScaleBand,
  SubscaleBand,
  SubscaleDef,
  ScaleDomain,
  Scale,
} from "@/lib/scale-types";

import type {
  ScaleResult,
  SubscoreResult,
  Informant,
} from "@/lib/scoring";

export type {
  LikertOption,
  ScaleItem,
  ScaleBand,
  SubscaleBand,
  SubscaleDef,
  ScaleDomain,
  Scale,
  ScaleResult,
  SubscoreResult,
  Informant,
};

/**
 * As 28 Escalas Psiquiátricas Oficiais validadas do TriagemPsi.
 */
export type Official28ScaleCode =
  | "PHQ-9"
  | "GAD-7"
  | "ASRS-18"
  | "MDQ"
  | "AUDIT"
  | "ASSIST"
  | "DAST-10"
  | "C-SSRS"
  | "OCI-R"
  | "GDS-15"
  | "EPDS"
  | "SPIN"
  | "PDSS-SR"
  | "ISI"
  | "FTND"
  | "SCOFF"
  | "AQ-10"
  | "PC-PTSD-5"
  | "PCL-5"
  | "PHQ-15"
  | "CRAFFT"
  | "CAGE"
  | "ASRS-C"
  | "SNAP-IV"
  | "CGI-S"
  | "WSAS"
  | "PHQ-2"
  | "GAD-2"
  | "RISK-COMPOSITE";

/**
 * Faixas etárias para roteamento de entrada.
 */
export type AgeBand = "crianca" | "adolescente" | "adulto" | "idoso";

/**
 * Opção de sintoma relatado na tela de entrada.
 */
export type SymptomOption = {
  id: string;
  label: string;
  hint?: string;
};

/**
 * Escala indicada ao médico para aplicação posterior na consulta.
 */
export type IndicatedScale = {
  code: string;
  name: string;
  reason: string;
};

/**
 * Registro de decisão clínica tomado pelo motor.
 */
export type TriageDecision = {
  step: string;
  reason: string;
};

/**
 * Plano completo de triagem gerado para o paciente.
 */
export interface TriagePlan {
  /** Escalas que o paciente vai responder agora */
  flow: string[];
  /** Escalas indicadas ao médico, mas não aplicadas no fluxo online */
  indicated: IndicatedScale[];
  /** Histórico de decisões clínicas para o relatório do profissional */
  decisions: TriageDecision[];
  /** Sinaliza se a via de risco (protocolo de emergência) foi ativada */
  riskPathway: boolean;
  /** Faixa etária classificada */
  band: AgeBand;
}

/**
 * Regra de roteamento inicial (sintoma × faixa etária).
 */
export type RoutingRule = {
  symptom: string;
  byBand: Partial<Record<AgeBand, string[]>>;
  noteByBand?: Partial<Record<AgeBand, string>>;
  riskPathway?: boolean;
};

/**
 * Regra de escalonamento condicional (resultado → próxima escala).
 */
export type EscalationRule = {
  from: string;
  when: (r: ScaleResult) => boolean;
  add: string[];
  reason: string;
  riskPathway?: boolean;
};

/**
 * Payload de submissão do assessment no Supabase.
 */
export interface AssessmentPayload {
  clinic_slug: string;
  respondent_name: string;
  respondent_email: string;
  respondent_phone: string | null;
  respondent_age: number | null;
  birth_date: string | null;
  respondent_sex: string | null;
  respondent_type: Informant;
  informant_name: string | null;
  informant_relation: string | null;
  main_complaint: string | null;
  consent_lgpd: boolean;
  consent_at: string;
  invitation_token: string | null;
  doctor_id: string | null;
  symptom_path: string[];
  results: ScaleResult[];
  summary: Record<string, unknown>;
}
