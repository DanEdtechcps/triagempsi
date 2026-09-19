import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getAssessmentPsychoeducation,
  markPsychoeducationViewed,
  type AssessmentPsychoItem,
} from "@/lib/psychoeducation.functions";
import { OFFICIAL_SAFETY_PLAN } from "@/lib/safety-plan";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  BookOpen,
  ChevronRight,
  X,
  Sparkles,
  AlertCircle,
  PhoneCall,
  CheckCircle2,
  Search,
  Tag,
  ShieldAlert,
  Clock,
  ExternalLink,
} from "lucide-react";

interface PortalPsychoeducationCardProps {
  assessmentId: string;
}

export function PortalPsychoeducationCard({
  assessmentId,
}: PortalPsychoeducationCardProps) {
  const fetchItems = useServerFn(getAssessmentPsychoeducation);
  const markViewed = useServerFn(markPsychoeducationViewed);

  const [activeItem, setActiveItem] = useState<AssessmentPsychoItem | null>(null);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [filterReadStatus, setFilterReadStatus] = useState<"todos" | "novos" | "lidos">("todos");

  const { data: items, isLoading, refetch } = useQuery({
    queryKey: ["portal-psycho", assessmentId],
    queryFn: () => fetchItems({ data: { assessment_id: assessmentId } }),
  });

  const list = items ?? [];
  const hasCrisis = list.some((i) => i.topic_slug === "crise-emocional");

  // Extrai todas as tags únicas dos materiais disponíveis
  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const item of list) {
      if (item.tags) {
        for (const t of item.tags) set.add(t);
      }
    }
    return Array.from(set);
  }, [list]);

  // Filtra por termo de busca, tag e status de leitura
  const filteredList = useMemo(() => {
    return list.filter((item) => {
      // Filtro de status de leitura
      if (filterReadStatus === "lidos" && !item.viewed_at) return false;
      if (filterReadStatus === "novos" && item.viewed_at) return false;

      // Filtro por tag
      if (selectedTag && (!item.tags || !item.tags.includes(selectedTag))) {
        return false;
      }

      // Filtro por busca textual
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const inTitle = item.title.toLowerCase().includes(query);
        const inShort = item.short_title.toLowerCase().includes(query);
        const inResumo = item.resumo_card.toLowerCase().includes(query);
        const inTags = item.tags?.some((t) => t.toLowerCase().includes(query));
        if (!inTitle && !inShort && !inResumo && !inTags) return false;
      }

      return true;
    });
  }, [list, filterReadStatus, selectedTag, searchTerm]);

  if (isLoading || list.length === 0) return null;

  function handleOpenItem(item: AssessmentPsychoItem) {
    setActiveItem(item);
    // Registra silenciosamente a leitura e atualiza estado
    markViewed({
      data: {
        assessment_id: assessmentId,
        topic_slug: item.topic_slug,
      },
    })
      .then(() => {
        void refetch();
      })
      .catch(() => {});
  }

  return (
    <div className="mt-6 border-t border-border pt-6">
      {/* 1. SEÇÃO DE PLANO DE SEGURANÇA E CRISE (SE APLICÁVEL) */}
      {hasCrisis && (
        <div className="mb-6 overflow-hidden rounded-xl border-2 border-destructive/60 bg-destructive/10 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive text-destructive-foreground">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <span className="rounded-full bg-destructive/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-destructive">
                  Plano de Cuidado Imediato
                </span>
                <h3 className="mt-1 font-serif text-lg font-bold text-destructive">
                  {OFFICIAL_SAFETY_PLAN.titulo}
                </h3>
                <p className="mt-1 text-xs text-foreground/90">
                  {OFFICIAL_SAFETY_PLAN.aviso_urgencia}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href="tel:188"
                className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground shadow hover:bg-destructive/90"
              >
                <PhoneCall className="h-3.5 w-3.5" />
                Ligar CVV 188
              </a>
              <a
                href="tel:192"
                className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-background px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
              >
                <PhoneCall className="h-3.5 w-3.5" />
                SAMU 192
              </a>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSafetyModal(true)}
                className="h-8 border-destructive/40 text-xs font-medium text-destructive hover:bg-destructive/15"
              >
                Ver Plano Completo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. CABEÇALHO DA BIBLIOTECA PSICOEDUCATIVA */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-foreground">
            Biblioteca de Orientações Clínicas Recomendadas
          </h3>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            {list.length} temas
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          Versão v1 (2026.1)
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Materiais educativos, exercícios práticos e autorregulação selecionados para você:
      </p>

      {/* 3. FILTROS E BUSCA */}
      <div className="mt-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar tema, sintoma ou palavra-chave…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setFilterReadStatus("todos")}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                filterReadStatus === "todos"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Todos ({list.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterReadStatus("novos")}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                filterReadStatus === "novos"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Novos ({list.filter((i) => !i.viewed_at).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterReadStatus("lidos")}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                filterReadStatus === "lidos"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Lidos ({list.filter((i) => i.viewed_at).length})
            </button>
          </div>
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <Tag className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">Tags:</span>
            {allTags.map((tag) => {
              const isSelected = selectedTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(isSelected ? null : tag)}
                  className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
            {selectedTag && (
              <button
                type="button"
                onClick={() => setSelectedTag(null)}
                className="text-[10px] text-primary underline"
              >
                Limpar tag
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. LISTA DE MATERIAIS */}
      <div className="mt-3 space-y-2">
        {filteredList.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            Nenhum material encontrado com os filtros selecionados.
          </div>
        ) : (
          filteredList.map((item) => {
            const isCrise = item.topic_slug === "crise-emocional";
            const isRead = Boolean(item.viewed_at);

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
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-sm font-medium ${
                        isCrise ? "font-semibold text-destructive" : "text-foreground"
                      }`}
                    >
                      {item.title}
                    </span>
                    {item.is_manual && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        Prescrito pelo médico
                      </span>
                    )}
                    {isRead ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Lido
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                        Novo
                      </span>
                    )}
                  </div>

                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                    {item.short_title} · {item.resumo_card}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {item.tags?.map((t) => (
                      <span
                        key={t}
                        className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {t}
                      </span>
                    ))}
                    {item.viewed_at && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Lido em {new Date(item.viewed_at).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            );
          })
        )}
      </div>

      {/* 5. MODAL DE PLANO DE SEGURANÇA ESTRUTURADO */}
      {showSafetyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border-destructive/40 bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-6 w-6 text-destructive" />
                <div>
                  <h2 className="font-serif text-xl font-bold text-destructive">
                    {OFFICIAL_SAFETY_PLAN.titulo}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {OFFICIAL_SAFETY_PLAN.subtitulo} · {OFFICIAL_SAFETY_PLAN.versao}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSafetyModal(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Fechar</span>
              </Button>
            </div>

            <div className="mt-4 space-y-4 text-xs leading-relaxed text-foreground/90">
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
                <strong>Importante:</strong> {OFFICIAL_SAFETY_PLAN.aviso_urgencia}
              </div>

              {/* Contatos 24h */}
              <div>
                <h4 className="font-semibold text-foreground">Canais Gratuitos de Emergência 24h:</h4>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {OFFICIAL_SAFETY_PLAN.contatos_emergencia.map((c) => (
                    <div
                      key={c.nome}
                      className="rounded-lg border border-border bg-muted/40 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{c.nome}</span>
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                          {c.badge}
                        </span>
                      </div>
                      <p className="mt-1 text-muted-foreground">{c.descricao}</p>
                      {c.linkTel ? (
                        <a
                          href={c.linkTel}
                          className="mt-2 inline-flex items-center gap-1 font-bold text-destructive hover:underline"
                        >
                          <PhoneCall className="h-3 w-3" />
                          Ligar {c.numero}
                        </a>
                      ) : (
                        <span className="mt-2 inline-block font-semibold text-foreground">
                          {c.numero}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Rede de Apoio */}
              <div className="rounded-lg border border-border bg-muted/30 p-3.5">
                <h4 className="font-semibold text-foreground">{OFFICIAL_SAFETY_PLAN.rede_apoio.titulo}</h4>
                <p className="mt-1 text-muted-foreground">{OFFICIAL_SAFETY_PLAN.rede_apoio.orientacao}</p>
                <div className="mt-2 rounded-md border border-border bg-background p-2.5 italic text-foreground">
                  "{OFFICIAL_SAFETY_PLAN.rede_apoio.mensagem_modelo}"
                </div>
              </div>

              {/* Técnicas de Distração */}
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground">Estratégias Imediatas de Distração e Descompressão:</h4>
                {OFFICIAL_SAFETY_PLAN.estrategias_distracao.map((strat) => (
                  <div key={strat.titulo} className="rounded-lg border border-border bg-muted/20 p-3">
                    <div className="font-medium text-primary">{strat.titulo}</div>
                    <ul className="mt-1.5 list-inside list-disc space-y-1 text-muted-foreground">
                      {strat.passos.map((p, idx) => (
                        <li key={idx}>{p}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Segurança do Ambiente */}
              <div className="rounded-lg border border-border bg-muted/30 p-3.5">
                <h4 className="font-semibold text-foreground">{OFFICIAL_SAFETY_PLAN.seguranca_ambiente.titulo}</h4>
                <ul className="mt-1.5 list-inside list-disc space-y-1 text-muted-foreground">
                  {OFFICIAL_SAFETY_PLAN.seguranca_ambiente.orientacoes.map((o, idx) => (
                    <li key={idx}>{o}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={() => setShowSafetyModal(false)}>
                Entendi e fechar
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* 6. MODAL DO TEMA PSICOEDUCATIVO COMPLETO */}
      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <Card className="max-h-[88vh] w-full max-w-xl overflow-y-auto border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    {activeItem.short_title}
                  </span>
                  <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] text-muted-foreground">
                    {activeItem.version || "v1 (2026.1)"}
                  </span>
                </div>
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
