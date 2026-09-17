/**
 * Configuração central de identidade visual e textos institucionais.
 * NENHUM componente deve ter nome de clínica, logo ou cor hardcoded.
 * No futuro white-label, os valores vindos do banco (tabela clinics)
 * sobrescrevem estes padrões via `resolveBranding`.
 */

export type Branding = {
  clinicSlug: string;
  clinicName: string;
  tagline: string;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
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
  clinicSlug: "padrao",
  clinicName: "Clínica de Saúde Mental",
  tagline: "Pré-triagem antes da primeira consulta",
  logoUrl: null,
  primaryColor: null,
  accentColor: null,
  contactEmail: null,
  contactPhone: null,
  websiteUrl: null,
  introCopy:
    "Este é um questionário de pré-avaliação, respondido antes da sua primeira consulta. Ele ajuda a equipe clínica a conhecer melhor o seu momento e aproveitar melhor o tempo do atendimento.",
  doneCopy:
    "Suas respostas foram enviadas com segurança para a equipe clínica. Elas serão revisadas pelo profissional antes da sua consulta.",
  disclaimer:
    "Este instrumento é um apoio ao atendimento. Não realiza diagnóstico e não substitui a avaliação de um profissional de saúde.",
  consentCopy:
    "Autorizo o tratamento das informações de saúde que eu informar aqui, exclusivamente pela equipe clínica responsável pelo meu atendimento, conforme a LGPD (Lei 13.709/2018).",
  emergency: {
    cvvPhone: "188",
    cvvLabel: "CVV — Centro de Valorização da Vida",
    samuPhone: "192",
    message:
      "Se você está com pensamentos de morte ou de se machucar, procure ajuda agora. Você não precisa passar por isso sozinho(a).",
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
