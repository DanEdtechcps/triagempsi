import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type Clinic = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  about: string | null;
  doctor_name: string | null;
  doctor_credentials: string | null;
  short_tagline: string | null;
  city: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website_url: string | null;
  intro_copy: string | null;
  done_copy: string | null;
  disclaimer: string | null;
  consent_copy: string | null;
  emergency_message: string | null;
};

const SlugSchema = z.object({ slug: z.string().trim().min(1).max(80) });

export const getClinicBySlug = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => SlugSchema.parse(raw))
  .handler(async ({ data }): Promise<Clinic | null> => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: clinic, error } = await supabase
      .from("clinics")
      .select(
        "id, slug, name, tagline, about, doctor_name, doctor_credentials, short_tagline, city, logo_url, favicon_url, primary_color, accent_color, contact_email, contact_phone, website_url, intro_copy, done_copy, disclaimer, consent_copy, emergency_message",
      )
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();
    if (error) {
      console.error("getClinicBySlug error", error);
      return null;
    }
    return (clinic as Clinic | null) ?? null;
  });
