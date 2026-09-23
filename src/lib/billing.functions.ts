import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PlanInfo = {
  code: string;
  name: string;
  monthly_price_cents: number | null;
  max_professionals: number | null;
  max_units: number | null;
  features: string[];
  is_active: boolean;
};

export type SubscriptionStatus = "trial" | "ativa" | "inadimplente" | "suspensa" | "cancelada";

export type CommercialRow = {
  subscription_id: string | null;
  clinic_id: string;
  clinic_name: string;
  clinic_slug: string;
  clinic_is_active: boolean;
  plan_code: string | null;
  plan_name: string | null;
  plan_price_cents: number | null;
  max_professionals: number | null;
  status: SubscriptionStatus | null;
  monthly_price_cents: number | null;
  effective_price_cents: number | null;
  started_at: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
  notes: string | null;
  staff_count: number;
};

const SUBSCRIPTION_STATUSES = ["trial", "ativa", "inadimplente", "suspensa", "cancelada"] as const;

/** Catálogo de planos (qualquer usuário autenticado pode ler). */
export const listPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PlanInfo[]> => {
    const { data, error } = await context.supabase
      .from("plans")
      .select("code, name, monthly_price_cents, max_professionals, max_units, features, is_active")
      .eq("is_active", true)
      .order("monthly_price_cents", { ascending: true, nullsFirst: false });
    if (error) throw new Error("Não foi possível carregar os planos.");
    return (data ?? []).map((p) => ({
      ...p,
      features: Array.isArray(p.features) ? (p.features as string[]) : [],
    })) as PlanInfo[];
  });

/** Visão comercial: uma linha por consultório, com assinatura e plano. */
export const listCommercialAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CommercialRow[]> => {
    const { requireGlobalAdmin } = await import("@/lib/admin-guard.server");
    await requireGlobalAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [clinicsRes, subsRes, rolesRes] = await Promise.all([
      supabaseAdmin
        .from("clinics")
        .select("id, slug, name, is_active")
        .order("name", { ascending: true }),
      supabaseAdmin
        .from("clinic_subscriptions")
        .select(
          "id, clinic_id, plan_code, status, monthly_price_cents, started_at, trial_ends_at, current_period_end, canceled_at, notes, plans(name, monthly_price_cents, max_professionals)",
        ),
      supabaseAdmin.from("user_roles").select("clinic_id, user_id"),
    ]);

    if (clinicsRes.error) {
      throw new Error("Não foi possível carregar a visão comercial.");
    }

    type SubRow = {
      id: string;
      clinic_id: string;
      plan_code: string;
      status: SubscriptionStatus;
      monthly_price_cents: number | null;
      started_at: string;
      trial_ends_at: string | null;
      current_period_end: string | null;
      canceled_at: string | null;
      notes: string | null;
      plans: {
        name: string;
        monthly_price_cents: number | null;
        max_professionals: number | null;
      } | null;
    };

    const subByClinic = new Map(
      ((subsRes.data ?? []) as unknown as SubRow[]).map((s) => [s.clinic_id, s]),
    );
    const staffByClinic = new Map<string, Set<string>>();
    for (const r of (rolesRes.data ?? []) as {
      clinic_id: string | null;
      user_id: string;
    }[]) {
      if (!r.clinic_id) continue;
      const set = staffByClinic.get(r.clinic_id) ?? new Set<string>();
      set.add(r.user_id);
      staffByClinic.set(r.clinic_id, set);
    }

    return (
      (clinicsRes.data ?? []) as {
        id: string;
        slug: string;
        name: string;
        is_active: boolean;
      }[]
    ).map((c) => {
      const sub = subByClinic.get(c.id) ?? null;
      return {
        subscription_id: sub?.id ?? null,
        clinic_id: c.id,
        clinic_name: c.name,
        clinic_slug: c.slug,
        clinic_is_active: c.is_active,
        plan_code: sub?.plan_code ?? null,
        plan_name: sub?.plans?.name ?? null,
        plan_price_cents: sub?.plans?.monthly_price_cents ?? null,
        max_professionals: sub?.plans?.max_professionals ?? null,
        status: sub?.status ?? null,
        monthly_price_cents: sub?.monthly_price_cents ?? null,
        effective_price_cents: sub?.monthly_price_cents ?? sub?.plans?.monthly_price_cents ?? null,
        started_at: sub?.started_at ?? null,
        trial_ends_at: sub?.trial_ends_at ?? null,
        current_period_end: sub?.current_period_end ?? null,
        canceled_at: sub?.canceled_at ?? null,
        notes: sub?.notes ?? null,
        staff_count: staffByClinic.get(c.id)?.size ?? 0,
      };
    });
  });

/** Cria ou atualiza a assinatura de um consultório (admin geral). */
export const upsertSubscriptionAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        clinic_id: z.string().uuid(),
        plan_code: z.string().trim().min(2).max(40),
        status: z.enum(SUBSCRIPTION_STATUSES),
        monthly_price_cents: z.number().int().min(0).nullable(),
        current_period_end: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable(),
        trial_ends_at: z.string().datetime().nullable(),
        notes: z.string().trim().max(500).nullable(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { requireGlobalAdmin } = await import("@/lib/admin-guard.server");
    await requireGlobalAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("clinic_subscriptions")
      .select("id")
      .eq("clinic_id", data.clinic_id)
      .maybeSingle();

    const payload = {
      clinic_id: data.clinic_id,
      plan_code: data.plan_code,
      status: data.status,
      monthly_price_cents: data.monthly_price_cents,
      current_period_end: data.current_period_end,
      trial_ends_at: data.trial_ends_at,
      notes: data.notes,
      canceled_at: data.status === "cancelada" ? new Date().toISOString() : null,
    };

    const { data: row, error } = await supabaseAdmin
      .from("clinic_subscriptions")
      .upsert(payload, { onConflict: "clinic_id" })
      .select("id")
      .single();

    if (error) {
      console.error("upsertSubscriptionAdmin", error);
      throw new Error("Não foi possível salvar a assinatura.");
    }

    // Sincroniza o acesso do consultório com a situação da assinatura.
    const clinicActive = data.status !== "suspensa" && data.status !== "cancelada";
    const { error: clinicError } = await supabaseAdmin
      .from("clinics")
      .update({ is_active: clinicActive })
      .eq("id", data.clinic_id);
    if (clinicError) {
      console.error("upsertSubscriptionAdmin clinic sync", clinicError);
    }

    const { recordAudit } = await import("@/lib/audit.server");
    await recordAudit({
      action: existing ? "subscription_updated" : "subscription_created",
      clinicId: data.clinic_id,
      actorUserId: context.userId,
      actorEmail: (context.claims as { email?: string })?.email ?? null,
      entityType: "clinic_subscription",
      entityId: row.id as string,
      details: {
        plan_code: data.plan_code,
        status: data.status,
        monthly_price_cents: data.monthly_price_cents,
        current_period_end: data.current_period_end,
      },
    });

    return { id: row.id as string };
  });
