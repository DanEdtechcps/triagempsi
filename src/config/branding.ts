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
    "Seja bem-vindo(a). Este questionário breve de pré-avaliação ajuda o Dr. José Ribamar Fernandes Saraiva Junior a conhecer seu momento antes da consulta, permitindo que o nosso tempo juntos seja dedicado ao que realmente importa: uma escuta atenta, humanizada e individualizada. Suas respostas são protegidas por sigilo ético absoluto.",
  doneCopy:
    "Muito obrigado por dedicar seu tempo. Suas informações foram enviadas com segurança diretamente ao Dr. Saraiva, servindo de alicerce para a sua consulta médica.",
  disclaimer:
    "Este instrumento é um apoio ao atendimento médico do Dr. José Ribamar Fernandes Saraiva Junior (CRM-RS 29349 | RQE 30038). Não realiza diagnóstico automático e não substitui a avaliação clínica direta.",
  consentCopy:
    "Autorizo o tratamento das informações de saúde que eu informar aqui, exclusivamente pelo Dr. José Ribamar Fernandes Saraiva Junior e equipe clínica responsável pelo meu atendimento, conforme a LGPD (Lei 13.709/2018) e o sigilo médico ético.",
  emergency: {
    cvvPhone: "188",
    cvvLabel: "CVV — Centro de Valorização da Vida",
    samuPhone: "192",
    message:
      "Se você está passando por sofrimento psíquico intenso ou pensamentos de morte, procure ajuda agora. Você não precisa carregar isso sozinho(a).",
  },
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
  if (!clinic) return BRANDING;
  return {
    ...BRANDING,
    clinicSlug: clinic.slug ?? BRANDING.clinicSlug,
    clinicName: clinic.name ?? BRANDING.clinicName,
    tagline: clinic.tagline ?? BRANDING.tagline,
    logoUrl: clinic.logo_url ?? BRANDING.logoUrl,
    primaryColor: clinic.primary_color ?? BRANDING.primaryColor,
    accentColor: clinic.accent_color ?? BRANDING.accentColor,
    contactEmail: clinic.contact_email ?? BRANDING.contactEmail,
    contactPhone: clinic.contact_phone ?? BRANDING.contactPhone,
    websiteUrl: clinic.website_url ?? BRANDING.websiteUrl,
    introCopy: clinic.intro_copy ?? BRANDING.introCopy,
    doneCopy: clinic.done_copy ?? BRANDING.doneCopy,
  };
}
