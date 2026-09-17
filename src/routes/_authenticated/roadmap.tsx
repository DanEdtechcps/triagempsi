import { createFileRoute } from "@tanstack/react-router";
import { PainelShell } from "@/components/painel/PainelShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ROADMAP,
  ROADMAP_STATUS_LABEL,
  ROADMAP_VERSION,
  type RoadmapStatus,
} from "@/config/manual";
import { downloadRoadmapPdf } from "@/lib/pdf-manual";
import { downloadRoadmapCsv } from "@/lib/roadmap-csv";
import { DELIVERIES, formatDeliveryDate } from "@/config/deliveries";
import { RevisaoEntregas } from "@/components/painel/RevisaoEntregas";

export const Route = createFileRoute("/_authenticated/roadmap")({
  head: () => ({
    meta: [
      { title: "Roadmap do projeto de pré-triagem" },
      {
        name: "description",
        content:
          "O que já está entregue, o que está em andamento e as próximas oportunidades da plataforma de pré-triagem.",
      },
      { property: "og:title", content: "Roadmap do projeto" },
      {
        property: "og:description",
        content: "Entregas, pendências e oportunidades priorizadas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Roadmap,
});

const STATUS_CLS: Record<RoadmapStatus, string> = {
  pronto: "border-primary/30 bg-primary/10 text-foreground",
  andamento: "border-warning/40 bg-warning/15 text-warning-foreground",
  planejado: "border-border bg-muted text-muted-foreground",
  ideia: "border-accent bg-accent/40 text-accent-foreground",
};

function Roadmap() {
  const todos = ROADMAP.flatMap((f) => f.items);
  const resumo = (
    ["pronto", "andamento", "planejado", "ideia"] as RoadmapStatus[]
  ).map((s) => ({
    status: s,
    total: todos.filter((i) => i.status === s).length,
  }));

  return (
    <PainelShell
      title="Roadmap"
      action={
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => downloadRoadmapCsv()}>
            Exportar CSV
          </Button>
          <Button size="sm" onClick={() => downloadRoadmapPdf()}>
            Baixar roadmap em PDF
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <Card className="space-y-3 p-4 sm:p-6">
          <div>
            <h1 className="font-serif text-xl font-semibold sm:text-2xl">
              Roadmap do projeto
            </h1>
            <p className="text-sm text-muted-foreground">
              {ROADMAP_VERSION}. Panorama do que temos, do que falta e do que
              agrega mais valor clínico e operacional.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {resumo.map((r) => (
              <span
                key={r.status}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${STATUS_CLS[r.status]}`}
              >
                {ROADMAP_STATUS_LABEL[r.status]}
                <span className="rounded-full bg-background/70 px-1.5 py-0.5 text-[11px]">
                  {r.total}
                </span>
              </span>
            ))}
          </div>
        </Card>

        <RevisaoEntregas />

        {DELIVERIES.length > 0 && (
          <Card className="space-y-4 p-4 sm:p-6">
            <div>
              <h2 className="font-serif text-lg font-semibold">
                Registro de entregas
              </h2>
              <p className="text-sm text-muted-foreground">
                Histórico automático: cada entrega é registrada com título,
                descrição e data. Última atualização em{" "}
                {formatDeliveryDate(DELIVERIES[0]!.date)}.
              </p>
            </div>
            <ol className="space-y-3 border-l border-border pl-4">
              {DELIVERIES.map((d) => (
                <li key={`${d.date}-${d.title}`} className="relative">
                  <span className="absolute -left-[21px] top-2 h-2 w-2 rounded-full bg-primary" />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">
                      {d.title}
                    </span>
                    {d.area && (
                      <span className="inline-flex rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        {d.area}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDeliveryDate(d.date)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {d.detail}
                  </p>
                </li>
              ))}
            </ol>
          </Card>
        )}



        {ROADMAP.map((fase) => (
          <Card key={fase.id} className="space-y-4 p-4 sm:p-6">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <h2 className="truncate font-serif text-lg font-semibold">
                {fase.title}
              </h2>
              <span className="shrink-0 text-xs text-muted-foreground">
                {fase.horizon}
              </span>
            </div>
            <ul className="space-y-3">
              {fase.items.map((item) => (
                <li
                  key={item.title}
                  className="rounded-md border border-border p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">
                      {item.title}
                    </span>
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_CLS[item.status]}`}
                    >
                      {ROADMAP_STATUS_LABEL[item.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.detail}
                  </p>
                  {item.value && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        Impacto:
                      </span>{" "}
                      {item.value}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </PainelShell>
  );
}
