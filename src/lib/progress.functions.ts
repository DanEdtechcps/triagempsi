import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ProgressAction = { action: string; count: number };

export type ClinicProgress = {
  clinic_id: string | null;
  clinic_name: string;
  total: number;
  last_at: string | null;
  actions: ProgressAction[];
};

export type ProgressSummary = {
  since: string;
  days: number;
  total: number;
  scope: "global" | "proprio";
  clinics: ClinicProgress[];
  actions: ProgressAction[];
};

/**
 * Resumo de progresso: atividade registrada no log de auditoria agrupada por
 * consultório e por tipo de ação. RLS limita às clínicas do usuário; quem não
 * tem acesso global vê apenas as próprias ações.
 */
export const getProgressSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ days: z.number().int().min(1).max(365).default(30) }).parse(raw ?? {}),
  )
  .handler(async ({ data, context }): Promise<ProgressSummary> => {
    const { getAccessScope } = await import("@/lib/painel-access.server");
    const scope = await getAccessScope(context.supabase, context.userId);

    const since = new Date(Date.now() - data.days * 24 * 60 * 60 * 1000).toISOString();

    let query = context.supabase
      .from("audit_logs")
      .select("action, clinic_id, created_at")
      .gte("created_at", since);
    if (!scope.global) query = query.eq("actor_user_id", context.userId);

    const { data: rows, error } = await query.order("created_at", { ascending: false }).limit(5000);

    if (error) {
      console.error("getProgressSummary error", error);
      throw new Error("Não foi possível carregar o resumo de progresso.");
    }

    const logs = (rows ?? []) as {
      action: string;
      clinic_id: string | null;
      created_at: string;
    }[];

    const clinicIds = [...new Set(logs.map((l) => l.clinic_id).filter((v): v is string => !!v))];
    const names = new Map<string, string>();
    if (clinicIds.length) {
      const { data: clinics } = await context.supabase
        .from("clinics")
        .select("id, name")
        .in("id", clinicIds);
      for (const c of (clinics ?? []) as { id: string; name: string }[]) {
        names.set(c.id, c.name);
      }
    }

    const byClinic = new Map<string, ClinicProgress>();
    const byAction = new Map<string, number>();

    for (const log of logs) {
      const key = log.clinic_id ?? "sem-consultorio";
      let entry = byClinic.get(key);
      if (!entry) {
        entry = {
          clinic_id: log.clinic_id,
          clinic_name: log.clinic_id
            ? (names.get(log.clinic_id) ?? "Consultório")
            : "Sem consultório",
          total: 0,
          last_at: null,
          actions: [],
        };
        byClinic.set(key, entry);
      }
      entry.total += 1;
      if (!entry.last_at || log.created_at > entry.last_at) entry.last_at = log.created_at;

      const found = entry.actions.find((a) => a.action === log.action);
      if (found) found.count += 1;
      else entry.actions.push({ action: log.action, count: 1 });

      byAction.set(log.action, (byAction.get(log.action) ?? 0) + 1);
    }

    const clinics = [...byClinic.values()]
      .map((c) => ({ ...c, actions: [...c.actions].sort((a, b) => b.count - a.count) }))
      .sort((a, b) => b.total - a.total);

    return {
      since,
      days: data.days,
      total: logs.length,
      scope: scope.global ? "global" : "proprio",
      clinics,
      actions: [...byAction.entries()]
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count),
    };
  });
