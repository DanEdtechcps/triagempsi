import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ClinicDoctor = {
  id: string;
  display_name: string;
  specialty: string | null;
};

const Input = z.object({ clinic_id: z.string().uuid() });

/**
 * Lista pública dos médicos que o paciente pode escolher na triagem.
 * A política RLS `doctor_profiles_public_read` garante que apenas perfis
 * listados (is_listed) e somente nome/especialidade sejam expostos.
 */
export const listClinicDoctors = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data }): Promise<ClinicDoctor[]> => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: rows, error } = await supabase
      .from("doctor_profiles")
      .select("id, display_name, specialty")
      .eq("clinic_id", data.clinic_id)
      .eq("is_listed", true)
      .order("display_name", { ascending: true });
    if (error) {
      console.error("listClinicDoctors error", error);
      return [];
    }
    return (rows ?? []) as ClinicDoctor[];
  });
