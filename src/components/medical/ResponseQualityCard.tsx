import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import { SCALE_BY_CODE, getItemOptions } from "@/lib/scales-data";
import {
  assessResponseQuality,
  QUALITY_LABEL,
  type QualityScaleInput,
  type TelemetryInput,
} from "@/lib/response-quality";

type ScaleResultLike = {
  scale_code: string;
  answers?: Record<string, number> | null;
  estimated_items?: string[] | null;
};

/** Monta a entrada do índice a partir das escalas reais (enunciados, nº de opções e faixa de valores). */
export function buildQualityScales(results: ScaleResultLike[]): QualityScaleInput[] {
  return results.map((r) => {
    const def = SCALE_BY_CODE[r.scale_code];
    const itemTexts: Record<string, string> = {};
    let min = Infinity;
    let max = -Infinity;
    const distinct = new Set<number>();
    for (const item of def?.items ?? []) {
      itemTexts[item.id] = item.text;
      for (const o of getItemOptions(def!, item.id)) {
        distinct.add(o.value);
        min = Math.min(min, o.value);
        max = Math.max(max, o.value);
      }
    }
    return {
      scale_code: r.scale_code,
      answers: r.answers ?? {},
      estimated_items: r.estimated_items ?? [],
      option_count: distinct.size || undefined,
      value_range: Number.isFinite(min) && Number.isFinite(max) ? [min, max] : undefined,
      item_texts: itemTexts,
    };
  });
}

/**
 * Qualidade do preenchimento (apoio ao médico). Não altera classificação, escore
 * nem alerta de risco; "baixa" só significa "confirmar na consulta".
 */
export function ResponseQualityCard({
  scaleResults,
  telemetryRecords = [],
  symptoms = [],
}: {
  scaleResults: ScaleResultLike[];
  telemetryRecords?: TelemetryInput[];
  symptoms?: string[];
}) {
  const report = useMemo(
    () =>
      assessResponseQuality({
        scales: buildQualityScales(scaleResults),
        telemetry: telemetryRecords,
        symptoms,
      }),
    [scaleResults, telemetryRecords, symptoms],
  );

  const ok = report.level === "adequada";
  return (
    <Card className="p-4 sm:p-5" data-testid="response-quality" data-level={report.level}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-serif text-lg font-semibold text-foreground">
          Qualidade do preenchimento
        </h2>
        <Badge
          className={
            ok
              ? "gap-1.5 border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-emerald-700 dark:text-emerald-300"
              : "gap-1.5 border-amber-500/30 bg-amber-500/15 px-3 py-1 text-amber-700 dark:text-amber-300"
          }
        >
          {ok ? <ShieldCheck className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          {QUALITY_LABEL[report.level]}
        </Badge>
      </div>

      {report.flags.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-foreground/85">
          {report.flags.map((f, i) => (
            <li key={`${f.code}-${i}`}>{f.message}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Nenhum sinal de preenchimento apressado, uniforme ou inconsistente foi encontrado.
        </p>
      )}

      {!report.telemetry_available && (
        <p className="mt-2 text-xs text-muted-foreground">
          Sem tempos de resposta capturados nesta triagem: o ritmo de preenchimento não foi avaliado.
        </p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Indicador de apoio: <strong>não altera a classificação, o escore nem o alerta de risco</strong>.
        Respostas uniformes ou rápidas também podem refletir um quadro real, leitura difícil ou
        sofrimento intenso. Limiares provisórios, a calibrar com o piloto.
      </p>
    </Card>
  );
}
