import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SUBJECT_MODES, SUBJECT_REASONS, canExerciseSubjectRights } from "@/lib/titular";

export type SubjectRightsResult = {
  mode: "anonimizar" | "excluir";
  triagens: number;
  mensagens_removidas: number;
  contatos_removidos: number;
  pareceres_mantidos?: number;
};

/**
 * Exercício dos direitos do titular (LGPD): anonimizar ou excluir os dados de
 * uma pessoa. Só administrador da clínica dona da triagem. A operação em si é
 * uma função SQL atômica que também grava a auditoria (sem PHI).
 *
 * Por padrão atinge TODAS as triagens da mesma pessoa na clínica (mesmo
 * e-mail), pois o direito do titular é sobre a pessoa, não sobre um envio.
 */
export const exerciseSubjectRights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        assessment_id: z.string().uuid(),
        mode: z.enum(SUBJECT_MODES),
        reason: z.enum(SUBJECT_REASONS).default("solicitacao_titular"),
        all_for_subject: z.boolean().default(true),
        confirm: z.literal(true),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }): Promise<SubjectRightsResult> => {
    // A leitura pelo cliente do usuário passa pelo RLS: se a triagem não é de
    // uma clínica dele, nem existe para ele.
    const { data: a } = await context.supabase
      .from("assessments")
      .select("id, clinic_id")
      .eq("id", data.assessment_id)
      .maybeSingle();

    const { accessDeniedError } = await import("@/lib/access-error");
    if (!a) {
      throw accessDeniedError("Esta triagem não está disponível para o seu perfil.");
    }

    const { data: roles, error: rErr } = await context.supabase
      .from("user_roles")
      .select("role, clinic_id")
      .eq("user_id", context.userId);
    if (rErr) throw new Error("Não foi possível verificar seu acesso.");
    if (!canExerciseSubjectRights((roles ?? []) as never, a.clinic_id as string)) {
      throw accessDeniedError(
        "Apenas administradores da clínica podem anonimizar ou excluir dados de um titular.",
      );
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rpc = supabaseAdmin.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: SubjectRightsResult | null; error: { message?: string } | null }>;
    const fn = data.mode === "excluir" ? "erase_assessment" : "anonymize_assessment";
    const { data: result, error } = await rpc.call(supabaseAdmin, fn, {
      p_assessment_id: data.assessment_id,
      p_actor: context.userId,
      p_reason: data.reason,
      p_all: data.all_for_subject,
    });
    if (error || !result) {
      console.error("exerciseSubjectRights falhou", fn, error?.message);
      throw new Error("Não foi possível concluir a operação. Nada foi alterado.");
    }
    return result;
  });
