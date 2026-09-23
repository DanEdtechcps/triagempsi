import { z } from "zod";

export const MIN_PASSWORD_LENGTH = 8;

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, {
    message: `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
  })
  .max(72, { message: "A senha pode ter no máximo 72 caracteres." })
  .refine((v) => !/\s{2,}/.test(v), {
    message: "Evite espaços em sequência na senha.",
  })
  .refine((v) => /[a-z]/.test(v), {
    message: "Inclua ao menos uma letra minúscula.",
  })
  .refine((v) => /[A-Z]/.test(v), {
    message: "Inclua ao menos uma letra maiúscula.",
  })
  .refine((v) => /[0-9]/.test(v), { message: "Inclua ao menos um número." })
  .refine((v) => /[^A-Za-z0-9]/.test(v), {
    message: "Inclua ao menos um símbolo (ex.: ! @ # $).",
  });

const COMMON = [
  "senha",
  "password",
  "123456",
  "12345678",
  "qwerty",
  "abc123",
  "admin",
  "triagem",
  "clinica",
];

export type PasswordRule = { label: string; ok: boolean };

export function passwordRules(value: string): PasswordRule[] {
  return [
    {
      label: `Mínimo de ${MIN_PASSWORD_LENGTH} caracteres`,
      ok: value.length >= MIN_PASSWORD_LENGTH,
    },
    { label: "Uma letra maiúscula", ok: /[A-Z]/.test(value) },
    { label: "Uma letra minúscula", ok: /[a-z]/.test(value) },
    { label: "Um número", ok: /[0-9]/.test(value) },
    { label: "Um símbolo (! @ # $ …)", ok: /[^A-Za-z0-9]/.test(value) },
    {
      label: "Sem sequências óbvias (senha, 123456…)",
      ok: value.length > 0 && !COMMON.some((c) => value.toLowerCase().includes(c)),
    },
  ];
}

export type PasswordStrength = {
  score: number; // 0..4
  label: string;
  rules: PasswordRule[];
};

export function passwordStrength(value: string): PasswordStrength {
  const rules = passwordRules(value);
  const met = rules.filter((r) => r.ok).length;
  let score = 0;
  if (value.length > 0) score = Math.min(4, Math.max(1, met - 2));
  if (value.length >= 14 && met === rules.length) score = 4;
  const label = ["Muito fraca", "Fraca", "Razoável", "Boa", "Forte"][score];
  return { score, label, rules };
}

/** Retorna a primeira mensagem de erro, ou null quando a senha é válida. */
export function validateNewPassword(
  value: string,
  confirm: string,
  currentPassword?: string,
): string | null {
  const parsed = passwordSchema.safeParse(value);
  if (!parsed.success) return parsed.error.issues[0].message;
  const failing = passwordRules(value).find((r) => !r.ok);
  if (failing) return `Requisito pendente: ${failing.label.toLowerCase()}.`;
  if (currentPassword && value === currentPassword)
    return "A nova senha precisa ser diferente da atual.";
  if (value !== confirm) return "As senhas não coincidem.";
  return null;
}
