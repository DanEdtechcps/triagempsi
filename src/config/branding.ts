/**
 * Configuração central de identidade visual e institucional.
 * Saraiva Clínica de Psiquiatria - Dr. José Ribamar Fernandes Saraiva Junior
 * CRM-RS 29349 | RQE 30038 | Passo Fundo / RS
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

export const BRANDING: Branding = {
  clinicSlug: "saraiva",
  clinicName: "Saraiva Clínica de Psiquiatria",
  doctorName: "Dr. José Ribamar Fernandes Saraiva Junior",
  doctorCredentials: "CRM-RS 29349 | RQE 30038",
  tagline: "Cuidado psiquiátrico com escuta, ciência e humanidade",
  shortTagline: "Psiquiatria que acolhe e orienta",
  city: "Passo Fundo/RS",
  logoUrl: null,
  primaryColor: "#1e4d5c", // Azul-petróleo sóbrio e confiável
  accentColor: "#3d8b8b",  // Verde-azulado suave
  contactEmail: "contato@clinicasaraiva.med.br",
  contactPhone: null,
  websiteUrl: null,
  introCopy:
    "Seja bem-vindo(a). Este questionário breve ajuda o Dr. José Ribamar Fernandes Saraiva Junior a conhecer seu momento antes da consulta. Assim, nosso tempo juntos pode ser dedicado ao que realmente importa: uma escuta atenta e individualizada. Suas respostas são protegidas por sigilo ético.",
  doneCopy:
    "Muito obrigado por dedicar seu tempo. Suas informações foram enviadas com segurança ao Dr. Saraiva e servirão de base para a sua consulta.",
  disclaimer:
    "Este questionário é um instrumento de pré-avaliação clínica e não substitui uma consulta médica. Em caso de emergência, ligue 192 (SAMU) ou 188 (CVV).",
  consentCopy:
    "Concordo em compartilhar estas informações com a equipe de saúde para fins exclusivos do meu atendimento médico, em conformidade com a LGPD e o Código de Ética Médica.",
  emergency: {
    cvvPhone: "188",
    cvvLabel: "CVV — Centro de Valorização da Vida (24h)",
    samuPhone: "192",
    message:
      "Seus sentimentos e seu sofrimento são importantes para nós. Se você está passando por um momento difícil, com pensamentos de morte ou de se machucar, saiba que você não está sozinho(a) e que existe ajuda imediata disponível agora.",
  },
};

export const LUMINA_BRANDING: Branding = {
  clinicSlug: "lumina-saude",
  clinicName: "Instituto Lumina de Saúde Mental & Neurociências",
  doctorName: "Dr. Gustavo Mello",
  doctorCredentials: "CRM 198765-SP · Psiquiatria de Adultos & Neurociências",
  tagline: "Psiquiatria de Precisão, Neurociências e Acolhimento Humano",
  shortTagline: "Psiquiatria de Precisão & Neurociências",
  city: "São Paulo/SP",
  logoUrl: null,
  primaryColor: "#4c1d95", // Púrpura Nobre
  accentColor: "#8b5cf6",  // Violeta Clínico
  contactEmail: "contato@lumina.med.br",
  contactPhone: "11988887777",
  websiteUrl: "https://lumina.med.br",
  introCopy:
    "Seja bem-vindo(a) ao Instituto Lumina de Saúde Mental & Neurociências. Este questionário personalizado organiza seus relatos clínicos antes da consulta, permitindo foco nas suas necessidades reais.",
  doneCopy:
    "Muito obrigado por preencher sua pré-triagem. Suas informações foram enviadas com sigilo ético ao corpo clínico do Instituto Lumina.",
  disclaimer: BRANDING.disclaimer,
  consentCopy: BRANDING.consentCopy,
  emergency: BRANDING.emergency,
};

/** Mescla o branding padrão com os dados da clínica vindos do banco. */
export function resolveBranding(
  clinic?: Partial<{
    slug: string;
    name: string;
    tagline: string | null;
    logo_url: string | null;
    primary_color: string | null;
    accent_color: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    website_url: string | null;
    intro_copy: string | null;
    done_copy: string | null;
  }> | null,
): Branding {
  const base = clinic?.slug === "lumina-saude" ? LUMINA_BRANDING : BRANDING;
  if (!clinic) return base;
  return {
    ...base,
    clinicSlug: clinic.slug ?? base.clinicSlug,
    clinicName: clinic.name ?? base.clinicName,
    tagline: clinic.tagline ?? base.tagline,
    logoUrl: clinic.logo_url ?? base.logoUrl,
    primaryColor: clinic.primary_color ?? base.primaryColor,
    accentColor: clinic.accent_color ?? base.accentColor,
    contactEmail: clinic.contact_email ?? base.contactEmail,
    contactPhone: clinic.contact_phone ?? base.contactPhone,
    websiteUrl: clinic.website_url ?? base.websiteUrl,
    introCopy: clinic.intro_copy ?? base.introCopy,
    doneCopy: clinic.done_copy ?? base.doneCopy,
  };
}
