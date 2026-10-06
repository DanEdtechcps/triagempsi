/**
 * Os 13 e-mails do Supabase Auth, em português, no modelo visual do TriagemPsi.
 *
 * Fonte única: daqui saem (1) os arquivos em supabase/templates/ e (2) o payload que
 * `scripts/supabase-auth-emails.ts push` envia à Management API (campos
 * `mailer_subjects_*` e `mailer_templates_*_content`, conforme a documentação atual do
 * Supabase). Só podem aparecer as variáveis que o Supabase documenta.
 */
import { renderEmail, type EmailSpec } from "@/lib/email-layout";

export const ALLOWED_VARIABLES = [
  "ConfirmationURL",
  "Data",
  "Email",
  "FactorType",
  "NewEmail",
  "OldEmail",
  "OldPhone",
  "Phone",
  "Provider",
  "RedirectTo",
  "SiteURL",
  "Token",
  "TokenHash",
] as const;

export const AUTH_EMAIL_KEYS = [
  "confirmation",
  "invite",
  "magic_link",
  "email_change",
  "recovery",
  "reauthentication",
  "password_changed_notification",
  "email_changed_notification",
  "phone_changed_notification",
  "identity_linked_notification",
  "identity_unlinked_notification",
  "mfa_factor_enrolled_notification",
  "mfa_factor_unenrolled_notification",
] as const;
export type AuthEmailKey = (typeof AUTH_EMAIL_KEYS)[number];

const LINK = "{{ .ConfirmationURL }}";
const NAO_FUI_EU =
  "Não foi você? Redefina a senha em psiqway.com.br/auth (“Esqueci minha senha”) e avise o administrador da clínica.";

