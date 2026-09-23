/**
 * Server Functions para o Módulo de Psicoeducação - TriagemPsi
 * Blindagem Multi-Tenant e conformidade estrita com RLS.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  OFFICIAL_PSYCHOEDUCATION_TOPICS,
  PSYCHO_TOPIC_BY_SLUG,
} from "./psychoeducation-data";
import { evaluatePsychoeducationTriggers } from "./psychoeducation";

export type AssessmentPsychoItem = {
  topic_slug: string;
  title: string;
  short_title: string;
  description: string;
  icon: string;
  trigger_reason: string;
  is_manual: boolean;
  viewed_at: string | null;
  summary_pdf: string;
  resumo_card: string;
  body_md: string;
  version: string;
  tags: string[];
};

/**
 * Retorna as recomendações de psicoeducação vinculadas a uma avaliação.
 * Valida o acesso à avaliação através de context.supabase (RLS do PostgreSQL).
 */
export const getAssessmentPsychoeducation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ assessment_id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data, context }): Promise<AssessmentPsychoItem[]> => {
    // 1. Validação estrita de barreira multi-tenant via RLS do PostgreSQL
    const { data: assessment, error: aErr } = await context.supabase
      .from("assessments")
      .select("id, clinic_id")
      .eq("id", data.assessment_id)
      .maybeSingle();

    if (aErr || !assessment) {
      const { accessDeniedError } = await import("@/lib/access-error");
      throw accessDeniedError("Avaliação não encontrada ou sem permissão de acesso para o seu perfil.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 2. Tenta buscar da tabela assessment_psychoeducation
    const { data: dbRecords, error } = await supabaseAdmin
      .from("assessment_psychoeducation")
      .select("topic_id, trigger_reason, is_manual, viewed_at, psychoeducation_topics(slug)")
      .eq("assessment_id", data.assessment_id);

    if (!error && dbRecords && dbRecords.length > 0) {
      const items: AssessmentPsychoItem[] = [];
      for (const rec of dbRecords) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const slug = (rec.psychoeducation_topics as any)?.slug;
        const def = slug ? PSYCHO_TOPIC_BY_SLUG.get(slug) : null;
        if (def) {
          items.push({
            topic_slug: def.slug,
            title: def.title,
            short_title: def.short_title,
            description: def.description,
            icon: def.icon,
            trigger_reason: rec.trigger_reason ?? "Recomendado para esta avaliação",
            is_manual: Boolean(rec.is_manual),
            viewed_at: rec.viewed_at,
            summary_pdf: def.summary_pdf,
            resumo_card: def.resumo_card,
            body_md: def.body_md,
            version: "v1 (2026.1)",
            tags: def.tags,
          });
        }
      }
      return items;
    }

    // 3. Se não encontrou no banco, calcula a partir dos resultados da triagem
    const { data: scaleResults } = await context.supabase
      .from("scale_results")
      .select("scale_code, score, band, band_level, risk, answers")
      .eq("assessment_id", data.assessment_id);

    // Recomputa riskPathway a partir do próprio `risk` de cada escala já
    // persistida (inclui ASQ e qualquer outro instrumento de risco do fluxo
    // automático, não só PHQ-9/C-SSRS/RISK-COMPOSITE) — sem isso, um
    // paciente com triagem positiva de risco podia não ver nenhum aviso de
    // crise neste fallback quando a gravação original de psicoeducação
    // falhava.
    const riskPathway = (scaleResults ?? []).some((r) => r.risk);

    const evaluated = evaluatePsychoeducationTriggers(
      (scaleResults ?? []).map((r) => ({
        scale_code: r.scale_code,
        score: r.score,
        band: r.band,
        band_level: r.band_level,
        risk: r.risk,
        answers: r.answers as Record<string, number>,
      })),
      { riskPathway },
    );

    return evaluated.map((e) => ({
      topic_slug: e.topic.slug,
      title: e.topic.title,
      short_title: e.topic.short_title,
      description: e.topic.description,
      icon: e.topic.icon,
      trigger_reason: e.trigger_reason,
      is_manual: false,
      viewed_at: null,
      summary_pdf: e.topic.summary_pdf,
      resumo_card: e.topic.resumo_card,
      body_md: e.topic.body_md,
      version: "v1 (2026.1)",
      tags: e.topic.tags,
    }));
  });

/**
 * Permite ao médico liberar manualmente um material de psicoeducação para o paciente.
 * Valida a autorização via RLS antes de persistir o material.
 */
export const releaseManualPsychoeducation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        assessment_id: z.string().uuid(),
        topic_slug: z.string().min(1),
        custom_note: z.string().max(300).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    // 1. Validação estrita de barreira multi-tenant via RLS do PostgreSQL
    const { data: assessment, error: aErr } = await context.supabase
      .from("assessments")
      .select("id, clinic_id")
      .eq("id", data.assessment_id)
      .maybeSingle();

    if (aErr || !assessment) {
      const { accessDeniedError } = await import("@/lib/access-error");
      throw accessDeniedError("Avaliação não encontrada ou sem permissão de acesso para o seu perfil.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Localiza o topic_id
    const { data: topic, error: topicErr } = await supabaseAdmin
      .from("psychoeducation_topics")
      .select("id")
      .eq("slug", data.topic_slug)
      .maybeSingle();

    if (topicErr || !topic) {
      throw new Error("Tema de psicoeducação não encontrado.");
    }

    const { error: insertErr } = await supabaseAdmin
      .from("assessment_psychoeducation")
      .upsert(
        {
          assessment_id: data.assessment_id,
          topic_id: topic.id,
          trigger_reason: data.custom_note || "Liberado manualmente pelo profissional",
          is_manual: true,
        },
        { onConflict: "assessment_id, topic_id" },
      );

    if (insertErr) {
      console.error("releaseManualPsychoeducation", insertErr);
      throw new Error("Não foi possível liberar o material.");
    }

    return { ok: true };
  });

/**
 * Registra a visualização do material pelo paciente no Portal.
 * Valida a identidade e escopo da avaliação antes de gravar.
 */
export const markPsychoeducationViewed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        assessment_id: z.string().uuid(),
        topic_slug: z.string().min(1),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    // 1. Validação estrita de barreira multi-tenant via RLS do PostgreSQL
    const { data: assessment, error: aErr } = await context.supabase
      .from("assessments")
      .select("id, clinic_id")
      .eq("id", data.assessment_id)
      .maybeSingle();

    if (aErr || !assessment) {
      const { accessDeniedError } = await import("@/lib/access-error");
      throw accessDeniedError("Avaliação não encontrada ou sem permissão de acesso para o seu perfil.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: topic } = await supabaseAdmin
      .from("psychoeducation_topics")
      .select("id")
      .eq("slug", data.topic_slug)
      .maybeSingle();

    if (topic) {
      await supabaseAdmin
        .from("assessment_psychoeducation")
        .update({ viewed_at: new Date().toISOString() })
        .eq("assessment_id", data.assessment_id)
        .eq("topic_id", topic.id);
    }

    return { ok: true };
  });
