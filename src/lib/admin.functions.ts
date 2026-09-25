import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireGlobalAdmin } from "@/lib/admin-guard.server";

export type AdminClinic = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  primary_color: string | null;
  accent_color: string | null;
  is_active: boolean;
  created_at: string;
  staff_count: number;
};

export type AdminStaff = {
  user_id: string;
  email: string | null;
  role: string;
  clinic_id: string | null;
  clinic_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
};

export const listClinicsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminClinic[]> => {
    await requireGlobalAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: clinics, error }, { data: roles }] = await Promise.all([
      supabaseAdmin
        .from("clinics")
        .select(
          "id, slug, name, tagline, contact_email, contact_phone, primary_color, accent_color, is_active, created_at",
        )
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("user_roles").select("clinic_id"),
    ]);
    if (error) throw new Error("Não foi possível carregar os consultórios.");

    const counts = new Map<string, number>();
    for (const r of (roles ?? []) as { clinic_id: string | null }[]) {
      if (r.clinic_id) counts.set(r.clinic_id, (counts.get(r.clinic_id) ?? 0) + 1);
    }
    return ((clinics ?? []) as Omit<AdminClinic, "staff_count">[]).map((c) => ({
      ...c,
      staff_count: counts.get(c.id) ?? 0,
    }));
  });

export const listStaffAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminStaff[]> => {
    await requireGlobalAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: roles }, { data: clinics }, users] = await Promise.all([
      supabaseAdmin
        .from("user_roles")
        .select("user_id, role, clinic_id, created_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("clinics").select("id, name"),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

    const clinicName = new Map(
      ((clinics ?? []) as { id: string; name: string }[]).map((c) => [c.id, c.name]),
    );
    const userInfo = new Map(
      (users.data?.users ?? []).map((u) => [
        u.id,
        { email: u.email ?? null, last_sign_in_at: u.last_sign_in_at ?? null },
      ]),
    );

    return (
      (roles ?? []) as {
        user_id: string;
        role: string;
        clinic_id: string | null;
        created_at: string;
      }[]
    ).map((r) => ({
      user_id: r.user_id,
      role: r.role,
      clinic_id: r.clinic_id,
      clinic_name: r.clinic_id ? (clinicName.get(r.clinic_id) ?? null) : null,
      created_at: r.created_at,
      email: userInfo.get(r.user_id)?.email ?? null,
      last_sign_in_at: userInfo.get(r.user_id)?.last_sign_in_at ?? null,
    }));
  });

const ColorSchema = z
  .string()
  .trim()
  .max(40)
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

export const createClinicAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        name: z.string().trim().min(2).max(120),
        slug: z
          .string()
          .trim()
          .min(2)
          .max(60)
          .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen."),
        tagline: z.string().trim().max(160).optional().nullable(),
        contact_email: z.string().trim().email().max(200).optional().nullable().or(z.literal("")),
        contact_phone: z.string().trim().max(40).optional().nullable(),
        primary_color: ColorSchema,
        accent_color: ColorSchema,
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    await requireGlobalAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Único caminho de criação de clínica: provision_new_clinic() cria
    // clinics + clinic_subscriptions + clinic_psychoeducation_settings numa
    // única transação de função (tudo ou nada). Um INSERT simples aqui (como
    // antes) deixava a clínica sem assinatura e sem temas de psicoeducação —
    // ver roadmap 2026-09-24, item #3.
    const { data: clinicId, error } = await supabaseAdmin.rpc("provision_new_clinic", {
      p_slug: data.slug,
      p_name: data.name,
      p_tagline: data.tagline || "",
      p_primary_color: data.primary_color ?? undefined,
      p_accent_color: data.accent_color ?? undefined,
      p_contact_email: data.contact_email || undefined,
      p_contact_phone: data.contact_phone || undefined,
    });

    if (error) {
      if (error.code === "23505")
        throw new Error("Já existe um consultório com esse endereço (slug).");
      console.error("createClinicAdmin", error);
      throw new Error("Não foi possível criar o consultório.");
    }

    const { recordAudit } = await import("@/lib/audit.server");
    await recordAudit({
      action: "clinic_created",
      clinicId: clinicId as string,
      actorUserId: context.userId,
      actorEmail: (context.claims as { email?: string })?.email ?? null,
      entityType: "clinic",
      entityId: clinicId as string,
      details: { name: data.name, slug: data.slug },
    });

    return { id: clinicId as string, slug: data.slug };
  });

export const setClinicActiveAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ clinic_id: z.string().uuid(), is_active: z.boolean() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await requireGlobalAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("clinics")
      .update({ is_active: data.is_active })
      .eq("id", data.clinic_id);
    if (error) throw new Error("Não foi possível atualizar o consultório.");

    const { recordAudit } = await import("@/lib/audit.server");
    await recordAudit({
      action: "clinic_updated",
      clinicId: data.clinic_id,
      actorUserId: context.userId,
      actorEmail: (context.claims as { email?: string })?.email ?? null,
      entityType: "clinic",
      entityId: data.clinic_id,
      details: { is_active: data.is_active },
    });
    return { ok: true };
  });

