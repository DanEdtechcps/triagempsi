import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getAssessmentPsychoeducation,
  markPsychoeducationViewed,
  type AssessmentPsychoItem,
} from "@/lib/psychoeducation.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookOpen, ChevronRight, X, Sparkles, AlertCircle } from "lucide-react";

interface PortalPsychoeducationCardProps {
  assessmentId: string;
}

export function PortalPsychoeducationCard({
  assessmentId,
}: PortalPsychoeducationCardProps) {
  const fetchItems = useServerFn(getAssessmentPsychoeducation);
  const markViewed = useServerFn(markPsychoeducationViewed);

  const [activeItem, setActiveItem] = useState<AssessmentPsychoItem | null>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ["portal-psycho", assessmentId],
    queryFn: () => fetchItems({ data: { assessment_id: assessmentId } }),
  });

  const list = items ?? [];
  if (isLoading || list.length === 0) return null;

  function handleOpenItem(item: AssessmentPsychoItem) {
    setActiveItem(item);
    // Registra silenciosamente a leitura
    markViewed({
      data: {
        assessment_id: assessmentId,
        topic_slug: item.topic_slug,
      },
    }).catch(() => {});
  }

  return (
    <div className="mt-5 border-t border-border pt-4">
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">
          Orientações e Práticas de Cuidado Recomendadas
        </h3>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Materiais educativos e exercícios práticos indicados para o seu perfil pela equipe médica:
      </p>

      <div className="mt-3 space-y-2">
        {list.map((item) => {
          const isCrise = item.topic_slug === "crise-emocional";
          return (
            <button
              key={item.topic_slug}
              type="button"
              onClick={() => handleOpenItem(item)}
              className={`flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors ${
                isCrise
                  ? "border-destructive/40 bg-destructive/5 hover:bg-destructive/10"
                  : "border-border bg-background/70 hover:border-primary/50 hover:bg-muted/30"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-medium ${
                      isCrise ? "text-destructive" : "text-foreground"
                    }`}
                  >
                    {item.title}
                  </span>
                  {item.is_manual && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                      Recomendado pelo médico
                    </span>
                  )}
                </div>
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                  {item.short_title} · {item.resumo_card}
                </p>
              </div>

              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          );
        })}
      </div>

      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <Card className="max-h-[88vh] w-full max-w-xl overflow-y-auto border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {activeItem.short_title}
                </span>
                <h2 className="mt-1 font-serif text-xl font-semibold text-foreground">
                  {activeItem.title}
                </h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveItem(null)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Fechar</span>
              </Button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs leading-relaxed text-foreground/90">
                <div className="flex items-center gap-1.5 font-semibold text-primary">
                  <Sparkles className="h-4 w-4" />
                  Dica Rápida para o Dia a Dia:
                </div>
                <p className="mt-1">{activeItem.resumo_card}</p>
              </div>

              <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed text-foreground/90 whitespace-pre-line">
                {activeItem.body_md}
              </div>

              <div className="rounded-lg border border-border bg-muted/40 p-3 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1 font-medium text-foreground">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Nota sobre o conteúdo:
                </div>
                <p className="mt-0.5">
                  Este material foi elaborado com base nas melhores evidências em saúde mental e TCC. Ele tem propósito exclusivamente informativo e não substitui a consulta médica. Converse com seu médico para um plano personalizado.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={() => setActiveItem(null)}>Fechar orientações</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
