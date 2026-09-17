import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Garante que o usuário tem papel na clínica (ou papel global) antes de
 * qualquer escrita privilegiada.
 */
export async function assertClinicAccess(
  supabase: SupabaseClient,
  userId: string,
  clinicId: string,
) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("clinic_id")
    .eq("user_id", userId);

  if (error) throw new Error("Não foi possível verificar seu acesso.");
  const ok = (data ?? []).some(
    (r: { clinic_id: string | null }) => r.clinic_id === null || r.clinic_id === clinicId,
  );
  if (!ok) {
    const { accessDeniedError } = await import("@/lib/access-error");
    throw accessDeniedError(
      "Este registro pertence a um consultório que não está vinculado ao seu perfil.",
    );
  }
}

export type AccessScope = {
  /** true = papel sem clínica definida (acesso a todas as clínicas) */
  global: boolean;
  isAdmin: boolean;
  clinicIds: string[];
};

/** Escopo de acesso do usuário logado (clínicas e papel). */
export async function getAccessScope(
  supabase: SupabaseClient,
  userId: string,
): Promise<AccessScope> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role, clinic_id")
    .eq("user_id", userId);

  if (error) throw new Error("Não foi possível verificar seu acesso.");
  const rows = (data ?? []) as { role: string; clinic_id: string | null }[];
  return {
    global: rows.some((r) => r.clinic_id === null),
    isAdmin: rows.some((r) => r.role === "admin"),
    clinicIds: rows.map((r) => r.clinic_id).filter((v): v is string => !!v),
  };
}

/**
 * E-mails que o usuário pode ver no histórico de envios: apenas destinatários
 * ligados às triagens e contatos das clínicas às quais ele tem acesso (RLS já
 * filtra as consultas abaixo).
 */
export async function allowedRecipientEmails(
  supabase: SupabaseClient,
): Promise<Set<string>> {
  const allowed = new Set<string>();
  const [{ data: assessments }, { data: contacts }] = await Promise.all([
    supabase.from("assessments").select("respondent_email").limit(2000),
    supabase.from("contacts").select("email").limit(2000),
  ]);
  for (const a of (assessments ?? []) as { respondent_email: string | null }[]) {
    if (a.respondent_email) allowed.add(a.respondent_email.trim().toLowerCase());
  }
  for (const c of (contacts ?? []) as { email: string | null }[]) {
    if (c.email) allowed.add(c.email.trim().toLowerCase());
  }
  return allowed;
}
