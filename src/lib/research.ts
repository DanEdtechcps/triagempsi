/**
 * Regras puras da camada de pesquisa (testáveis): quem pode o quê e como o
 * consentimento de pesquisa é resolvido pelo servidor.
 */
import { sha256Hex } from "@/lib/consent";
import { normalizeIcd10 } from "@/lib/outcome-metrics";

export type RoleRow = { role: string; clinic_id: string | null };

/** Registrar o desfecho clínico: administrador ou médico da clínica (ou admin global). */
export function canRecordOutcome(roles: RoleRow[], clinicId: string): boolean {
  return roles.some(
    (r) => (r.role === "admin" || r.role === "doctor") && (r.clinic_id === null || r.clinic_id === clinicId),
  );
}

/** Administrador global (sem clínica): configura a pesquisa e exporta dados. */
export function isGlobalAdmin(roles: RoleRow[]): boolean {
  return roles.some((r) => r.role === "admin" && r.clinic_id === null);
}

/** Retirar consentimento de pesquisa: administrador da clínica ou admin global. */
export function canWithdrawResearchConsent(roles: RoleRow[], clinicId: string): boolean {
  return roles.some((r) => r.role === "admin" && (r.clinic_id === null || r.clinic_id === clinicId));
}

export type ClinicResearch = {
  research_enabled?: boolean | null;
  research_tcle_text?: string | null;
  research_tcle_version?: string | null;
};

export type ResearchConsentRecord = {
  research_consent: boolean;
  research_consent_at: string | null;
  research_consent_version: string | null;
  research_consent_sha256: string | null;
};

/**
 * O servidor é a fonte de verdade: o consentimento só vale se a clínica tem a
 * pesquisa habilitada com TCLE e versão. O hash é do texto EXATO que a clínica
 * tem no banco (o mesmo mostrado ao paciente), não do que o cliente alega.
 */
export async function resolveResearchConsent(
  requested: boolean | null | undefined,
  clinic: ClinicResearch | null | undefined,
  now: Date = new Date(),
): Promise<ResearchConsentRecord> {
  const none: ResearchConsentRecord = {
    research_consent: false,
    research_consent_at: null,
    research_consent_version: null,
    research_consent_sha256: null,
  };
  if (!requested || !clinic?.research_enabled) return none;
  const text = (clinic.research_tcle_text ?? "").trim();
  const version = (clinic.research_tcle_version ?? "").trim();
  if (!text || !version) return none;
  return {
    research_consent: true,
    research_consent_at: now.toISOString(),
    research_consent_version: version,
    research_consent_sha256: await sha256Hex(text),
  };
}

export type ResearchSettingsInput = {
  research_enabled: boolean;
  research_protocol?: string | null;
  research_tcle_text?: string | null;
  research_tcle_version?: string | null;
};

/** Habilitar exige número do protocolo do CEP (CAAE), TCLE e versão. */
export function validateResearchSettings(input: ResearchSettingsInput): string[] {
  if (!input.research_enabled) return [];
  const errors: string[] = [];
  if (!(input.research_protocol ?? "").trim()) {
    errors.push("Informe o número do protocolo aprovado pelo CEP (CAAE).");
  }
  if (!(input.research_tcle_text ?? "").trim()) errors.push("Cadastre o texto do TCLE aprovado.");
  if (!(input.research_tcle_version ?? "").trim()) errors.push("Informe a versão do TCLE.");
  return errors;
}

/** CAAE: 8 dígitos + ponto + 1 dígito + ponto + 4 dígitos + ponto + 3 dígitos (formato 12345678.9.0000.0000 usual). */
export const CAAE_RE = /^\d{8}\.\d\.\d{4}\.\d{4}$/;

export function normalizeOutcomeInput(input: {
  concordance: string;
  risk_assessment: string;
  final_dx_icd10?: string[] | null;
}) {
  return {
    concordance: input.concordance,
    risk_assessment: input.risk_assessment,
    final_dx_icd10: normalizeIcd10(input.final_dx_icd10 ?? []),
  };
}
