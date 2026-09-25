/**
 * Configuração central de identidade visual e institucional.
 *
 * O branding de cada clínica vem inteiramente da tabela `clinics` (ver
 * migration 20260925100000_add_clinic_branding_fields.sql). Nenhum campo
 * cai mais no fallback de outra clínica específica: quando falta um dado no
 * banco, `resolveBranding` usa `GENERIC_BRANDING` — genérico e seguro, sem
 * nome, CRM ou texto legal de nenhuma clínica real (achado #3 do
 * documentação viva/ROADMAP_ESCALA_SAAS_2026-09-24.md).
 */

export type Branding = {
  clinicSlug: string;
  clinicName: string;
  doctorName: string;
  doctorCredentials: string;
  tagline: string;
  shortTagline: string;
  city: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  contactEmail: string | null;
  contactPhone: string | null;
  websiteUrl: string | null;
  /** Texto da tela de boas-vindas */
  introCopy: string;
  /** Texto da tela final do paciente */
  doneCopy: string;
  /** Aviso legal exibido em toda a jornada */
  disclaimer: string;
  /** Texto de consentimento LGPD */
  consentCopy: string;
  emergency: {
    cvvPhone: string;
    cvvLabel: string;
    samuPhone: string;
    message: string;
  };
};

/** Cores neutras do design system — nunca a cor de uma clínica específica. */
const NEUTRAL_PRIMARY_COLOR = "#334155"; // slate-700
const NEUTRAL_ACCENT_COLOR = "#64748b"; // slate-500

/**
 * CVV (188) e SAMU (192) são serviços nacionais de emergência, não branding
 * de uma clínica — por isso ficam fixos aqui em vez de vir do banco. O
 * texto de acolhimento em crise é genérico o bastante pra valer pra
 * qualquer clínica; uma clínica pode sobrescrevê-lo via `emergency_message`.
 */
const GENERIC_EMERGENCY_MESSAGE =
  "Seus sentimentos e seu sofrimento são importantes para nós. Se você está passando por um momento difícil, com pensamentos de morte ou de se machucar, saiba que você não está sozinho(a) e que existe ajuda imediata disponível agora.";

const GENERIC_DISCLAIMER =
  "Este questionário é um instrumento de pré-avaliação clínica e não substitui uma consulta médica. Em caso de emergência, ligue 192 (SAMU) ou 188 (CVV).";

const GENERIC_CONSENT_COPY =
  "Concordo em compartilhar estas informações com a equipe de saúde para fins exclusivos do meu atendimento médico, em conformidade com a LGPD e o Código de Ética Médica.";

/**
 * Branding de fallback: nunca contém dado real de nenhuma clínica
 * específica. Usado quando não há clínica resolvida, ou campo a campo
 * quando a clínica do banco não preencheu aquele campo.
 */
export const GENERIC_BRANDING: Branding = {
  clinicSlug: "clinica",
  clinicName: "Clínica",
  doctorName: "Equipe clínica",
  doctorCredentials: "",
  tagline: "Pré-triagem psiquiátrica",
  shortTagline: "Pré-triagem psiquiátrica",
  city: "",
  logoUrl: null,
  primaryColor: NEUTRAL_PRIMARY_COLOR,
  accentColor: NEUTRAL_ACCENT_COLOR,
  contactEmail: null,
  contactPhone: null,
  websiteUrl: null,
  introCopy:
    "Seja bem-vindo(a). Este questionário breve ajuda a equipe clínica a conhecer seu momento antes da consulta.",
  doneCopy:
    "Muito obrigado por dedicar seu tempo. Suas informações foram enviadas com segurança à equipe clínica.",
  disclaimer: GENERIC_DISCLAIMER,
  consentCopy: GENERIC_CONSENT_COPY,
  emergency: {
    cvvPhone: "188",
    cvvLabel: "CVV — Centro de Valorização da Vida (24h)",
    samuPhone: "192",
    message: GENERIC_EMERGENCY_MESSAGE,
  },
};

