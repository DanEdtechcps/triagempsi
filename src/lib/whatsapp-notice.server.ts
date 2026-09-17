/**
 * Aviso por WhatsApp disparado logo após o envio bem-sucedido do e-mail
 * com os resultados básicos. O envio é feito por link wa.me (click-to-chat),
 * e a mensagem fica registrada no histórico de WhatsApp da clínica.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { toE164BR, waLink } from "@/lib/phone";

export type WhatsappNotice = {
  to_phone: string;
  body: string;
  link: string;
} | null;

export async function notifyResultsByWhatsapp(
  supabase: SupabaseClient,
  params: {
    assessmentId: string;
    audience: "profissional" | "paciente";
    actorUserId: string;
    actorEmail: string | null;
  },
): Promise<WhatsappNotice> {
  const { data: a } = await supabase
    .from("assessments")
    .select("id, clinic_id, contact_id, respondent_name, respondent_phone, clinics(name)")
    .eq("id", params.assessmentId)
    .maybeSingle();
  if (!a) return null;

  let phone = (a.respondent_phone as string | null) ?? null;
  if (!phone && a.contact_id) {
    const { data: c } = await supabase
      .from("contacts")
      .select("phone_e164")
      .eq("id", a.contact_id as string)
      .maybeSingle();
    phone = (c?.phone_e164 as string | null) ?? null;
  }
  const e164 = phone ? toE164BR(phone) : null;
  if (!e164) return null;

  const clinicName =
    (a as unknown as { clinics: { name: string } | null }).clinics?.name ?? "sua clínica";

  const body =
    params.audience === "paciente"
      ? `Olá, ${a.respondent_name}! Aqui é da ${clinicName}. ` +
        `Acabamos de enviar por e-mail o resumo dos seus resultados da pré-avaliação. ` +
        `Confira também a caixa de spam. Qualquer dúvida, é só responder por aqui.`
      : `Olá, ${a.respondent_name}! Aqui é da ${clinicName}. ` +
        `O resumo dos resultados da sua pré-avaliação foi enviado por e-mail ` +
        `para a equipe responsável pela sua consulta.`;

  const link = waLink(e164, body);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("whatsapp_messages").insert({
    clinic_id: a.clinic_id,
    contact_id: a.contact_id,
    assessment_id: a.id,
    to_phone: e164,
    kind: "result_notice",
    body,
    status: "sent",
    sent_at: new Date().toISOString(),
    created_by: params.actorUserId,
  });
  if (error) console.error("notifyResultsByWhatsapp insert error", error);

  const { recordAudit } = await import("@/lib/audit.server");
  await recordAudit({
    action: "whatsapp_result_notice" as const,
    clinicId: a.clinic_id as string,
    actorUserId: params.actorUserId,
    actorEmail: params.actorEmail,
    entityType: "assessment",
    entityId: a.id as string,
    details: {
      to_phone: e164,
      publico: params.audience,
      respondent_name: a.respondent_name as string,
    },
  });

  return { to_phone: e164, body, link };
}
