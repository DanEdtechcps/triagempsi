import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PainelShell } from "@/components/painel/PainelShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AcessoNegado } from "@/components/painel/AcessoNegado";
import { isAccessDenied } from "@/lib/access-error";
import { getOcupacionalReport, type OcupacionalReport } from "@/lib/ocupacional.functions";

export const Route = createFileRoute("/_authenticated/ocupacional")({
  head: () => ({
    meta: [
      { title: "Riscos psicossociais NR-01 — relatório agregado por empresa" },
      {
        name: "description",
        content:
          "Relatório coletivo de riscos psicossociais no trabalho (COPSOQ/PRIMA-EF) com domínios, exposição e distribuição de gravidade.",
      },
      { property: "og:title", content: "Relatório de riscos psicossociais (NR-01)" },
      {
        property: "og:description",
        content:
          "Domínios COPSOQ, percentual de exposição e distribuição de gravidade por empresa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OcupacionalPage,
});

function csvEscape(v: string | number) {
  const s = String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportCsv(reports: OcupacionalReport[]) {
  const linhas = [
    ["Empresa", "Respondentes", "Média geral", "Domínio", "Média do domínio", "% exposto"],
  ];
  for (const r of reports) {
    if (!r.suficiente) {
      linhas.push([
        r.clinic_name ?? r.clinic_id,
        String(r.respondentes),
        "—",
        "amostra insuficiente",
        "—",
        "—",
      ]);
      continue;
    }
    for (const d of r.dominios) {
      linhas.push([
        r.clinic_name ?? r.clinic_id,
        String(r.respondentes),
        String(r.mediaGeral),
        d.label,
        String(d.media),
        String(d.percentualExposto),
      ]);
    }
  }
  const csv = "\uFEFF" + linhas.map((l) => l.map(csvEscape).join(";")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `riscos-psicossociais-nr01-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function OcupacionalPage() {
  const fetchReport = useServerFn(getOcupacionalReport);
  const { data, isLoading, error } = useQuery({
    queryKey: ["ocupacional-report"],
    queryFn: () => fetchReport(),
  });

  if (error && isAccessDenied(error)) {
    return (
      <PainelShell title="Riscos psicossociais (NR-01)">
        <AcessoNegado error={error} />
      </PainelShell>
    );
  }

  const reports = data ?? [];

  return (
    <PainelShell
      title="Riscos psicossociais (NR-01)"
      action={
        reports.length > 0 ? (
          <Button variant="outline" size="sm" onClick={() => exportCsv(reports)}>
            Exportar CSV
          </Button>
        ) : null
      }
    >
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <Card className="p-4">
          <h2 className="font-serif text-lg font-semibold">Relatório sempre coletivo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            O rastreio COPSOQ-BR mapeia os domínios do PRIMA-EF (demandas, autonomia, apoio,
            reconhecimento, assédio e esgotamento) para o inventário de riscos psicossociais exigido
            pela NR-01. Grupos com menos de 5 respondentes não são detalhados, para que ninguém seja
            identificável no relatório entregue à empresa.
          </p>
        </Card>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando relatório…</p>
        ) : reports.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">
            Nenhuma aplicação do COPSOQ-BR registrada ainda. O instrumento é acionado quando a
            pessoa marca sobrecarga ou adoecimento ligado ao trabalho na triagem.
          </Card>
        ) : (
          reports.map((r) => <RelatorioEmpresa key={r.clinic_id} r={r} />)
        )}
      </div>
    </PainelShell>
  );
}

function RelatorioEmpresa({ r }: { r: OcupacionalReport }) {
  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-lg font-semibold">{r.clinic_name ?? "Consultório"}</h3>
          <p className="text-xs text-muted-foreground">
            {r.respondentes} respondente(s) · média geral {r.mediaGeral} pontos
          </p>
        </div>
        {r.suficiente ? (
          <Badge variant="secondary">Amostra válida</Badge>
        ) : (
          <Badge variant="outline">Amostra abaixo de {r.minN} — sem detalhamento</Badge>
        )}
      </div>

      {r.suficiente ? (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            {r.dominios.map((d) => (
              <div key={d.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{d.label}</span>
                  <span className="text-muted-foreground">{d.percentualExposto}% expostos</span>
                </div>
                <Progress className="mt-2 h-2" value={(d.media / 4) * 100} />
                <p className="mt-1 text-xs text-muted-foreground">Média {d.media} de 4</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {r.distribuicao.map((d) => (
              <Badge key={d.label} variant={d.level >= 3 ? "destructive" : "secondary"}>
                {d.label}: {d.quantidade} ({d.percentual}%)
              </Badge>
            ))}
          </div>

          {r.assedioPercentual > 0 ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
              {r.assedioPercentual}% dos respondentes relataram humilhação, assédio ou tratamento
              hostil no trabalho — item de notificação obrigatória no plano de ação da NR-01.
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          São necessários pelo menos {r.minN} respondentes para divulgar os domínios sem risco de
          identificação individual.
        </p>
      )}
    </Card>
  );
}
