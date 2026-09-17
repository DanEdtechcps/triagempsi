import {
  buildDecisionSummary,
  symptomLabel,
  type Decision,
  type DecisionRowData as Row,
  type IndicatedScale,
  type ScaleSnapshot,
} from "@/lib/decision-narrative";

export type { Decision, IndicatedScale, ScaleSnapshot };
export { symptomLabel };
export { buildDecisionRows } from "@/lib/decision-narrative";

export function DecisionTrail({
  symptoms,
  decisions,
  indicated,
  results,
  ageBand,
  age,
  riskPathway,
}: {
  symptoms: string[];
  decisions: Decision[];
  indicated: IndicatedScale[];
  results: ScaleSnapshot[];
  ageBand?: string | null;
  age?: number | null;
  riskPathway?: boolean;
}) {
  const { ageLabel, rows, entradas, escalonamentos, narrative } = buildDecisionSummary({
    decisions,
    results,
    symptoms,
    indicated,
    ageBand,
    age,
    riskPathway,
  });


  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-background p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Em resumo (linguagem clara)
        </h3>
        <div className="mt-2 space-y-2 text-sm leading-relaxed text-foreground/90">
          {narrative.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          1. Características do paciente
        </h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {ageLabel && (
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              Idade: {ageLabel}
            </span>
          )}
          {symptoms.length === 0 && (
            <span className="text-sm text-muted-foreground">
              Nenhum sintoma marcado na triagem inicial.
            </span>
          )}
          {symptoms.map((s) => (
            <span
              key={s}
              className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
            >
              {symptomLabel(s)}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          2. Escalas abertas pela idade e pelos sintomas
        </h3>
        {entradas.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhuma escala foi aberta automaticamente nesta faixa etária.
          </p>
        ) : (
          <ol className="mt-2 space-y-2">
            {entradas.map((r, i) => (
              <DecisionRow key={`e-${i}`} index={i + 1} row={r} />
            ))}
          </ol>
        )}
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          3. Escalonamentos disparados pelos resultados
        </h3>
        {escalonamentos.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhum resultado atingiu ponto de corte para aprofundamento.
          </p>
        ) : (
          <ol className="mt-2 space-y-2">
            {escalonamentos.map((r, i) => (
              <DecisionRow key={`s-${i}`} index={i + 1} row={r} />
            ))}
          </ol>
        )}
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          4. Encaminhamento final
        </h3>
        <ul className="mt-2 space-y-2 text-sm">
          <li
            className={`rounded-md border p-3 ${
              riskPathway
                ? "border-destructive/50 bg-destructive/5 text-destructive"
                : "border-border bg-muted/40 text-foreground/80"
            }`}
          >
            {riskPathway
              ? "Via de risco ativada — orientação de emergência exibida ao paciente e prioridade de agendamento."
              : "Sem critérios de risco imediato — seguir fluxo padrão de agendamento."}
          </li>
          {indicated.length > 0 && (
            <li className="rounded-md border border-border bg-muted/40 p-3">
              <div className="font-medium text-foreground">
                Escalas indicadas, não aplicadas online
              </div>
              <ul className="mt-1 space-y-1 text-foreground/80">
                {indicated.map((i) => (
                  <li key={`${i.code}-${i.reason}`}>
                    • <strong>{i.code}</strong> — {i.reason}
                  </li>
                ))}
              </ul>
            </li>
          )}
        </ul>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          5. Trilha completa, passo a passo
        </h3>
        {rows.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhuma decisão registrada para esta triagem.
          </p>
        ) : (
          <ol className="mt-2 space-y-2">
            {rows.map((r, i) => (
              <li
                key={`t-${i}`}
                className={`rounded-md border p-3 text-sm ${
                  r.risk
                    ? "border-destructive/40 bg-destructive/5"
                    : "border-border bg-muted/40"
                }`}
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Passo {i + 1}
                  </span>
                  <span className="rounded bg-background px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                    {r.kind === "entrada" ? "Entrada" : "Escalonamento"}
                  </span>
                  {r.risk && (
                    <span className="rounded bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                      Sinal de risco
                    </span>
                  )}
                </div>
                <p className="mt-1 leading-relaxed text-foreground/90">{r.plain}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}





function DecisionRow({ index, row }: { index: number; row: Row }) {
  return (
    <li
      className={`rounded-md border p-3 text-sm ${
        row.risk ? "border-destructive/40 bg-destructive/5" : "border-border bg-muted/40"
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-xs font-semibold text-muted-foreground">{index}.</span>
        <strong className="text-foreground">{row.trigger}</strong>
        {row.criterion && (
          <span className="rounded bg-background px-2 py-0.5 text-xs text-muted-foreground">
            {row.criterion}
          </span>
        )}
      </div>
      <p className="mt-1 leading-relaxed text-foreground/90">{row.plain}</p>
      <p className="mt-1 text-xs text-muted-foreground">Regra técnica: {row.rule}</p>

    </li>
  );
}
