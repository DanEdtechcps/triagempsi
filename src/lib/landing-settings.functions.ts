import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type LandingSettings = {
  eyebrow: string;
  headline_line1: string;
  headline_line2: string;
  subheadline: string;
  share_title: string;
  share_description: string;
  share_image_url: string | null;
  /** Versão da miniatura — incrementada para furar o cache dos crawlers. */
  share_image_version: number;
};

export const LANDING_DEFAULTS: LandingSettings = {
  eyebrow: "Pré-triagem psiquiátrica de alto padrão",
  headline_line1: "A primeira consulta",
  headline_line2: "não começa do zero.",
  subheadline:
    "Vinte e oito instrumentos validados, uma árvore de decisão que se adapta a cada resposta e um painel clínico que entrega o caso mastigado.",
  share_title: "Triagem Psiquiátrica — pré-triagem premium para consultórios",
  share_description:
    "Plataforma de pré-triagem em saúde mental: instrumentos validados, triagem adaptativa e painel clínico.",
  share_image_url: null,
  share_image_version: 1,
};

const SELECT =
  "eyebrow, headline_line1, headline_line2, subheadline, share_title, share_description, share_image_url, share_image_version";

export const getLandingSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<LandingSettings> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data } = await supabaseAdmin
        .from("landing_settings")
        .select(SELECT)
        .limit(1)
        .maybeSingle();
      if (!data) return LANDING_DEFAULTS;
      return { ...LANDING_DEFAULTS, ...(data as Partial<LandingSettings>) };
    } catch (e) {
      console.warn("getLandingSettings: usando defaults", e);
      return LANDING_DEFAULTS;
    }
  },
);

/** Só o administrador geral (papel admin sem clínica) edita a landing. */
async function requireGlobalAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role, clinic_id")
    .eq("user_id", userId);
  if (error) throw new Error("Não foi possível verificar seu acesso.");
  const ok = (data ?? []).some(
    (r: { role: string; clinic_id: string | null }) =>
      r.role === "admin" && r.clinic_id === null,
  );
  if (!ok) {
    const { accessDeniedError } = await import("@/lib/access-error");
    throw accessDeniedError("Somente o administrador geral pode editar a landing.");
  }
}

const settingsSchema = z.object({
  eyebrow: z.string().trim().min(1).max(120),
  headline_line1: z.string().trim().min(1).max(120),
  headline_line2: z.string().trim().min(1).max(120),
  subheadline: z.string().trim().min(1).max(600),
  share_title: z.string().trim().min(1).max(120),
  share_description: z.string().trim().min(1).max(300),
  share_image_url: z.string().trim().url().max(500).nullable().optional(),
});

async function currentRowId() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("landing_settings")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (data?.id) return data.id as string;
  const { data: created, error } = await supabaseAdmin
    .from("landing_settings")
    .insert({ singleton: true })
    .select("id")
    .single();
  if (error) throw new Error("Não foi possível preparar as configurações da landing.");
  return created.id as string;
}

export const updateLandingSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => settingsSchema.parse(d))
  .handler(async ({ data, context }): Promise<LandingSettings> => {
    await requireGlobalAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const id = await currentRowId();
    const { data: row, error } = await supabaseAdmin
      .from("landing_settings")
      .update({
        ...data,
        share_image_url: data.share_image_url || null,
      })
      .eq("id", id)
      .select(SELECT)
      .single();
    if (error) throw new Error("Não foi possível salvar as configurações.");
    return { ...LANDING_DEFAULTS, ...(row as Partial<LandingSettings>) };
  });

const uploadSchema = z.object({
  fileName: z.string().trim().min(1).max(200),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  /** Conteúdo do arquivo em base64 (sem prefixo data:). */
  base64: z.string().min(16).max(9_000_000),
});

export const uploadLandingImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => uploadSchema.parse(d))
  .handler(async ({ data, context }): Promise<{ url: string }> => {
    await requireGlobalAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const bytes = Buffer.from(data.base64, "base64");
    if (bytes.byteLength > 5_000_000) {
      throw new Error("A imagem precisa ter no máximo 5 MB.");
    }
    const ext =
      data.contentType === "image/png"
        ? "png"
        : data.contentType === "image/webp"
          ? "webp"
          : "jpg";
    const path = `og/landing-${Date.now()}.${ext}`;

    const { error } = await supabaseAdmin.storage
      .from("landing")
      .upload(path, bytes, { contentType: data.contentType, upsert: true });
    if (error) throw new Error("Não foi possível enviar a imagem.");

    const url = "https://triagemmedica.lovable.app/api/public/og-landing";
    const id = await currentRowId();
    const { data: current } = await supabaseAdmin
      .from("landing_settings")
      .select("share_image_version")
      .eq("id", id)
      .maybeSingle();
    const nextVersion = Number((current as any)?.share_image_version ?? 0) + 1;
    await supabaseAdmin
      .from("landing_settings")
      .update({ share_image_path: path, share_image_url: url, share_image_version: nextVersion })
      .eq("id", id);

    const { versionedImageUrl } = await import("@/lib/landing-meta");
    return { url: versionedImageUrl(url, nextVersion)! };
  });

/** Incrementa a versão da miniatura para forçar novo preview no WhatsApp/LinkedIn. */
export const bumpLandingImageVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ version: number }> => {
    await requireGlobalAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const id = await currentRowId();
    const { data: current } = await supabaseAdmin
      .from("landing_settings")
      .select("share_image_version")
      .eq("id", id)
      .maybeSingle();
    const nextVersion = Number((current as any)?.share_image_version ?? 0) + 1;
    const { error } = await supabaseAdmin
      .from("landing_settings")
      .update({ share_image_version: nextVersion })
      .eq("id", id);
    if (error) throw new Error("Não foi possível atualizar a versão da miniatura.");
    return { version: nextVersion };
  });
