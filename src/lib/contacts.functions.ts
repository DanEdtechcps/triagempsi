import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ContactRow = {
  id: string;
  name: string;
  phone_e164: string | null;
  email: string | null;
  clinic_id: string;
  created_at: string;
  last_invite_at: string | null;
};

/** Contatos das clínicas que o usuário pode ver. */
export const listContacts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ContactRow[]> => {
    const { data, error } = await context.supabase
      .from("contacts")
      .select("id, name, phone_e164, email, clinic_id, created_at, invitations(created_at)")
      .order("created_at", { ascending: false })
      .limit(300);

    if (error) {
      console.error("listContacts error", error);
      throw new Error("Não foi possível carregar os contatos.");
    }

    return (data ?? []).map((c) => {
      const invites = ((c as unknown as { invitations: { created_at: string }[] })
        .invitations ?? []).map((i) => i.created_at).sort();
      return {
        id: c.id as string,
        name: c.name as string,
        phone_e164: (c.phone_e164 as string | null) ?? null,
        email: (c.email as string | null) ?? null,
        clinic_id: c.clinic_id as string,
        created_at: c.created_at as string,
        last_invite_at: invites.length ? invites[invites.length - 1] : null,
      };
    });
  });

/** Cadastra um contato na clínica informada. */
export const createContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        clinic_id: z.string().uuid(),
        name: z.string().trim().min(2).max(120),
        phone_e164: z.string().trim().regex(/^\+\d{10,15}$/),
        email: z.string().trim().email().max(200).optional().nullable(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { assertClinicAccess } = await import("@/lib/painel-access.server");
    await assertClinicAccess(context.supabase, context.userId, data.clinic_id);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("contacts")
      .insert({
        clinic_id: data.clinic_id,
        name: data.name,
        phone_e164: data.phone_e164,
        email: data.email || null,
        created_by: context.userId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("createContact error", error);
      throw new Error("Não foi possível salvar o contato.");
    }

    const { recordAudit } = await import("@/lib/audit.server");
    await recordAudit({
      action: "contact_created",
      clinicId: data.clinic_id,
      actorUserId: context.userId,
      actorEmail: (context.claims as { email?: string })?.email ?? null,
      entityType: "contact",
      entityId: row.id as string,
      details: { name: data.name, phone: data.phone_e164 },
    });
    return { id: row.id as string };
  });

/** Gera um convite individual de triagem e registra o envio por WhatsApp. */
export const createWhatsappInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ contact_id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { data: contact, error: cErr } = await context.supabase
      .from("contacts")
      .select("id, name, phone_e164, clinic_id, clinics(name, slug)")
      .eq("id", data.contact_id)
      .maybeSingle();

    if (cErr || !contact) throw new Error("Contato não encontrado.");
    if (!contact.phone_e164) throw new Error("Este contato não tem telefone cadastrado.");

    const { assertClinicAccess } = await import("@/lib/painel-access.server");
    await assertClinicAccess(context.supabase, context.userId, contact.clinic_id as string);

    const clinic = (contact as unknown as { clinics: { name: string; slug: string } | null })
      .clinics;
    const token = crypto.randomUUID().replace(/-/g, "");
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inv, error: iErr } = await supabaseAdmin
      .from("invitations")
      .insert({
        clinic_id: contact.clinic_id,
        contact_id: contact.id,
        token,
        channel: "whatsapp",
        status: "pending",
        whatsapp_status: "link_gerado",
        expires_at: expires,
        created_by: context.userId,
      })
      .select("id")
      .single();

    if (iErr) {
      console.error("createWhatsappInvite error", iErr);
      throw new Error("Não foi possível gerar o convite.");
    }

    const { recordAudit } = await import("@/lib/audit.server");
    await recordAudit({
      action: "invite_created",
      clinicId: contact.clinic_id as string,
      actorUserId: context.userId,
      actorEmail: (context.claims as { email?: string })?.email ?? null,
      entityType: "invitation",
      entityId: inv.id as string,
      details: {
        contact_name: contact.name as string,
        phone: contact.phone_e164 as string,
        expires_at: expires,
      },
    });

    return {
      token,
      invitation_id: inv.id as string,
      contact_name: contact.name as string,
      phone_e164: contact.phone_e164 as string,
      clinic_name: clinic?.name ?? null,
      clinic_slug: clinic?.slug ?? "padrao",
      expires_at: expires,
    };
  });