/** Shape dos campos de branding vindos da tabela `clinics`. */
export type ClinicBrandingRow = Partial<{
  slug: string;
  name: string;
  tagline: string | null;
  doctor_name: string | null;
  doctor_credentials: string | null;
  short_tagline: string | null;
  city: string | null;
  logo_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website_url: string | null;
  intro_copy: string | null;
  done_copy: string | null;
  disclaimer: string | null;
  consent_copy: string | null;
  emergency_message: string | null;
}>;

/** Monta o branding inteiramente a partir dos dados da clínica vindos do banco. */
export function resolveBranding(clinic?: ClinicBrandingRow | null): Branding {
  if (!clinic) return GENERIC_BRANDING;
  return {
    clinicSlug: clinic.slug ?? GENERIC_BRANDING.clinicSlug,
    clinicName: clinic.name ?? GENERIC_BRANDING.clinicName,
    doctorName: clinic.doctor_name ?? GENERIC_BRANDING.doctorName,
    doctorCredentials: clinic.doctor_credentials ?? GENERIC_BRANDING.doctorCredentials,
    tagline: clinic.tagline ?? GENERIC_BRANDING.tagline,
    shortTagline: clinic.short_tagline ?? GENERIC_BRANDING.shortTagline,
    city: clinic.city ?? GENERIC_BRANDING.city,
    logoUrl: clinic.logo_url ?? GENERIC_BRANDING.logoUrl,
    primaryColor: clinic.primary_color ?? GENERIC_BRANDING.primaryColor,
    accentColor: clinic.accent_color ?? GENERIC_BRANDING.accentColor,
    contactEmail: clinic.contact_email ?? GENERIC_BRANDING.contactEmail,
    contactPhone: clinic.contact_phone ?? GENERIC_BRANDING.contactPhone,
    websiteUrl: clinic.website_url ?? GENERIC_BRANDING.websiteUrl,
    introCopy: clinic.intro_copy ?? GENERIC_BRANDING.introCopy,
    doneCopy: clinic.done_copy ?? GENERIC_BRANDING.doneCopy,
    disclaimer: clinic.disclaimer ?? GENERIC_BRANDING.disclaimer,
    consentCopy: clinic.consent_copy ?? GENERIC_BRANDING.consentCopy,
    emergency: {
      ...GENERIC_BRANDING.emergency,
      message: clinic.emergency_message ?? GENERIC_BRANDING.emergency.message,
    },
  };
}

/**
 * Dados reais da Lumina, mantidos só por compatibilidade com o motor
 * clínico legado/dormente (`src/lib/clinical-engine/`, achado #1 do
 * roadmap: motor duplicado, decisão de consolidação ainda pendente).
 * Nenhuma tela em produção importa este export hoje — todas as telas de
 * equipe reais já resolvem a branding real da clínica (via `resolveBranding`
 * a partir do banco) ou usam `GENERIC_BRANDING` quando não há clínica no
 * contexto.
 */
export const LUMINA_BRANDING: Branding = resolveBranding({
  slug: "lumina",
  name: "Instituto Lumina de Saúde Mental & Neurociências",
  doctor_name: "Dr. Gustavo Mello",
  doctor_credentials: "CRM 198765-SP · Psiquiatria de Adultos & Neurociências",
  tagline: "Psiquiatria de Precisão, Neurociências e Acolhimento Humano",
  short_tagline: "Psiquiatria de Precisão & Neurociências",
  city: "São Paulo/SP",
  primary_color: "#4c1d95", // Púrpura Nobre
  accent_color: "#8b5cf6", // Violeta Clínico
  contact_email: "contato@lumina.med.br",
  contact_phone: "11988887777",
  website_url: "https://lumina.med.br",
  intro_copy:
    "Seja bem-vindo(a) ao Instituto Lumina de Saúde Mental & Neurociências. Este questionário personalizado organiza seus relatos clínicos antes da consulta, permitindo foco nas suas necessidades reais.",
  done_copy:
    "Muito obrigado por preencher sua pré-triagem. Suas informações foram enviadas com sigilo ético ao corpo clínico do Instituto Lumina.",
});
