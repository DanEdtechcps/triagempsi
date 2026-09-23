import { createFileRoute } from "@tanstack/react-router";
import { PainelShell } from "@/components/painel/PainelShell";
import { Card } from "@/components/ui/card";
import { ESCALATION_RULES, ROUTING_RULES, SYMPTOM_QUESTION } from "@/config/triage-tree";
import {
  LIMITATIONS,
  METHODOLOGY_NOTE,
  EVIDENCE_BY_CODE,
  RESEARCH_PROPOSALS,
  SPECIALTY_FLOWS,
} from "@/config/scale-evidence";
import { ALL_SCALES, SCALE_BY_CODE } from "@/lib/scales-data";

export const Route = createFileRoute("/_authenticated/referencias")({
  head: () => ({
    meta: [
      { title: "Guia clínico e evidências das escalas — pré-triagem" },
      {
        name: "description",
        content:
          "Bases científicas, pontos de corte, sensibilidade e especificidade de cada escala da pré-triagem, com fluxos por especialidade e referências completas.",
      },
      { property: "og:title", content: "Guia clínico e evidências — pré-triagem" },
      {
        property: "og:description",
        content:
          "Referências de validação e regras de encaminhamento de todos os instrumentos do protocolo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReferenciasPage,
});

function ScaleChip({ code }: { code: string }) {
  const scale = SCALE_BY_CODE[code];
  return (
    <span
      title={scale?.fullName ?? code}
      className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground"
    >
      {code}
    </span>
  );
}

function ReferenciasPage() {
  const activeScales = ALL_SCALES.filter((s) => s.status !== "estrutura");
  const pendingScales = ALL_SCALES.filter((s) => s.status === "estrutura");
  const conditions = new Set(
    activeScales.map((s) => EVIDENCE_BY_CODE[s.code]?.condition).filter(Boolean),
  );

  const stats = [
    { value: activeScales.length, label: "escalas ativas" },
    { value: pendingScales.length, label: "em curadoria" },
    { value: conditions.size, label: "condições cobertas" },
    { value: SYMPTOM_QUESTION.options.length, label: "portas de entrada" },
    { value: ROUTING_RULES.length, label: "regras de encaminhamento" },
    { value: ESCALATION_RULES.length, label: "regras de escalonamento" },
  ];

  return (
    <PainelShell title="Guia clínico e evidências">
      <div className="space-y-6">
        {/* Visão geral */}
        <Card className="border-border bg-card p-4 sm:p-6">
          <h2 className="font-serif text-lg font-semibold">O que a pré-triagem cobre</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Números derivados diretamente do protocolo vigente — esta página se atualiza sozinha a
            cada nova escala ou regra.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-border bg-background p-3 text-center"
              >
                <p className="font-serif text-2xl font-semibold text-foreground">{s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Tabela de acuidade */}
        <Card className="border-border bg-card p-4 sm:p-6">
          <h2 className="font-serif text-lg font-semibold">
            Acuidade por instrumento (escalas ativas)
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sensibilidade = capacidade de não perder casos; especificidade = capacidade de não gerar
            falso positivo. Rastreio positivo{" "}
            <strong className="text-foreground">não é diagnóstico</strong> — exige avaliação
            clínica.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Escala</th>
                  <th className="py-2 pr-3 font-medium">Condição (CID-10)</th>
                  <th className="py-2 pr-3 font-medium">Corte</th>
                  <th className="py-2 pr-3 font-medium">Sens. / Espec.</th>
                  <th className="py-2 font-medium">Referências</th>
                </tr>
              </thead>
              <tbody>
                {activeScales.map((scale) => {
                  const ev = EVIDENCE_BY_CODE[scale.code];
                  return (
                    <tr
                      key={scale.code}
                      className="border-b border-border/60 align-top last:border-0"
                    >
                      <td className="py-3 pr-3">
                        <ScaleChip code={scale.code} />
                      </td>
                      <td className="py-3 pr-3 text-foreground">
                        {ev?.condition}
                        {ev?.icd10 && (
                          <span className="block text-xs text-muted-foreground">{ev.icd10}</span>
                        )}
                      </td>
                      <td className="py-3 pr-3 text-muted-foreground">{ev?.cutoff}</td>
                      <td className="py-3 pr-3 text-muted-foreground">
                        {ev?.sensitivity || ev?.specificity
                          ? `${ev.sensitivity ?? "—"} / ${ev.specificity ?? "—"}`
                          : "—"}
                      </td>
                      <td className="py-3 text-xs leading-relaxed text-muted-foreground">
                        <p>{ev?.reference}</p>
                        {ev?.validationBr && (
                          <p className="mt-1">
                            <strong className="text-foreground">Brasil:</strong> {ev.validationBr}
                          </p>
                        )}
                        {ev?.note && <p className="mt-1 italic">{ev.note}</p>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pendingScales.length > 0 && (
            <p className="mt-4 rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <strong className="text-foreground">Em curadoria (não aplicadas):</strong>{" "}
              {pendingScales.map((s) => s.code).join(" · ")} — estrutura pronta, aguardando revisão
              da equipe clínica antes de entrar no fluxo.
            </p>
          )}
        </Card>

        {/* Fluxos por especialidade */}
        <Card className="border-border bg-card p-4 sm:p-6">
          <h2 className="font-serif text-lg font-semibold">Fluxos mais comuns por especialidade</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Cenários reais de encaminhamento gerados pelas regras do protocolo.
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {SPECIALTY_FLOWS.map((flow) => (
              <div
                key={flow.specialty}
                className="rounded-xl border border-border bg-background p-4"
              >
                <h3 className="text-sm font-semibold text-foreground">{flow.specialty}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{flow.scenario}</p>
                <ol className="mt-3 space-y-2">
                  {flow.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                        {i + 1}
                      </span>
                      <span className="text-muted-foreground">
                        {step.code && (
                          <>
                            <ScaleChip code={step.code} />{" "}
                          </>
                        )}
                        {step.text}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </Card>

        {/* Limitações */}
        <Card className="border-border bg-card p-4 sm:p-6">
          <h2 className="font-serif text-lg font-semibold">Limitações e governança clínica</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {LIMITATIONS.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </Card>

        {/* Pesquisa */}
        <Card className="border-border bg-card p-4 sm:p-6">
          <h2 className="font-serif text-lg font-semibold">
            Próximos passos para dados de pesquisa
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Melhorias propostas para elevar a qualidade dos dados brutos — todas compatíveis com a
            LGPD e com as resoluções do CNS.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {RESEARCH_PROPOSALS.map((p) => (
              <div key={p.title} className="rounded-xl border border-border bg-background p-4">
                <h3 className="text-sm font-semibold text-foreground">{p.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{p.detail}</p>
              </div>
            ))}
          </div>
        </Card>

        <p className="rounded-lg border border-border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
          <strong className="text-foreground">Nota metodológica:</strong> {METHODOLOGY_NOTE}
        </p>
      </div>
    </PainelShell>
  );
}
