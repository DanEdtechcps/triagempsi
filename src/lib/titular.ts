/**
 * Direitos do titular (LGPD art. 18) — regras puras, testáveis.
 *
 * Quem pode exercer: só ADMINISTRADOR da clínica dona da triagem (ou admin
 * global). Médico/equipe lê o prontuário mas não apaga nem anonimiza.
 */

export type RoleRow = { role: string; clinic_id: string | null };

export function canExerciseSubjectRights(roles: RoleRow[], clinicId: string): boolean {
  return roles.some((r) => r.role === "admin" && (r.clinic_id === null || r.clinic_id === clinicId));
}

export const SUBJECT_MODES = ["anonimizar", "excluir"] as const;
export type SubjectMode = (typeof SUBJECT_MODES)[number];

export const SUBJECT_REASONS = ["solicitacao_titular", "outro"] as const;
export type SubjectReason = (typeof SUBJECT_REASONS)[number];

export const SUBJECT_MODE_LABEL: Record<SubjectMode, { title: string; confirm: string }> = {
  anonimizar: {
    title: "Anonimizar dados do titular",
    confirm:
      "Remove nome, e-mail, telefone, data de nascimento, queixa em texto livre, IP e mensagens de WhatsApp, " +
      "e mantém escores e pareceres médicos sem identificação. Não pode ser desfeito.",
  },
  excluir: {
    title: "Excluir definitivamente",
    confirm:
      "Apaga a triagem, as respostas, os pareceres e todos os dados pessoais. Não pode ser desfeito. " +
      "Confirme com o Dr. Saraiva/encarregado de dados se há dever legal de guarda do prontuário.",
  },
};
