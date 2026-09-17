import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PainelShell, BandBadge } from "@/components/painel/PainelShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AGE_BAND_LABEL,
  ESCALATION_RULES,
  SYMPTOM_QUESTION,
  buildTriagePlan,
  ageBand,
  type AgeBand,
} from "@/config/triage-tree";
import { SCALE_BY_CODE } from "@/lib/scales-data";

export const Route = createFileRoute("/_authenticated/interpretar")({
  head: () => ({
    meta: [
      { title: "Como interpretar — leitura dos escores da pré-triagem" },
      {
        name: "description",
        content:
          "Simule cenários de idade e queixa, veja quais escalas são aplicadas, quando o escalonamento acontece e como ler cada faixa de escore.",
      },
      { property: "og:title", content: "Como interpretar a pré-triagem" },
      {
        property: "og:description",
        content:
          "Cenários de aplicação, gatilhos de escalonamento e faixas de escore de cada escala.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InterpretarPage,
});

const BAND_AGE: Record<AgeBand, number> = {
  crianca: 9,
  adolescente: 15,
  adulto: 34,
  idoso: 68,
};

const BANDS: AgeBand[] = ["crianca", "adolescente", "adulto", "idoso"];

function InterpretarPage() {
  const [band, setBand] = useState<AgeBand>("adulto");
  const [symptoms, setSymptoms] = useState<string[]>(["tristeza"]);

  const age = BAND_AGE[band];
  const plan = useMemo(() => buildTriagePlan(symptoms, age), [symptoms, age]);

  const escalations = useMemo(
    () => ESCALATION_RULES.filter((r) => plan.flow.includes(r.from)),
    [plan.flow],
  );

  function toggle(id: string) {
    setSymptoms((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  return (
    <PainelShell title="Como interpretar">
      <div className="space-y-6">
        <Card className="border-border bg-card p-4 sm:p-6">
          <h2 className="font-serif text-lg font-semibold">
            Simule um cenário
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha a faixa etária e as queixas marcadas pelo paciente para ver
            exatamente quais escalas ele responderia — e o que pode entrar depois
            por escalonamento.
          </p>

          <div className="mt-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Faixa etária
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {BANDS.map((b) => (
                <Button
                  key={b}
                  type="button"
                  size="sm"
                  variant={b === band ? "default" : "outline"}
                  onClick={() => setBand(b)}
                >
                  {AGE_BAND_LABEL[b].split(" (")[0]}
                </Button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Idade de referência usada no cálculo: {age} anos (
              {AGE_BAND_LABEL[ageBand(age)]}).
            </p>
          </div>

          <div className="mt-5">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Queixas marcadas
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {SYMPTOM_QUESTION.options.map((o) => {
                const on = symptoms.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => toggle(o.id)}
                    className={`min-h-11 rounded-full border px-3 py-2 text-left text-xs font-medium transition-colors ${
                      on
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
            {symptoms.length === 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Nenhuma queixa marcada — só o rastreio geral da faixa etária é
                aplicado.
              </p>
            )}
          </div>
        </Card>

        <Card className="border-border bg-card p-4 sm:p-6">
          <h2 className="font-serif text-lg font-semibold">
            O que o paciente responderia
          </h2>
          {plan.riskPathway && (
            <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              Via de risco ativada: o ASQ entra no fluxo e a orientação de
              emergência é exibida ao paciente ao final.
            </div>
          )}
          {plan.flow.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhuma escala aplicável neste cenário — a avaliação segue na
              consulta.
            </p>
          ) : (
            <ol className="mt-3 space-y-2">
              {plan.flow.map((code, i) => {
                const s = SCALE_BY_CODE[code];
                const reason = plan.decisions.find((d) => d.step === code)?.reason;
                return (
                  <li
                    key={code}
                    className="rounded-lg border border-border p-3 text-sm"
                  >
                    <div className="font-medium">
                      {i + 1}. {code} — {s?.name ?? ""}
                    </div>
                    {reason && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {reason}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          {plan.indicated.length > 0 && (
            <div className="mt-5">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Indicado ao profissional (não aplicado online)
              </div>
              <ul className="mt-2 space-y-2">
                {plan.indicated.map((ind) => (
                  <li
                    key={`${ind.code}-${ind.reason}`}
                    className="rounded-lg border border-dashed border-border p-3 text-sm"
                  >
                    <div className="font-medium">{ind.code}</div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {ind.reason}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card className="border-border bg-card p-4 sm:p-6">
          <h2 className="font-serif text-lg font-semibold">
            Quando o escalonamento acontece neste cenário
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Gatilhos que podem disparar durante o preenchimento, a partir das
            escalas acima.
          </p>
          {escalations.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhuma regra de escalonamento se aplica às escalas deste cenário.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {escalations.map((r, i) => (
                <li
                  key={`${r.from}-${i}`}
                  className="rounded-lg border border-border p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium">
                      {r.from}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    {r.add.length ? (
                      r.add.map((c) => (
                        <span
                          key={c}
                          className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium"
                        >
                          {c}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        nenhuma escala adicional
                      </span>
                    )}
                    {r.riskPathway && (
                      <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
                        via de risco
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{r.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="border-border bg-card p-4 sm:p-6">
          <h2 className="font-serif text-lg font-semibold">
            Como ler os escores das escalas deste cenário
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Faixas de gravidade de cada instrumento aplicado.
          </p>
          <div className="mt-4 space-y-4">
            {plan.flow.map((code) => {
              const s = SCALE_BY_CODE[code];
              if (!s) return null;
              return (
                <div key={code} className="rounded-lg border border-border p-3">
                  <div className="text-sm font-medium">
                    {s.code} — {s.fullName}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {s.items.length} {s.items.length === 1 ? "item" : "itens"}
                    {s.timeframe ? ` · ${s.timeframe}` : ""}
                    {s.riskItems?.length
                      ? ` · itens de risco: ${s.riskItems.join(", ")}`
                      : ""}
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {s.bands.map((b) => (
                      <li
                        key={b.label}
                        className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 text-sm"
                      >
                        <span className="w-20 shrink-0 tabular-nums text-muted-foreground">
                          {b.min}–{b.max}
                        </span>
                        <BandBadge level={b.level} label={b.label} />
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </PainelShell>
  );
}
