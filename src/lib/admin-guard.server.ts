/** Guarda compartilhada: só administradores globais (papel admin sem clínica). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function requireGlobalAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role, clinic_id")
    .eq("user_id", userId);
  if (error) throw new Error("Não foi possível verificar seu acesso.");
  const ok = (data ?? []).some(
    (r: { role: string; clinic_id: string | null }) => r.role === "admin" && r.clinic_id === null,
  );
  if (!ok) {
    const { accessDeniedError } = await import("@/lib/access-error");
    throw accessDeniedError("Somente o administrador geral pode acessar a área comercial.");
  }
}
