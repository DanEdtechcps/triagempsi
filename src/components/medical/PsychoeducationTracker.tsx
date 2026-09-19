import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import {
  getAssessmentPsychoeducation,
  type AssessmentPsychoItem,
} from "@/lib/psychoeducation.functions";

export interface PsychoeducationTrackerProps {
  assessmentId: string;
}

export function PsychoeducationTracker({ assessmentId }: PsychoeducationTrackerProps) {
  const fetchItems = useServerFn(getAssessmentPsychoeducation);
  const [activePreview, setActivePreview] = useState<AssessmentPsychoItem | null>(null);

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["assessment-psycho", assessmentId],
    queryFn: () => fetchItems({ data: { assessment_id: assessmentId } }),
  });

  const totalAssigned = items.length;
  const totalRead = items.filter((it) => it.viewed_at !== null).length;
  const progressPercent = totalAssigned > 0 ? Math.round((totalRead / totalAssigned) * 100) : 0;

  function formatReadDate(isoString: string | null) {
    if (!isoString) return null;
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(d);
    } catch {
      return isoString;
    }
  }

  return (
    <Card className="p-4 sm:p-6 border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-semibold text-foreground">
              Monitor de Psicoeducação do Paciente
            </h2>
            <p className="text-xs text-muted-foreground">
              Materiais informativos validados disponibilizados no portal e status de engajamento
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`px-3 py-1 text-xs gap-1.5 ${
              progressPercent === 100
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : progressPercent > 0
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border text-muted-foreground"
            }`}
          >
            {progressPercent === 100 ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            {totalRead} de {totalAssigned} lidos ({progressPercent}%)
          </Badge>
        </div>
      </div>

      {isLoading && (
        <div className="mt-4 py-8 text-center text-xs text-muted-foreground">
          Carregando materiais educativos atribuídos...
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Não foi possível carregar os registros de leitura de psicoeducação.</span>
        </div>
      )}

      {!isLoading && !error && items.length === 0 && (
        <div className="mt-4 rounded-lg border border-border/80 bg-muted/20 p-4 text-center text-xs text-muted-foreground">
          Nenhum material de psicoeducação foi disparado para as queixas deste paciente.
        </div>
      )}

      {!isLoading && !error && items.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="divide-y divide-border/60 rounded-xl border border-border bg-background/50 overflow-hidden">
            {items.map((item) => {
              const readFormatted = formatReadDate(item.viewed_at);
              const isRead = Boolean(item.viewed_at);

              return (
                <div
                  key={item.topic_slug}
                  className="flex flex-col gap-2 p-3.5 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-muted/30"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">
                        {item.title}
                      </span>
                      {item.is_manual && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          Adicionado pela equipe
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {item.description}
                    </p>
                    <div className="text-[11px] text-muted-foreground/80">
                      Gatilho clínico: <span className="font-medium text-foreground/80">{item.trigger_reason}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0">
                    <div>
                      {isRead ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Lido em {readFormatted}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          Não lido no portal
                        </span>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      onClick={() => setActivePreview(item)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Ver
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal / Painel de Pré-visualização do Conteúdo */}
      {activePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Material de Psicoeducação
                </span>
                <h3 className="font-serif text-lg font-bold text-foreground">
                  {activePreview.title}
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full"
                onClick={() => setActivePreview(null)}
              >
                ✕
              </Button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto pr-2 space-y-4 text-sm text-foreground/90 leading-relaxed">
              <div className="rounded-lg bg-primary/5 p-3.5 border border-primary/20 text-xs text-primary-foreground/90">
                <p className="font-medium text-foreground">{activePreview.resumo_card}</p>
              </div>

              <div className="whitespace-pre-line text-xs sm:text-sm">
                {activePreview.body_md}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border flex justify-end">
              <Button size="sm" onClick={() => setActivePreview(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
