import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PainelShell } from "@/components/painel/PainelShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getProgressSummary } from "@/lib/progress.functions";
import { AUDIT_ACTION_LABEL } from "@/lib/audit-labels";
import { AcessoNegado } from "@/components/painel/AcessoNegado";
import { isAccessDenied } from "@/lib/access-error";
import { DELIVERIES, formatDeliveryDate } from "@/config/deliveries";

export const Route = createFileRoute("/_authenticated/resumo")({
  head: () => ({
    meta: [
      { title: "Resumo de progresso — entregas e atividade" },
      {
        name: "description",
        content:
          "Painel de revisão rápida: últimas entregas do roadmap e atividade por consultório e tipo de ação.",
      },
      { property: "og:title", content: "Resumo de progresso do painel" },
      {
        property: "og:description",
        content: "Entregas recentes e atividade agrupada por consultório e tipo de ação.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResumoPage,
});

const PERIODS = [7, 30, 90] as const;

function actionLabel(action: string) {
  return AUDIT_ACTION_LABEL[action] ?? action;
}

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function ResumoPage() {
  const [days, setDays] = useState<number>(30);
  const fetchSummary = useServerFn(getProgressSummary);
  const { data, isLoading, error } = useQuery({
    queryKey: ["progress-summary", days],
    queryFn: () => fetchSummary({ data: { days } }),
  });

  if (error && isAccessDenied(error)) {
    return (
      <PainelShell title="Resumo de progresso">
        <AcessoNegado error={error} />
      </PainelShell>
    );
  }

  const deliveries = DELIVERIES.slice(0, 8);

  return (
    <PainelShell title="Resumo de progresso">
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Resumo de progresso</h1>
            <p className="text-sm text-muted-foreground">
              Últimas entregas do roadmap e atividade registrada por consultório e tipo de ação.
            </p>
          </div>
          <div className="flex gap-2">
            {PERIODS.map((p) => (
              <Button
                key={p}
                size="sm"
                variant={days === p ? "default" : "outline"}
                onClick={() => setDays(p)}
              >
                {p} dias
              </Button>
            ))}
          </div>
        </header>

        {error && !isAccessDenied(error) ? (
          <Card className="p-4 text-sm text-destructive">
            Não foi possível carregar o resumo. Tente novamente.
          </Card>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs uppercase text-muted-foreground">Ações no período</p>
            <p className="text-2xl font-semibold">{isLoading ? "…" : (data?.total ?? 0)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase text-muted-foreground">Consultórios ativos</p>
            <p className="text-2xl font-semibold">
              {isLoading ? "…" : (data?.clinics.length ?? 0)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase text-muted-foreground">Entregas registradas</p>
            <p className="text-2xl font-semibold">{DELIVERIES.length}</p>
          </Card>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Atividade por consultório</h2>
            {data?.scope === "proprio" ? (
              <span className="text-xs text-muted-foreground">Mostrando apenas suas ações</span>
            ) : null}
          </div>
          {isLoading ? (
            <Card className="p-4 text-sm text-muted-foreground">Carregando…</Card>
          ) : (data?.clinics.length ?? 0) === 0 ? (
            <Card className="p-4 text-sm text-muted-foreground">
              Nenhuma atividade registrada nos últimos {days} dias.
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {data?.clinics.map((c) => (
                <Card key={c.clinic_id ?? "sem"} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{c.clinic_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Última atividade: {formatDateTime(c.last_at)}
                      </p>
                    </div>
                    <Badge variant="secondary">{c.total} ações</Badge>
                  </div>
                  <ul className="space-y-1 text-sm">
                    {c.actions.map((a) => (
                      <li key={a.action} className="flex justify-between gap-3">
                        <span className="text-muted-foreground">{actionLabel(a.action)}</span>
                        <span className="tabular-nums font-medium">{a.count}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Total por tipo de ação</h2>
          {isLoading ? (
            <Card className="p-4 text-sm text-muted-foreground">Carregando…</Card>
          ) : (
            <Card className="divide-y">
              {(data?.actions ?? []).map((a) => (
                <div key={a.action} className="flex justify-between gap-3 p-3 text-sm">
                  <span>{actionLabel(a.action)}</span>
                  <span className="tabular-nums font-medium">{a.count}</span>
                </div>
              ))}
              {(data?.actions.length ?? 0) === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">Sem registros no período.</p>
              ) : null}
            </Card>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Últimas entregas do roadmap</h2>
            <Link to="/changelog" className="text-sm underline underline-offset-4">
              Ver changelog
            </Link>
          </div>
          <Card className="divide-y">
            {deliveries.map((d) => (
              <div key={`${d.date}-${d.title}`} className="space-y-1 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{d.title}</span>
                  {d.version ? <Badge variant="outline">v{d.version}</Badge> : null}
                  {d.area ? <Badge variant="secondary">{d.area}</Badge> : null}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatDeliveryDate(d.date)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{d.detail}</p>
                {d.impact ? <p className="text-sm">Impacto: {d.impact}</p> : null}
              </div>
            ))}
          </Card>
        </section>
      </div>
    </PainelShell>
  );
}
