import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AssessmentNote = {
  id: string;
  body: string;
  author_email: string | null;
  author_user_id: string | null;
  created_at: string;
};

/** Histórico de pareceres médicos de uma triagem (RLS limita à clínica). */
export const listAssessmentNotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ assessment_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }): Promise<AssessmentNote[]> => {
    const { data: rows, error } = await context.supabase
      .from("assessment_notes")
      .select("id, body, author_email, author_user_id, created_at")
      .eq("assessment_id", data.assessment_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("listAssessmentNotes error", error);
      throw new Error("Não foi possível carregar os pareceres.");
    }
    return (rows ?? []) as AssessmentNote[];
  });

/** Adiciona um parecer ao histórico (imutável) e registra na auditoria. */
export const addAssessmentNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        assessment_id: z.string().uuid(),
        body: z.string().trim().min(3).max(5000),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }): Promise<AssessmentNote> => {
    const { data: a } = await context.supabase
      .from("assessments")
      .select("id, clinic_id, respondent_name")
      .eq("id", data.assessment_id)
      .maybeSingle();
    if (!a) throw new Error("Triagem não encontrada.");

    const email = (context.claims as { email?: string })?.email ?? null;

    const { data: note, error } = await context.supabase
      .from("assessment_notes")
      .insert({
        assessment_id: data.assessment_id,
        clinic_id: a.clinic_id as string,
        author_user_id: context.userId,
        author_email: email,
        body: data.body,
      })
      .select("id, body, author_email, author_user_id, created_at")
      .single();

    if (error || !note) {
      console.error("addAssessmentNote error", error);
      throw new Error("Não foi possível salvar o parecer.");
    }

    const { recordAudit } = await import("@/lib/audit.server");
    await recordAudit({
      action: "note_added",
      clinicId: a.clinic_id as string,
      actorUserId: context.userId,
      actorEmail: email,
      entityType: "assessment",
      entityId: a.id as string,
      details: {
        respondent_name: a.respondent_name,
        chars: data.body.length,
      },
    });

    return note as AssessmentNote;
  });
