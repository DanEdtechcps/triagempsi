import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";

export type InformanteMetricItem = {
  respondent_type: "paciente" | "familiar";
  submitted_at: string;
  created_at: string;
};

type Agrupamento = "mes" | "semana" | "dia";

function chaveMes(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function chaveSemana(d: Date) {
  const base = new Date(d);
  const dia = (base.getDay() + 6) % 7; // segunda = 0
  base.setDate(base.getDate() - dia);
  return base.toLocaleDateString("sv-SE");
}

function rotulo(chave: string, agrupamento: Agrupamento) {
  if (agrupamento === "mes") {
    const [ano, mes] = chave.split("-");
    const d = new Date(Number(ano), Number(mes) - 1, 1);
    return d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
  }
  const d = new Date(`${chave}T00:00:00`);
  const texto = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return agrupamento === "semana" ? `Semana de ${texto}` : texto;
}

export function InformanteMetrics({
  itens,
  campoData,
}: {
  itens: InformanteMetricItem[];
  campoData: "submitted" | "created";
}) {
  const [agrupamento, setAgrupamento] = useState<Agrupamento>("mes");

  const { total, paciente, familiar, periodos } = useMemo(() => {
    const mapa = new Map<string, { paciente: number; familiar: number }>();
    let paciente = 0;
    let familiar = 0;

    for (const item of itens) {
      const bruto = campoData === "created" ? item.created_at : item.submitted_at;
      const d = new Date(bruto);
      if (Number.isNaN(d.getTime())) continue;
      const chave =
        agrupamento === "mes"
          ? chaveMes(d)
          : agrupamento === "semana"
            ? chaveSemana(d)
            : d.toLocaleDateString("sv-SE");

      const atual = mapa.get(chave) ?? { paciente: 0, familiar: 0 };
      if (item.respondent_type === "familiar") {
        atual.familiar += 1;
        familiar += 1;
      } else {
        atual.paciente += 1;
        paciente += 1;
      }
      mapa.set(chave, atual);
    }

    const periodos = Array.from(mapa.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 6)
      .map(([chave, v]) => ({
        chave,
        ...v,
        total: v.paciente + v.familiar,
      }));

    return { total: paciente + familiar, paciente, familiar, periodos };
  }, [itens, campoData, agrupamento]);

  const pct = (n: number, base: number) =>
    base === 0 ? 0 : Math.round((n / base) * 100);

  return (
    <Card className="mb-4 space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-serif text-base font-semibold text-foreground">
            Quem respondeu as triagens
          </h2>
          <p className="text-xs text-muted-foreground">
            Proporção entre o próprio paciente e familiar/responsável, conforme os
            filtros aplicados (data de {campoData === "created" ? "criação" : "envio"}).
          </p>
        </div>
        <select
          aria-label="Agrupar métricas por período"
          className="min-h-10 rounded-md border border-border bg-card px-3 text-sm text-foreground"
          value={agrupamento}
          onChange={(e) => setAgrupamento(e.target.value as Agrupamento)}
        >
          <option value="mes">Por mês</option>
          <option value="semana">Por semana</option>
          <option value="dia">Por dia</option>
        </select>
      </div>

      {total === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma triagem no período selecionado.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-border p-3">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="font-serif text-2xl text-foreground">{total}</div>
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="text-xs text-muted-foreground">Paciente</div>
              <div className="font-serif text-2xl text-foreground">
                {pct(paciente, total)}%
              </div>
              <div className="text-xs text-muted-foreground">
                {paciente} triagem(ns)
              </div>
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="text-xs text-muted-foreground">
                Familiar/responsável
              </div>
              <div className="font-serif text-2xl text-foreground">
                {pct(familiar, total)}%
              </div>
              <div className="text-xs text-muted-foreground">
                {familiar} triagem(ns)
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {periodos.map((p) => (
              <div key={p.chave} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="capitalize">{rotulo(p.chave, agrupamento)}</span>
                  <span>
                    {pct(p.paciente, p.total)}% paciente ·{" "}
                    {pct(p.familiar, p.total)}% familiar · {p.total}
                  </span>
                </div>
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="bg-primary"
                    style={{ width: `${pct(p.paciente, p.total)}%` }}
                  />
                  <div
                    className="bg-accent"
                    style={{ width: `${pct(p.familiar, p.total)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" /> Paciente
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-accent" />{" "}
              Familiar/responsável
            </span>
          </div>
        </>
      )}
    </Card>
  );
}
