import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getAssessmentPsychoeducation,
  releaseManualPsychoeducation,
  type AssessmentPsychoItem,
} from "@/lib/psychoeducation.functions";
import { OFFICIAL_PSYCHOEDUCATION_TOPICS } from "@/lib/psychoeducation-data";
import { BookOpen, Plus, CheckCircle2, Eye, FileText, AlertTriangle } from "lucide-react";

interface PainelPsicoeducacaoProps {
  assessmentId: string;
}

export function PainelPsicoeducacao({ assessmentId }: PainelPsicoeducacaoProps) {
  const queryClient = useQueryClient();
  const fetchItems = useServerFn(getAssessmentPsychoeducation);
  const releaseManual = useServerFn(releaseManualPsychoeducation);

  const [selectedSlug, setSelectedSlug] = useState("");
  const [previewItem, setPreviewItem] = useState<AssessmentPsychoItem | null>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ["assessment-psycho", assessmentId],
    queryFn: () => fetchItems({ data: { assessment_id: assessmentId } }),
  });

  const mutation = useMutation({
    mutationFn: async (slug: string) => {
      await releaseManual({
        data: {
          assessment_id: assessmentId,
          topic_slug: slug,
        },
      });
    },
    onSuccess: () => {
      setSelectedSlug("");
      queryClient.invalidateQueries({ queryKey: ["assessment-psycho", assessmentId] });
    },
  });

  const list = items ?? [];
  const existingSlugs = new Set(list.map((i) => i.topic_slug));
  const availableToRelease = OFFICIAL_PSYCHOEDUCATION_TOPICS.filter(
    (t) => !existingSlugs.has(t.slug),
  );

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="font-serif text-lg font-semibold">
              Psicoeducação e Orientações Clínicas
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Materiais recomendados pelo motor clínico e disponibilizados ao paciente no PDF e Portal.
          </p>
        </div>

        {availableToRelease.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedSlug}
              onChange={(e) => setSelectedSlug(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-xs"
            >
              <option value="">Prescrever novo material…</option>
              {availableToRelease.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.title}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              disabled={!selectedSlug || mutation.isPending}
              onClick={() => {
                if (selectedSlug) mutation.mutate(selectedSlug);
              }}
              className="h-9 gap-1 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              {mutation.isPending ? "Liberando…" : "Liberar"}
            </Button>
          </div>
        )}
      </div>

      {isLoading && (
        <p className="py-4 text-sm text-muted-foreground">
          Carregando materiais recomendados…
        </p>
      )}

      {!isLoading && list.length === 0 && (
        <p className="py-4 text-sm text-muted-foreground">
          Nenhum material de psicoeducação foi ativado automaticamente para esta triagem.
        </p>
      )}

      {!isLoading && list.length > 0 && (
        <div className="mt-4 divide-y divide-border">
          {list.map((item) => {
            const isCrise = item.topic_slug === "crise-emocional";
            return (
              <div
                key={item.topic_slug}
                className="flex flex-wrap items-start justify-between gap-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium ${
                        isCrise ? "text-destructive font-semibold" : "text-foreground"
                      }`}
                    >
                      {item.title}
                    </span>
                    {isCrise && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                        <AlertTriangle className="h-3 w-3" />
                        Crise / Urgência
                      </span>
                    )}
                    {item.is_manual && (
                      <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                        Prescrito pelo médico
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs text-muted-foreground">
                    <strong>Critério:</strong> {item.trigger_reason}
                  </p>

                  <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                    {item.viewed_at ? (
                      <span className="inline-flex items-center gap-1 text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Visualizado no portal em {new Date(item.viewed_at).toLocaleDateString("pt-BR")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5 opacity-60" />
                        Ainda não visualizado pelo paciente
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewItem(item)}
                  className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Ver texto
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
              <div>
                <h3 className="font-serif text-lg font-semibold">{previewItem.title}</h3>
                <p className="text-xs text-muted-foreground">{previewItem.short_title}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewItem(null)}
              >
                Fechar
              </Button>
            </div>

            <div className="mt-4 space-y-4 text-xs leading-relaxed text-foreground/90">
              <div>
                <div className="font-semibold text-primary">Versão Resumo (impresso no PDF do Paciente):</div>
                <div className="mt-1 rounded-lg border border-border bg-muted/40 p-3">
                  {previewItem.summary_pdf}
                </div>
              </div>

              <div>
                <div className="font-semibold text-primary">Versão Completa (exibida no Portal):</div>
                <div className="prose prose-sm dark:prose-invert mt-1 max-w-none whitespace-pre-line rounded-lg border border-border bg-muted/20 p-3">
                  {previewItem.body_md}
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <Button size="sm" onClick={() => setPreviewItem(null)}>
                Concluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