export type StaffLimitSubscription = {
  status: string;
  maxProfessionals: number | null;
} | null;

/**
 * Decide se um novo profissional pode ser vinculado a uma clínica, dado o
 * estado da assinatura. Fail-closed em todo estado que não seja "assinatura
 * ativa com vaga livre" — nunca deve ser possível burlar o limite do plano
 * silenciosamente.
 *
 * Antes desta correção (roadmap 2026-09-24, item #3), uma clínica sem linha
 * em clinic_subscriptions (criada pelo INSERT simples que createClinicAdmin
 * usava) fazia `sub` vir `null` sem erro — e o bloco de enforcement inteiro
 * era pulado, deixando a clínica com vagas ilimitadas por omissão. Toda
 * clínica nova agora sempre ganha uma assinatura no provisionamento
 * (provision_new_clinic), então `subscription === null` aqui só deveria
 * acontecer pra uma clínica legada incompleta — e isso também precisa negar
 * com um erro claro, não prosseguir silenciosamente.
 */
export function evaluateStaffLimit(params: {
  subscriptionQueryFailed: boolean;
  subscription: StaffLimitSubscription;
  currentDistinctStaffCount: number;
}): { allowed: true } | { allowed: false; reason: string } {
  const { subscriptionQueryFailed, subscription, currentDistinctStaffCount } = params;

  if (subscriptionQueryFailed) {
    return {
      allowed: false,
      reason: "Não foi possível verificar o limite do plano agora. Tente novamente em instantes.",
    };
  }

  if (!subscription) {
    return {
      allowed: false,
      reason:
        "Este consultório não tem uma assinatura configurada — dado legado incompleto. " +
        "Contate o suporte para regularizar o plano antes de adicionar profissionais.",
    };
  }

  // "cancelada" bloqueia sempre, mesmo em plano sem limite de profissionais
  // (maxProfessionals null) — checar isso ANTES do maxProfessionals é
  // essencial: a ordem invertida foi um bug real (achado do roadmap #3)
  // que permitia vínculos ilimitados numa assinatura cancelada.
  if (subscription.status === "cancelada") {
    return {
      allowed: false,
      reason:
        "A assinatura deste consultório está cancelada. Reative o plano na área Comercial para adicionar profissionais.",
    };
  }

  if (subscription.maxProfessionals == null) {
    return { allowed: true };
  }

  if (currentDistinctStaffCount >= subscription.maxProfessionals) {
    return {
      allowed: false,
      reason: `O plano atual permite até ${subscription.maxProfessionals} profissionais por consultório. Para ampliar a equipe, ajuste o plano na área Comercial.`,
    };
  }

  return { allowed: true };
}

/** Cria (ou reaproveita) o usuário e vincula o papel ao consultório. */
export const addStaffAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        email: z.string().trim().email().max(200),
        role: z.enum(["admin", "doctor", "staff"]),
        clinic_id: z.string().uuid().nullable(),
        password: z.string().min(8).max(72).optional().nullable(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    await requireGlobalAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();

    // Enforcement do plano: limite de profissionais por consultório.
    // Fail-closed em todo estado que não seja "assinatura ativa com vaga
    // livre" — ver evaluateStaffLimit() para a decisão completa, incluindo
    // o caso de clínica legada sem nenhuma linha em clinic_subscriptions.
    if (data.clinic_id) {
      const { data: sub, error: subError } = await supabaseAdmin
        .from("clinic_subscriptions")
        .select("status, plans(max_professionals)")
        .eq("clinic_id", data.clinic_id)
        .maybeSingle();

      const subscription: StaffLimitSubscription = sub
        ? {
            status: sub.status,
            maxProfessionals:
              (sub.plans as { max_professionals: number | null } | null)?.max_professionals ?? null,
          }
        : null;

      const { data: staffRows } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("clinic_id", data.clinic_id);
      const currentDistinctStaffCount = new Set(
        ((staffRows ?? []) as { user_id: string }[]).map((r) => r.user_id),
      ).size;

      const decision = evaluateStaffLimit({
        subscriptionQueryFailed: !!subError,
        subscription,
        currentDistinctStaffCount,
      });
      if (!decision.allowed) {
        throw new Error(decision.reason);
      }
    }

    const list = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    let user = (list.data?.users ?? []).find((u) => (u.email ?? "").toLowerCase() === email);
    let created = false;

    if (!user) {
      const { data: createdUser, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: data.password || undefined,
        email_confirm: true,
      });
      if (error || !createdUser.user) {
        console.error("addStaffAdmin createUser", error);
        throw new Error("Não foi possível criar o acesso desse e-mail.");
      }
      user = createdUser.user;
      created = true;
    }

    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: user.id,
      role: data.role,
      clinic_id: data.clinic_id,
    });
    if (roleError && roleError.code !== "23505") {
      console.error("addStaffAdmin role", roleError);
      throw new Error("Não foi possível vincular o profissional ao consultório.");
    }

    const { recordAudit } = await import("@/lib/audit.server");
    await recordAudit({
      action: "staff_added",
      clinicId: data.clinic_id,
      actorUserId: context.userId,
      actorEmail: (context.claims as { email?: string })?.email ?? null,
      entityType: "user_role",
      entityId: user.id,
      details: { email, role: data.role, created },
    });

    return { user_id: user.id, created, already_linked: !!roleError };
  });

