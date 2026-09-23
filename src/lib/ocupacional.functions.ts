import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { COPSOQ_BR, COPSOQ_DOMINIOS } from "@/lib/scales-ocupacional";

/**
 * Relatório agregado de riscos psicossociais (NR-01).
 *
 * O relatório é sempre coletivo: nenhum resultado individual é exposto e
 * grupos com menos de MIN_N respondentes não são detalhados, para preservar
 * o anonimato exigido em avaliação de riscos psicossociais.
 */

export const MIN_N = 5;

export type DominioAgregado = {
  id: string;
  label: string;
  /** média de 0 a 4 por item do domínio */
  media: number;
  /** % de respondentes com resposta 3 ou 4 em algum item do domínio */
  percentualExposto: number;
};

export type OcupacionalReport = {
  clinic_id: string;
  clinic_name: string | null;
  respondentes: number;
  suficiente: boolean;
  minN: number;
  mediaGeral: number;
  distribuicao: { label: string; level: number; quantidade: number; percentual: number }[];
  dominios: DominioAgregado[];
  assedioPercentual: number;
  atualizadoEm: string;
};

export const getOcupacionalReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OcupacionalReport[]> => {
    const { data, error } = await context.supabase
      .from("assessments")
      .select(
        "id, clinic_id, submitted_at, clinics(name), scale_results(scale_code, score, band, band_level, answers)",
      )
      .order("submitted_at", { ascending: false })
      .limit(1000);

    if (error) {
      console.error("getOcupacionalReport error", error);
      throw new Error("Não foi possível montar o relatório ocupacional.");
    }

    type Row = {
      clinic_id: string;
      submitted_at: string;
      clinics: { name: string } | null;
      scale_results: {
        scale_code: string;
        score: number | null;
        band: string | null;
        band_level: number | null;
        answers: Record<string, number> | null;
      }[];
    };

    const grupos = new Map<
      string,
      {
        nome: string | null;
        ultima: string;
        respostas: {
          score: number;
          band: string;
          level: number;
          answers: Record<string, number>;
        }[];
      }
    >();

    for (const a of (data ?? []) as unknown as Row[]) {
      const res = (a.scale_results ?? []).find((s) => s.scale_code === COPSOQ_BR.code);
      if (!res) continue;
      const g = grupos.get(a.clinic_id) ?? {
        nome: a.clinics?.name ?? null,
        ultima: a.submitted_at,
        respostas: [],
      };
      g.respostas.push({
        score: res.score ?? 0,
        band: res.band ?? "—",
        level: res.band_level ?? 0,
        answers: (res.answers ?? {}) as Record<string, number>,
      });
      if (a.submitted_at > g.ultima) g.ultima = a.submitted_at;
      grupos.set(a.clinic_id, g);
    }

    const out: OcupacionalReport[] = [];
    for (const [clinicId, g] of grupos) {
      const n = g.respostas.length;
      const suficiente = n >= MIN_N;

      const distMap = new Map<string, { label: string; level: number; quantidade: number }>();
      for (const r of g.respostas) {
        const k = r.band;
        const cur = distMap.get(k) ?? { label: r.band, level: r.level, quantidade: 0 };
        cur.quantidade += 1;
        distMap.set(k, cur);
      }

      const dominios: DominioAgregado[] = COPSOQ_DOMINIOS.map((d) => {
        let soma = 0;
        let contagem = 0;
        let expostos = 0;
        for (const r of g.respostas) {
          let exposto = false;
          for (const item of d.items) {
            const v = Number(r.answers[item] ?? 0);
            soma += v;
            contagem += 1;
            if (v >= 3) exposto = true;
          }
          if (exposto) expostos += 1;
        }
        return {
          id: d.id,
          label: d.label,
          media: contagem ? Number((soma / contagem).toFixed(2)) : 0,
          percentualExposto: n ? Math.round((expostos / n) * 100) : 0,
        };
      });

      const assedio = g.respostas.filter((r) => Number(r.answers["14"] ?? 0) >= 2).length;

      // Abaixo de MIN_N respondentes, média/distribuição/domínios/percentual
      // de assédio expõem dado quase-identificável de indivíduo — só o
      // contador bruto (respondentes) e o flag `suficiente` ficam visíveis
      // pra um grupo pequeno, igual já era feito pra dominios/assedioPercentual.
      out.push({
        clinic_id: clinicId,
        clinic_name: g.nome,
        respondentes: n,
        suficiente,
        minN: MIN_N,
        mediaGeral:
          suficiente && n
            ? Number((g.respostas.reduce((a, r) => a + r.score, 0) / n).toFixed(1))
            : 0,
        distribuicao: suficiente
          ? [...distMap.values()]
              .sort((a, b) => b.level - a.level)
              .map((d) => ({ ...d, percentual: n ? Math.round((d.quantidade / n) * 100) : 0 }))
          : [],
        dominios: suficiente ? dominios : [],
        assedioPercentual: suficiente && n ? Math.round((assedio / n) * 100) : 0,
        atualizadoEm: g.ultima,
      });
    }

    out.sort((a, b) => b.respondentes - a.respondentes);
    return out;
  });
