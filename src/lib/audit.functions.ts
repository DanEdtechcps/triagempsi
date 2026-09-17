import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AuditLogRow = {
  id: string;
  created_at: string;
  action: string;
  actor_email: string | null;
  actor_user_id: string | null;
  clinic_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, string | number | boolean | null>;
};

/**
 * Log de auditoria. RLS já limita às clínicas do usuário; além disso, quem não
 * tem acesso global (médico do consultório) vê apenas os próprios registros.
 */
export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AuditLogRow[]> => {
    const { getAccessScope } = await import("@/lib/painel-access.server");
    const scope = await getAccessScope(context.supabase, context.userId);

    let query = context.supabase
      .from("audit_logs")
      .select(
        "id, created_at, action, actor_email, actor_user_id, clinic_id, entity_type, entity_id, details",
      );
    if (!scope.global) query = query.eq("actor_user_id", context.userId);

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(300);

    if (error) {
      console.error("listAuditLogs error", error);
      throw new Error("Não foi possível carregar o log de auditoria.");
    }
    return (data ?? []) as AuditLogRow[];
  });

/** Registra o download de um relatório (PDF do paciente ou clínico). */
export const logReportExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        assessment_id: z.string().uuid(),
        kind: z.enum(["clinico", "paciente"]),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { data: a } = await context.supabase
      .from("assessments")
      .select("id, clinic_id, respondent_name")
      .eq("id", data.assessment_id)
      .maybeSingle();
    if (!a) throw new Error("Triagem não encontrada.");

    const { recordAudit } = await import("@/lib/audit.server");
    await recordAudit({
      action: "report_exported",
      clinicId: a.clinic_id as string,
      actorUserId: context.userId,
      actorEmail: (context.claims as { email?: string })?.email ?? null,
      entityType: "assessment",
      entityId: a.id as string,
      details: { kind: data.kind, respondent_name: a.respondent_name },
    });
    return { ok: true };
  });