export const removeStaffAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        clinic_id: z.string().uuid().nullable(),
        role: z.enum(["admin", "doctor", "staff"]),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    await requireGlobalAdmin(context.supabase, context.userId);
    if (data.user_id === context.userId && data.clinic_id === null) {
      throw new Error("Você não pode remover o seu próprio acesso de administrador geral.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id)
      .eq("role", data.role);
    q = data.clinic_id === null ? q.is("clinic_id", null) : q.eq("clinic_id", data.clinic_id);
    const { error } = await q;
    if (error) throw new Error("Não foi possível remover o vínculo.");

    const { recordAudit } = await import("@/lib/audit.server");
    await recordAudit({
      action: "staff_removed",
      clinicId: data.clinic_id,
      actorUserId: context.userId,
      actorEmail: (context.claims as { email?: string })?.email ?? null,
      entityType: "user_role",
      entityId: data.user_id,
      details: { role: data.role },
    });
    return { ok: true };
  });

export type DoctorProfileRow = {
  id: string;
  clinic_id: string;
  clinic_name: string | null;
  user_id: string;
  email: string | null;
  display_name: string;
  specialty: string | null;
  is_listed: boolean;
};

/** Perfis públicos dos médicos (lista de escolha da triagem). */
export const listDoctorProfilesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DoctorProfileRow[]> => {
    await requireGlobalAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: profiles, error }, { data: clinics }, users] = await Promise.all([
      supabaseAdmin
        .from("doctor_profiles")
        .select("id, clinic_id, user_id, display_name, specialty, is_listed")
        .order("display_name", { ascending: true }),
      supabaseAdmin.from("clinics").select("id, name"),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);
    if (error) throw new Error("Não foi possível carregar os perfis de médicos.");

    const clinicName = new Map(
      ((clinics ?? []) as { id: string; name: string }[]).map((c) => [c.id, c.name]),
    );
    const emailById = new Map((users.data?.users ?? []).map((u) => [u.id, u.email ?? null]));

    return (
      (profiles ?? []) as {
        id: string;
        clinic_id: string;
        user_id: string;
        display_name: string;
        specialty: string | null;
        is_listed: boolean;
      }[]
    ).map((p) => ({
      id: p.id,
      clinic_id: p.clinic_id,
      clinic_name: clinicName.get(p.clinic_id) ?? null,
      user_id: p.user_id,
      email: emailById.get(p.user_id) ?? null,
      display_name: p.display_name,
      specialty: p.specialty ?? null,
      is_listed: p.is_listed,
    }));
  });

/** Cria ou atualiza o perfil público de um médico (nome visto pelo paciente). */
export const upsertDoctorProfileAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        clinic_id: z.string().uuid(),
        user_id: z.string().uuid(),
        display_name: z.string().trim().min(2).max(120),
        specialty: z.string().trim().max(120).optional().nullable(),
        is_listed: z.boolean().default(true),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    await requireGlobalAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("doctor_profiles")
      .upsert(
        {
          clinic_id: data.clinic_id,
          user_id: data.user_id,
          display_name: data.display_name,
          specialty: data.specialty || null,
          is_listed: data.is_listed,
        },
        { onConflict: "clinic_id,user_id" },
      )
      .select("id")
      .single();

    if (error) {
      console.error("upsertDoctorProfileAdmin", error);
      throw new Error("Não foi possível salvar o perfil do médico.");
    }

    const { recordAudit } = await import("@/lib/audit.server");
    await recordAudit({
      action: "doctor_profile_saved",
      clinicId: data.clinic_id,
      actorUserId: context.userId,
      actorEmail: (context.claims as { email?: string })?.email ?? null,
      entityType: "doctor_profile",
      entityId: row.id as string,
      details: { display_name: data.display_name, is_listed: data.is_listed },
    });
    return { id: row.id as string };
  });

/** Remove o perfil público (o médico some da lista de escolha da triagem). */
export const removeDoctorProfileAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await requireGlobalAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("doctor_profiles")
      .delete()
      .eq("id", data.id)
      .select("id, clinic_id, display_name")
      .single();
    if (error) throw new Error("Não foi possível remover o perfil do médico.");

    const { recordAudit } = await import("@/lib/audit.server");
    await recordAudit({
      action: "doctor_profile_removed",
      clinicId: (row as { clinic_id?: string }).clinic_id ?? null,
      actorUserId: context.userId,
      actorEmail: (context.claims as { email?: string })?.email ?? null,
      entityType: "doctor_profile",
      entityId: data.id,
      details: { display_name: (row as { display_name?: string }).display_name },
    });
    return { ok: true };
  });