/** Registra no histórico que a mensagem foi aberta/enviada pelo WhatsApp. */
export const logWhatsappSend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        contact_id: z.string().uuid(),
        invitation_id: z.string().uuid(),
        to_phone: z.string().trim().regex(/^\+\d{10,15}$/),
        body: z.string().trim().min(1).max(2000),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { data: contact } = await context.supabase
      .from("contacts")
      .select("clinic_id, phone_e164")
      .eq("id", data.contact_id)
      .maybeSingle();
    if (!contact) throw new Error("Contato não encontrado.");

    const { assertClinicAccess } = await import("@/lib/painel-access.server");
    await assertClinicAccess(context.supabase, context.userId, contact.clinic_id as string);

    // O convite precisa ser do mesmo contato e da mesma clínica.
    const { data: invite } = await context.supabase
      .from("invitations")
      .select("id, contact_id, clinic_id")
      .eq("id", data.invitation_id)
      .maybeSingle();
    const { accessDeniedError } = await import("@/lib/access-error");
    if (
      !invite ||
      invite.clinic_id !== contact.clinic_id ||
      invite.contact_id !== data.contact_id
    ) {
      throw accessDeniedError(
        "Este convite não pertence ao contato e ao consultório informados.",
      );
    }

    // O destino tem de ser o telefone cadastrado para o contato.
    if (contact.phone_e164 && contact.phone_e164 !== data.to_phone) {
      throw accessDeniedError(
        "O número informado não é o telefone cadastrado deste contato.",
      );
    }


    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("whatsapp_messages").insert({
      clinic_id: contact.clinic_id,
      contact_id: data.contact_id,
      invitation_id: data.invitation_id,
      to_phone: data.to_phone,
      kind: "invite",
      body: data.body,
      status: "sent",
      sent_at: new Date().toISOString(),
      created_by: context.userId,
    });
    if (error) console.error("logWhatsappSend error", error);

    const { recordAudit } = await import("@/lib/audit.server");
    await recordAudit({
      action: "whatsapp_sent",
      clinicId: contact.clinic_id as string,
      actorUserId: context.userId,
      actorEmail: (context.claims as { email?: string })?.email ?? null,
      entityType: "invitation",
      entityId: data.invitation_id,
      details: { to_phone: data.to_phone },
    });
    return { ok: true };
  });

export type WhatsappLogRow = {
  id: string;
  to_phone: string;
  body: string;
  status: string;
  created_at: string;
  contact_id: string | null;
};

export const listWhatsappMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WhatsappLogRow[]> => {
    const { data, error } = await context.supabase
      .from("whatsapp_messages")
      .select("id, to_phone, body, status, created_at, contact_id")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error("listWhatsappMessages error", error);
      return [];
    }
    return (data ?? []) as WhatsappLogRow[];
  });

/**
 * Reenvia o questionário por WhatsApp para o paciente de uma triagem já existente.
 * Gera um novo convite (token válido por 30 dias), registra a mensagem no
 * histórico de WhatsApp e grava a data/hora do reenvio na auditoria.
 */
export const resendAssessmentInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ assessment_id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { data: a, error: aErr } = await context.supabase
      .from("assessments")
      .select(
        "id, clinic_id, contact_id, respondent_name, respondent_phone, clinics(name, slug)",
      )
      .eq("id", data.assessment_id)
      .maybeSingle();
    if (aErr || !a) throw new Error("Triagem não encontrada.");

    const { assertClinicAccess } = await import("@/lib/painel-access.server");
    await assertClinicAccess(context.supabase, context.userId, a.clinic_id as string);

    let phone = (a.respondent_phone as string | null) ?? null;
    if (!phone && a.contact_id) {
      const { data: c } = await context.supabase
        .from("contacts")
        .select("phone_e164")
        .eq("id", a.contact_id as string)
        .maybeSingle();
      phone = (c?.phone_e164 as string | null) ?? null;
    }
    const { toE164BR } = await import("@/lib/phone");
    const e164 = phone ? toE164BR(phone) : null;
    if (!e164)
      throw new Error(
        "Esta triagem não tem um telefone válido para envio por WhatsApp.",
      );

    const clinic = (a as unknown as { clinics: { name: string; slug: string } | null })
      .clinics;
    const token = crypto.randomUUID().replace(/-/g, "");
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const resentAt = new Date().toISOString();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inv, error: iErr } = await supabaseAdmin
      .from("invitations")
      .insert({
        clinic_id: a.clinic_id,
        contact_id: a.contact_id,
        token,
        channel: "whatsapp",
        status: "pending",
        whatsapp_status: "reenviado",
        expires_at: expires,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (iErr || !inv) {
      console.error("resendAssessmentInvite invite error", iErr);
      throw new Error("Não foi possível gerar o novo convite.");
    }

    const clinicName = clinic?.name ?? "sua clínica";
    const slug = clinic?.slug ?? "padrao";
    const body =
      `Olá, ${a.respondent_name}! Aqui é da ${clinicName}. ` +
      `Reenviamos o seu questionário de pré-avaliação. É rápido e confidencial.`;

    const { error: mErr } = await supabaseAdmin.from("whatsapp_messages").insert({
      clinic_id: a.clinic_id,
      contact_id: a.contact_id,
      invitation_id: inv.id,
      assessment_id: a.id,
      to_phone: e164,
      kind: "resend",
      body,
      status: "sent",
      sent_at: resentAt,
      created_by: context.userId,
    });
    if (mErr) console.error("resendAssessmentInvite message error", mErr);

    const { recordAudit } = await import("@/lib/audit.server");
    await recordAudit({
      action: "invite_resent",
      clinicId: a.clinic_id as string,
      actorUserId: context.userId,
      actorEmail: (context.claims as { email?: string })?.email ?? null,
      entityType: "assessment",
      entityId: a.id as string,
      details: {
        respondent_name: a.respondent_name as string,
        to_phone: e164,
        invitation_id: inv.id as string,
        resent_at: resentAt,
        expires_at: expires,
      },
    });

    return {
      token,
      invitation_id: inv.id as string,
      to_phone: e164,
      body,
      clinic_slug: slug,
      resent_at: resentAt,
    };
  });