export const AUTH_EMAILS: Record<AuthEmailKey, { subject: string; spec: EmailSpec }> = {
  confirmation: {
    subject: "Confirme seu e-mail — TriagemPsi",
    spec: {
      preheader: "Falta só um passo para ativar o seu acesso.",
      title: "Confirme seu e-mail",
      paragraphs: [
        "Falta só um passo para ativar seu acesso ao **TriagemPsi**. Confirme que este e-mail é seu:",
      ],
      button: { label: "Confirmar meu e-mail", href: LINK },
      notes: [
        "Depois da confirmação, um administrador da clínica precisa liberar seu acesso às triagens.",
        "O link vale por tempo limitado e só funciona uma vez.",
      ],
      footnote: "Se você não criou uma conta, pode ignorar este e-mail com segurança.",
    },
  },
  invite: {
    subject: "Você foi convidado(a) — TriagemPsi",
    spec: {
      preheader: "Aceite o convite para criar sua senha e entrar.",
      title: "Você foi convidado(a)",
      paragraphs: [
        "Você recebeu um convite para acessar o **TriagemPsi**. Aceite o convite para criar sua senha e entrar.",
      ],
      button: { label: "Aceitar convite", href: LINK },
      notes: ["O convite é pessoal: não o encaminhe a outra pessoa."],
      footnote: "Não esperava este convite? Pode ignorá-lo.",
    },
  },
  magic_link: {
    subject: "Seu link de acesso — TriagemPsi",
    spec: {
      preheader: "Entre sem digitar a senha.",
      title: "Seu link de acesso",
      paragraphs: ["Use o botão abaixo para entrar no **TriagemPsi** sem digitar a senha."],
      button: { label: "Entrar no TriagemPsi", href: LINK },
      notes: ["O link vale por tempo limitado e só funciona uma vez."],
      footnote: "Se você não pediu este acesso, pode ignorar este e-mail.",
    },
  },
  email_change: {
    subject: "Confirme a troca de e-mail — TriagemPsi",
    spec: {
      preheader: "Confirme o novo e-mail da sua conta.",
      title: "Confirme a troca de e-mail",
      paragraphs: [
        "Você pediu para trocar o e-mail da sua conta de **{{ .Email }}** para **{{ .NewEmail }}**.",
      ],
      button: { label: "Confirmar novo e-mail", href: LINK },
      footnote: "Se não foi você, não clique no botão e troque sua senha.",
    },
  },
  recovery: {
    subject: "Redefinir sua senha — TriagemPsi",
    spec: {
      preheader: "Crie uma nova senha de acesso.",
      title: "Redefinir sua senha",
      paragraphs: ["Recebemos um pedido para criar uma nova senha de acesso ao **TriagemPsi**."],
      button: { label: "Criar nova senha", href: LINK },
      notes: ["O link vale por 60 minutos e só pode ser usado uma vez."],
      footnote: "Se você não pediu isso, pode ignorar este e-mail: sua senha continua a mesma.",
    },
  },
  reauthentication: {
    subject: "Código de confirmação — TriagemPsi",
    spec: {
      preheader: "Use este código para continuar.",
      title: "Confirmação de segurança",
      paragraphs: ["Para continuar com segurança, digite este código no **TriagemPsi**:"],
      code: "{{ .Token }}",
      notes: ["O código vale por pouco tempo e só pode ser usado uma vez."],
      footnote: "Se não foi você, ignore este e-mail e considere trocar sua senha.",
    },
  },
  password_changed_notification: {
    subject: "Sua senha foi alterada — TriagemPsi",
    spec: {
      preheader: "Aviso de segurança sobre a sua conta.",
      title: "Sua senha foi alterada",
      paragraphs: ["A senha de acesso da conta **{{ .Email }}** foi alterada agora há pouco."],
      notes: ["Foi você? Nenhuma ação é necessária.", NAO_FUI_EU],
    },
  },
  email_changed_notification: {
    subject: "O e-mail da sua conta foi alterado — TriagemPsi",
    spec: {
      preheader: "Aviso de segurança sobre a sua conta.",
      title: "O e-mail da sua conta foi alterado",
      paragraphs: ["O e-mail da sua conta mudou de **{{ .OldEmail }}** para **{{ .Email }}**."],
      notes: ["Foi você? Nenhuma ação é necessária.", NAO_FUI_EU],
    },
  },
  phone_changed_notification: {
    subject: "O telefone da sua conta foi alterado — TriagemPsi",
    spec: {
      preheader: "Aviso de segurança sobre a sua conta.",
      title: "O telefone da sua conta foi alterado",
      paragraphs: ["O telefone da sua conta mudou de **{{ .OldPhone }}** para **{{ .Phone }}**."],
      notes: ["Foi você? Nenhuma ação é necessária.", NAO_FUI_EU],
    },
  },
  identity_linked_notification: {
    subject: "Novo método de login vinculado — TriagemPsi",
    spec: {
      preheader: "Aviso de segurança sobre a sua conta.",
      title: "Um novo método de login foi vinculado",
      paragraphs: ["O login por **{{ .Provider }}** foi vinculado à conta **{{ .Email }}**."],
      notes: ["Foi você? Nenhuma ação é necessária.", NAO_FUI_EU],
    },
  },
  identity_unlinked_notification: {
    subject: "Método de login removido — TriagemPsi",
    spec: {
      preheader: "Aviso de segurança sobre a sua conta.",
      title: "Um método de login foi removido",
      paragraphs: ["O login por **{{ .Provider }}** foi removido da conta **{{ .Email }}**."],
      notes: ["Foi você? Nenhuma ação é necessária.", NAO_FUI_EU],
    },
  },
  mfa_factor_enrolled_notification: {
    subject: "Verificação em duas etapas ativada — TriagemPsi",
    spec: {
      preheader: "Aviso de segurança sobre a sua conta.",
      title: "Verificação em duas etapas ativada",
      paragraphs: [
        "Um novo fator de verificação (**{{ .FactorType }}**) foi adicionado à sua conta.",
      ],
      notes: ["Foi você? Nenhuma ação é necessária.", NAO_FUI_EU],
    },
  },
  mfa_factor_unenrolled_notification: {
    subject: "Verificação em duas etapas removida — TriagemPsi",
    spec: {
      preheader: "Aviso de segurança sobre a sua conta.",
      title: "Um fator de verificação foi removido",
      paragraphs: ["O fator de verificação (**{{ .FactorType }}**) foi removido da sua conta."],
      notes: ["Foi você? Nenhuma ação é necessária.", NAO_FUI_EU],
    },
  },
};

export function renderAuthEmail(key: AuthEmailKey): { subject: string; html: string } {
  const { subject, spec } = AUTH_EMAILS[key];
  return { subject, html: renderEmail(spec).html };
}

/** Avisos de segurança que passam a ser enviados (os demais ficam como estão). */
export const NOTIFICATIONS_TO_ENABLE = [
  "mailer_notifications_password_changed_enabled",
  "mailer_notifications_email_changed_enabled",
] as const;

/** Corpo do PATCH /v1/projects/{ref}/config/auth. */
export function authConfigPayload(): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (const key of AUTH_EMAIL_KEYS) {
    const { subject, html } = renderAuthEmail(key);
    out[`mailer_subjects_${key}`] = subject;
    out[`mailer_templates_${key}_content`] = html;
  }
  for (const flag of NOTIFICATIONS_TO_ENABLE) out[flag] = true;
  return out;
}
