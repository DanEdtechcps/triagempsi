import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { PainelShell } from "@/components/painel/PainelShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AcessoNegado } from "@/components/painel/AcessoNegado";
import { isAccessDenied } from "@/lib/access-error";
import { listSeries, type SerieItem } from "@/lib/longitudinal.functions";
import { analyzeChange, CHANGE_SPECS } from "@/lib/reliable-change";

export const Route = createFileRoute("/_authenticated/evolucao")({
  head: () => ({
    meta: [
      { title: "Evolução longitudinal — curva das escalas por paciente" },
      {
        name: "description",
        content:
          "Acompanhe a reaplicação das escalas ao longo do tratamento e veja se a mudança de escore é clinicamente confiável.",
      },
      { property: "og:title", content: "Evolução longitudinal das escalas" },
      {
        property: "og:description",
        content: "Curva de PHQ-9, GAD-7 e demais escalas com análise de mudança confiável (RCI).",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EvolucaoPage,
});

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function scaleCodes(serie: SerieItem): string[] {
  const set = new Set<string>();
  for (const p of serie.pontos) for (const s of p.scales) if (s.score != null) set.add(s.code);
  return [...set].sort();
}

function EvolucaoPage() {
  const fetchSeries = useServerFn(listSeries);
  const { data, isLoading, error } = useQuery({
    queryKey: ["longitudinal-series"],
    queryFn: () => fetchSeries(),
  });
  const [selected, setSelected] = useState<string | null>(null);

  const series = useMemo(() => data ?? [], [data]);
  const comCurva = series.filter((s) => s.aplicacoes >= 2);
  const atual = series.find((s) => s.key === selected) ?? comCurva[0] ?? series[0] ?? null;

  if (error && isAccessDenied(error)) {
    return (
      <PainelShell title="Evolução longitudinal">
        <AcessoNegado error={error} />
      </PainelShell>
    );
  }

  return (
    <PainelShell title="Evolução longitudinal">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <Card className="p-4">
          <h2 className="font-serif text-lg font-semibold">Da triagem única ao acompanhamento</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Quando a mesma pessoa refaz a triagem, as escalas viram série temporal. A variação só é
            lida como melhora ou piora quando ultrapassa o erro de medida do instrumento (índice de
            mudança confiável) — abaixo disso, é ruído.
          </p>
        </Card>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando séries…</p>
        ) : series.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">
            Ainda não há triagens suficientes para montar curvas.
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <Card className="max-h-[70vh] overflow-y-auto p-2">
              <p className="px-2 py-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Pessoas ({comCurva.length} com curva)
              </p>
              <ul className="space-y-1">
                {series.map((s) => (
                  <li key={s.key}>
                    <button
                      type="button"
                      onClick={() => setSelected(s.key)}
                      className={`w-full rounded-md px-2 py-2 text-left text-sm hover:bg-muted ${
                        atual?.key === s.key ? "bg-muted font-medium" : ""
                      }`}
                    >
                      <span className="block truncate">{s.nome}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {s.aplicacoes} aplicação(ões) · última {formatDate(s.ultima)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>

            {atual ? <SerieDetalhe serie={atual} /> : null}
          </div>
        )}
      </div>
    </PainelShell>
  );
}

function SerieDetalhe({ serie }: { serie: SerieItem }) {
  const codes = scaleCodes(serie);

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-lg font-semibold">{serie.nome}</h3>
            <p className="text-xs text-muted-foreground">
              {serie.email} · {serie.clinic_name ?? "—"}
            </p>
          </div>
          <Badge variant="secondary">{serie.aplicacoes} aplicação(ões)</Badge>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {serie.pontos.map((p) => (
            <Button key={p.assessment_id} asChild variant="outline" size="sm">
              <Link to="/painel/$id" params={{ id: p.assessment_id }}>
                {formatDate(p.submitted_at)}
              </Link>
            </Button>
          ))}
        </div>
      </Card>

      {codes.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">
          Nenhuma escala pontuada nesta série.
        </Card>
      ) : (
        codes.map((code) => <CurvaEscala key={code} serie={serie} code={code} />)
      )}
    </div>
  );
}

function CurvaEscala({ serie, code }: { serie: SerieItem; code: string }) {
  const pontos = serie.pontos
    .map((p) => {
      const s = p.scales.find((x) => x.code === code);
      if (!s || s.score == null) return null;
      return { data: formatDate(p.submitted_at), score: Number(s.score), band: s.band, name: s.name };
    })
    .filter(Boolean) as { data: string; score: number; band: string | null; name: string }[];

  if (pontos.length === 0) return null;

  const primeiro = pontos[0];
  const ultimo = pontos[pontos.length - 1];
  const analise =
    pontos.length >= 2 ? analyzeChange(code, primeiro.score, ultimo.score) : null;
  const ref = CHANGE_SPECS[code];

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-medium">
            {primeiro.name} <span className="text-muted-foreground">({code})</span>
          </h4>
          <p className="text-xs text-muted-foreground">
            {primeiro.score} → {ultimo.score}
            {ultimo.band ? ` · ${ultimo.band}` : ""}
          </p>
        </div>
        {analise ? (
          <Badge
            variant={
              analise.verdict.startsWith("melhora")
                ? "default"
                : analise.verdict.startsWith("piora")
                  ? "destructive"
                  : "secondary"
            }
          >
            {analise.label}
          </Badge>
        ) : (
          <Badge variant="outline">Aplicação única</Badge>
        )}
      </div>

      {pontos.length >= 2 ? (
        <div className="mt-4 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={pontos} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="data" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                formatter={(v: number) => [`${v} pontos`, code]}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      {ref ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Mudança confiável a partir de {ref.rci} pontos
          {ref.mcid ? ` · diferença minimamente importante: ${ref.mcid} pontos` : ""}.
        </p>
      ) : null}
    </Card>
  );
}
