import { createFileRoute } from "@tanstack/react-router";
import { PainelShell } from "@/components/painel/PainelShell";
import { Card } from "@/components/ui/card";
import {
  AGE_BAND_LABEL,
  BASELINE_BY_BAND,
  ESCALATION_RULES,
  ROUTING_RULES,
  SYMPTOM_QUESTION,
  type AgeBand,
} from "@/config/triage-tree";
import { SCALE_BY_CODE } from "@/lib/scales-data";

export const Route = createFileRoute("/_authenticated/protocolo")({
  head: () => ({
    meta: [
      { title: "Protocolo de triagem — árvore de decisão clínica" },
      {
        name: "description",
        content:
          "Como as escalas são escolhidas: faixa etária, sintomas da queixa inicial e regras de escalonamento por escore.",
      },
      { property: "og:title", content: "Protocolo de triagem — árvore de decisão" },
      {
        property: "og:description",
        content:
          "Regras completas de roteamento e escalonamento das escalas da pré-triagem.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProtocoloPage,
});

const BANDS: AgeBand[] = ["crianca", "adolescente", "adulto", "idoso"];

function scaleName(code: string) {
  return SCALE_BY_CODE[code]?.name ?? code;
}

function ScaleChip({ code }: { code: string }) {
  return (
    <span
      title={scaleName(code)}
      className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground"
    >
      {code}
    </span>
  );
}

function symptomLabel(id: string) {
  return SYMPTOM_QUESTION.options.find((o) => o.id === id)?.label ?? id;
}

function ProtocoloPage() {
  return (
    <PainelShell title="Protocolo de triagem">
      <div className="space-y-6">
        <Card className="border-border bg-card p-4 sm:p-6">
          <h2 className="font-serif text-lg font-semibold">Como a triagem decide</h2>
          <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">1. Idade.</strong> A data de
              nascimento define a faixa etária e quais instrumentos são válidos.
            </li>
            <li>
              <strong className="text-foreground">2. Queixa inicial.</strong> Os
              sintomas marcados pelo paciente abrem os rastreios breves
              correspondentes.
            </li>
            <li>
              <strong className="text-foreground">3. Rastreio geral.</strong> Em
              adultos e idosos o SRQ-20 é aplicado sempre, mesmo sem sintoma
              marcado.
            </li>
            <li>
              <strong className="text-foreground">4. Escalonamento.</strong> O
              escore de cada rastreio pode acrescentar escalas completas ao fluxo
              durante o preenchimento.
            </li>
            <li>
              <strong className="text-foreground">5. Via de risco.</strong>{" "}
              Qualquer item de ideação positivo ativa o ASQ e a orientação de
              emergência, e sinaliza a triagem no painel.
            </li>
          </ol>
          <p className="mt-3 text-xs text-muted-foreground">
            Em cada triagem, o caminho realmente percorrido aparece no detalhe da
            triagem, no bloco “Trilha de decisão”.
          </p>
        </Card>

        <Card className="border-border bg-card p-4 sm:p-6">
          <h2 className="font-serif text-lg font-semibold">Faixas etárias</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {BANDS.map((b) => (
              <div key={b} className="rounded-lg border border-border p-3">
                <div className="text-sm font-medium">{AGE_BAND_LABEL[b]}</div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  Rastreio geral:
                  {(BASELINE_BY_BAND[b] ?? []).length ? (
                    (BASELINE_BY_BAND[b] ?? []).map((c) => (
                      <ScaleChip key={c} code={c} />
                    ))
                  ) : (
                    <span>nenhum — depende da queixa</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-border bg-card p-4 sm:p-6">
          <h2 className="font-serif text-lg font-semibold">
            Sintoma da queixa × faixa etária
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            O que cada opção marcada pelo paciente aciona, por idade.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Sintoma</th>
                  {BANDS.map((b) => (
                    <th key={b} className="py-2 pr-3 font-medium">
                      {AGE_BAND_LABEL[b].split(" (")[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROUTING_RULES.map((rule) => (
                  <tr key={rule.symptom} className="border-b border-border/60 align-top">
                    <td className="py-3 pr-3">
                      <div className="font-medium">{symptomLabel(rule.symptom)}</div>
                      {rule.riskPathway && (
                        <div className="mt-1 text-xs font-medium text-destructive">
                          ativa via de risco
                        </div>
                      )}
                    </td>
                    {BANDS.map((b) => {
                      const scales = rule.byBand[b] ?? [];
                      const note = rule.noteByBand?.[b];
                      return (
                        <td key={b} className="py-3 pr-3">
                          {scales.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {scales.map((c) => (
                                <ScaleChip key={c} code={c} />
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {note ?? "—"}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="border-border bg-card p-4 sm:p-6">
          <h2 className="font-serif text-lg font-semibold">
            Escalonamento por resultado
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Regras aplicadas automaticamente assim que o paciente termina cada
            escala.
          </p>
          <ul className="mt-4 space-y-3">
            {ESCALATION_RULES.map((r, i) => (
              <li
                key={`${r.from}-${i}`}
                className="rounded-lg border border-border p-3"
              >
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <ScaleChip code={r.from} />
                  <span className="text-muted-foreground">→</span>
                  {r.add.length ? (
                    r.add.map((c) => <ScaleChip key={c} code={c} />)
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      nenhuma escala adicional
                    </span>
                  )}
                  {r.riskPathway && (
                    <span className="inline-flex items-center rounded-full border border-destructive/30 bg-destructive/12 px-2.5 py-0.5 text-xs font-medium text-destructive">
                      via de risco
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{r.reason}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="border-border bg-card p-4 sm:p-6">
          <h2 className="font-serif text-lg font-semibold">Escalas usadas</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {Object.values(SCALE_BY_CODE).map((s) => (
              <div
                key={s.code}
                className="rounded-lg border border-border p-3 text-sm"
              >
                <div className="font-medium">
                  {s.code} — {s.name}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {s.fullName}
                  {s.timeframe ? ` · ${s.timeframe}` : ""} · {s.items.length}{" "}
                  {s.items.length === 1 ? "item" : "itens"}
                </p>

              </div>
            ))}
          </div>
        </Card>
      </div>
    </PainelShell>
  );
}
