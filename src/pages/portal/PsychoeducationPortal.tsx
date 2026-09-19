import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  HeartHandshake,
} from "lucide-react";
import {
  getAssessmentPsychoeducation,
  markPsychoeducationViewed,
  type AssessmentPsychoItem,
} from "@/lib/psychoeducation.functions";

export interface PsychoeducationPortalProps {
  assessmentId: string;
  patientName?: string;
}

export function PsychoeducationPortal({
  assessmentId,
  patientName,
}: PsychoeducationPortalProps) {
  const queryClient = useQueryClient();
  const fetchItems = useServerFn(getAssessmentPsychoeducation);
  const markViewedFn = useServerFn(markPsychoeducationViewed);

  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["assessment-psycho", assessmentId],
    queryFn: () => fetchItems({ data: { assessment_id: assessmentId } }),
  });

  const markMutation = useMutation({
    mutationFn: (topicSlug: string) =>
      markViewedFn({
        data: {
          assessment_id: assessmentId,
          topic_slug: topicSlug,
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["assessment-psycho", assessmentId],
      });
    },
  });

  // Define o item ativo selecionado
  const activeItem =
    items.find((it) => it.topic_slug === activeSlug) || items[0] || null;

  if (isLoading) {
    return (
      <Card className="p-6 border-border bg-card">
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-primary animate-pulse" />
          <p className="text-sm text-muted-foreground">
            Preparando seus materiais de orientação em saúde mental...
          </p>
        </div>
      </Card>
    );
  }

  if (error || items.length === 0) {
    return null; // Oculta se não houver temas específicos
  }

  const isRead = Boolean(activeItem?.viewed_at);

  return (
    <Card className="mt-6 border-border bg-card p-5 sm:p-7 overflow-hidden shadow-sm">
      {/* Header Institucional */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <HeartHandshake className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-lg sm:text-xl font-semibold text-foreground">
              Guia de Saúde Mental & Orientações
            </h2>
            <p className="text-xs text-muted-foreground">
              Materiais educativos selecionados pelo seu profissional com base nas suas respostas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 gap-1.5 px-3 py-1">
            <Sparkles className="h-3.5 w-3.5" />
            {items.length} tema(s) para você
          </Badge>
        </div>
      </div>

      {/* Navegação por Abas de Tópicos */}
      <div className="mt-5 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {items.map((item) => {
          const selected = item.topic_slug === (activeItem?.topic_slug ?? "");
          const read = Boolean(item.viewed_at);

          return (
            <button
              key={item.topic_slug}
              type="button"
              onClick={() => setActiveSlug(item.topic_slug)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${
                selected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border/70 bg-muted/40 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              <span>{item.short_title || item.title}</span>
              {read && (
                <CheckCircle2
                  className={`h-3.5 w-3.5 ${
                    selected ? "text-primary-foreground" : "text-emerald-600 dark:text-emerald-400"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Conteúdo do Tema Ativo */}
      {activeItem && (
        <div className="mt-4 rounded-xl border border-border/70 bg-background/60 p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-3">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                Orientação Clínica Validada
              </span>
              <h3 className="font-serif text-lg font-bold text-foreground mt-0.5">
                {activeItem.title}
              </h3>
            </div>

            {isRead ? (
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1.5 px-3 py-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Leitura Concluída
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground gap-1.5 px-3 py-1">
                <Clock className="h-3.5 w-3.5" />
                Não lido
              </Badge>
            )}
          </div>

          <div className="rounded-lg border border-primary/15 bg-primary/5 p-3.5 text-xs sm:text-sm text-foreground/90 leading-relaxed font-medium">
            {activeItem.resumo_card}
          </div>

          <div className="prose prose-sm dark:prose-invert max-w-none text-xs sm:text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
            {activeItem.body_md}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4 mt-6">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Conteúdo psicoeducativo baseado em diretrizes da ABP / OMS</span>
            </div>

            {!isRead ? (
              <Button
                size="sm"
                className="gap-2 font-medium"
                disabled={markMutation.isPending}
                onClick={() => markMutation.mutate(activeItem.topic_slug)}
              >
                <CheckCircle2 className="h-4 w-4" />
                {markMutation.isPending ? "Registrando..." : "Concluir Leitura"}
              </Button>
            ) : (
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                Obrigado por se informar sobre sua saúde!
              </span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export default PsychoeducationPortal;
