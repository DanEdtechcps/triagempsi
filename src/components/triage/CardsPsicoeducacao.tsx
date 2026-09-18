import { useState } from "react";
import { type PsychoTriggerResult } from "@/lib/psychoeducation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sun,
  Wind,
  HeartHandshake,
  Moon,
  BrainCircuit,
  Activity,
  Wine,
  ShieldCheck,
  BatteryWarning,
  Sparkles,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface CardsPsicoeducacaoProps {
  items: PsychoTriggerResult[];
  showAllFallback?: boolean;
}

export function CardsPsicoeducacao({ items }: CardsPsicoeducacaoProps) {
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  if (!items || items.length === 0) return null;

  return (
    <div className="mt-8 space-y-4 text-left">
      <div className="border-t border-border pt-6">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="font-serif text-xl font-semibold text-foreground">
            Orientações e Práticas de Cuidado Recomendadas
          </h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Com base nas áreas avaliadas, separamos materiais educativos e estratégias práticas de autorregulação elaboradas pela nossa equipe clínica:
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-1">
        {items.map((item) => {
          const isExpanded = expandedSlug === item.topic.slug;
          const isCrise = item.topic.slug === "crise-emocional";

          return (
            <Card
              key={item.topic.slug}
              className={`transition-all ${
                isCrise
                  ? "border-destructive/60 bg-destructive/5"
                  : "border-border bg-background/80 hover:border-primary/40"
              } p-4 sm:p-5`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    isCrise
                      ? "bg-destructive/15 text-destructive"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  <PsychoIcon name={item.topic.icon} isCrise={isCrise} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <h3
                      className={`text-base font-semibold ${
                        isCrise ? "text-destructive" : "text-foreground"
                      }`}
                    >
                      {item.topic.title}
                    </h3>
                    {isCrise ? (
                      <span className="rounded-full border border-destructive/40 bg-destructive/15 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                        Apoio Imediato
                      </span>
                    ) : (
                      <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
                        {item.topic.short_title}
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm leading-relaxed text-foreground/85">
                    {item.topic.resumo_card}
                  </p>

                  {isCrise && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <a
                        href="tel:188"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground shadow hover:bg-destructive/90"
                      >
                        Ligar CVV 188 (Gratuito 24h)
                      </a>
                      <a
                        href="tel:192"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-background px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
                      >
                        SAMU 192
                      </a>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {item.topic.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setExpandedSlug(isExpanded ? null : item.topic.slug)
                      }
                      className="h-8 gap-1 text-xs text-primary hover:text-primary"
                    >
                      {isExpanded ? "Ocultar detalhes" : isCrise ? "Ver Plano de Segurança Completo" : "Ler orientações completas"}
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 rounded-xl border border-border bg-card/60 p-4 text-xs leading-relaxed text-foreground/90">
                      <div className="prose prose-sm dark:prose-invert max-w-none space-y-2 whitespace-pre-line">
                        {item.topic.body_md}
                      </div>
                      <div className="mt-4 border-t border-border pt-3 text-[11px] text-muted-foreground">
                        ⚠️ <em>Aviso importante: Este material tem finalidade puramente psicoeducativa e não substitui a consulta clínica individualizada com o seu médico ou terapeuta.</em>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function PsychoIcon({ name, isCrise }: { name: string; isCrise?: boolean }) {
  const cls = `h-5 w-5 ${isCrise ? "text-destructive" : "text-primary"}`;
  switch (name) {
    case "Sun":
      return <Sun className={cls} />;
    case "Wind":
      return <Wind className={cls} />;
    case "HeartHandshake":
      return <HeartHandshake className={cls} />;
    case "Moon":
      return <Moon className={cls} />;
    case "BrainCircuit":
      return <BrainCircuit className={cls} />;
    case "Activity":
      return <Activity className={cls} />;
    case "Wine":
      return <Wine className={cls} />;
    case "ShieldCheck":
      return <ShieldCheck className={cls} />;
    case "BatteryWarning":
      return <BatteryWarning className={cls} />;
    case "Sparkles":
    default:
      return <Sparkles className={cls} />;
  }
}
