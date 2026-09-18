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
import {
  getClinicalDecisionSupport,
  type ClinicalDecisionItem,
} from "@/lib/clinical-decision-support";
import {
  BookOpen,
  Plus,
  CheckCircle2,
  Eye,
  FileText,
  AlertTriangle,
  Stethoscope,
  Activity,
  ShieldCheck,
  Check,
} from "lucide-react";

interface PainelPsicoeducacaoProps {
  assessmentId: string;
  scaleResults?: Array<{
    scale_code: string;
    score?: number | null;
    band?: string | null;
    band_level?: number | null;
    risk?: boolean;
    answers?: Record<string, number>;
  }>;
  riskPathway?: boolean;
  hasRiskFlags?: boolean;
}

export function PainelPsicoeducacao({
  assessmentId,
  scaleResults = [],
  riskPathway = false,
  hasRiskFlags = false,
}: PainelPsicoeducacaoProps) {
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

  // 1. Métricas de Engajamento
  const totalCount = list.length;
  const lidosCount = list.filter((i) => Boolean(i.viewed_at)).length;
  const engagementPerc = totalCount > 0 ? Math.round((lidosCount / totalCount) * 100) : 0;
  const lastViewedItem = list
    .filter((i) => i.viewed_at)
    .sort((a, b) => new Date(b.viewed_at!).getTime() - new Date(a.viewed_at!).getTime())[0];

  // 2. Sugestões de Apoio à Decisão Clínica (Clinical Decision Support)
  const decisionSupportItems: ClinicalDecisionItem[] = scaleResults.length > 0
    ? getClinicalDecisionSupport(scaleResults, { riskPathway: riskPathway || hasRiskFlags })
    : [];

  return (
    <div className="space-y-4">
      {/* SEÇÃO 1: APOIO À DECISÃO CLÍNICA DO MÉDICO (DECISION SUPPORT) */}
      {decisionSupportItems.length > 0 && (
        <Card className="p-4 sm:p-5 border-primary/20 bg-card">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Stethoscope className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-serif text-lg font-semibold text-foreground">
                Apoio à Decisão Clínica (Decision Support)
              </h2>
              <p className="text-xs text-muted-foreground">
                Insights diagnósticos e sugestões terapêuticas orientativas baseadas nos escores das escalas:
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {decisionSupportItems.map((cds) => {
              const isUrgente = cds.level === "urgente";
              const isAlerta = cds.level === "alerta";

              return (
                <div
                  key={cds.id}
                  className={`rounded-xl border p-4 transition-colors ${
                    isUrgente
                      ? "border-destructive/40 bg-destructive/5"
                      : isAlerta
                        ? "border-amber-500/40 bg-amber-500/5"
                        : "border-primary/20 bg-primary/5"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          isUrgente
                            ? "bg-destructive/20 text-destructive"
                            : isAlerta
                              ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                              : "bg-primary/20 text-primary"
                        }`}
                      >
                        {cds.level.toUpperCase()}
                      </span>
                      <h3
                        className={`text-sm font-semibold ${
                          isUrgente ? "text-destructive" : "text-foreground"
                        }`}
                      >
                        {cds.title}
                      </h3>
                    </div>
                    <span className="text-[11px] text-muted-foreground italic">
                      {cds.evidence_basis}
                    </span>
                  </div>

                  <p className="mt-1.5 text-xs text-foreground/90 font-medium">
                    {cds.clinical_guidance}
                  </p>

                  <div className="mt-2.5 rounded-lg border border-border/60 bg-background/50 p-2.5">
                    <div className="text-[11px] font-semibold text-muted-foreground">
                      Condutas Sugeridas:
                    </div>
                    <ul className="mt-1 space-y-1 text-xs text-foreground/80">
                      {cds.suggested_actions.map((act, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <Check className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
                          <span>{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-2 text-[10px] text-muted-foreground">
                    <strong>Critério detectado:</strong> {cds.rationale}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* SEÇÃO 2: PSICOEDUCAÇÃO E ENGAJAMENTO */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="font-serif text-lg font-semibold">
                Psicoeducação e Orientações Clínicas
              </h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                Versão v1 (2026.1)
              </span>
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

        {/* MÉTRICAS DE ENGAJAMENTO DO PACIENTE */}
        {totalCount > 0 && (
          <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">
                  Métricas de Engajamento do Paciente:
                </span>
                <span className="font-bold text-xs text-foreground">
                  {lidosCount} de {totalCount} materiais lidos ({engagementPerc}%)
                </span>
              </div>
              {lastViewedItem?.viewed_at && (
                <span className="text-[11px] text-muted-foreground">
                  Última leitura: {new Date(lastViewedItem.viewed_at).toLocaleDateString("pt-BR")} às {new Date(lastViewedItem.viewed_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>

            <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full transition-all duration-500 ${
                  engagementPerc === 100
                    ? "bg-emerald-500"
                    : engagementPerc > 0
                      ? "bg-primary"
                      : "bg-muted-foreground/30"
                }`}
                style={{ width: `${engagementPerc}%` }}
              />
            </div>
          </div>
        )}

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
                    <div className="flex flex-wrap items-center gap-2">
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
                      <span className="rounded bg-muted/60 px-1.5 py-0.2 text-[10px] text-muted-foreground">
                        {item.version || "v1 (2026.1)"}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">
                      <strong>Critério:</strong> {item.trigger_reason}
                    </p>

                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                      {item.viewed_at ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Visualizado no portal em {new Date(item.viewed_at).toLocaleDateString("pt-BR")} às {new Date(item.viewed_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5 opacity-60" />
                          Ainda não visualizado pelo paciente
                        </span>
                      )}

                      {item.tags?.length > 0 && (
                        <div className="flex items-center gap-1">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
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
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-lg font-semibold">{previewItem.title}</h3>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {previewItem.version || "v1 (2026.1)"}
                    </span>
                  </div>
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
    </div>
  );
}
