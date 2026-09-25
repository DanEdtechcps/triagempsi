import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BandBadge } from "@/components/painel/PainelShell";
import type { AssessmentListItem } from "@/lib/painel.functions";

type PainelTabelaFilaProps = {
  itens: AssessmentListItem[];
  prefersReduced: boolean | null;
  multiClinica: boolean;
  selecionados: string[];
  todosSelecionados: boolean;
  revisados: string[];
  pdfBusy: string | null;
  onToggleTodos: () => void;
  onToggleSelecao: (id: string) => void;
  onToggleRevisado: (id: string) => void;
  onAbrir: (id: string) => void;
  onBaixarPdf: (id: string, tipo: "paciente" | "clinico") => void;
};

/** Tabela desktop da fila de revisão do painel clínico. */
export function PainelTabelaFila({
  itens,
  prefersReduced,
  multiClinica,
  selecionados,
  todosSelecionados,
  revisados,
  pdfBusy,
  onToggleTodos,
  onToggleSelecao,
  onToggleRevisado,
  onAbrir,
  onBaixarPdf,
}: PainelTabelaFilaProps) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[52rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">
                <input
                  type="checkbox"
                  aria-label="Selecionar todas as triagens desta página"
                  checked={todosSelecionados}
                  onChange={onToggleTodos}
                  className="h-4 w-4 accent-[hsl(var(--primary))]"
                />
              </th>
              <th className="px-3 py-2 font-medium">Paciente</th>
              <th className="px-3 py-2 font-medium">Envio</th>
              <th className="px-3 py-2 font-medium">Quem preencheu</th>
              <th className="px-3 py-2 font-medium">Escalas e escores</th>
              <th className="px-3 py-2 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <motion.tbody
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: prefersReduced ? 0 : 0.02 } },
            }}
          >
            {itens.map((a) => {
              const risco = a.risk_flags.length > 0 || a.summary?.risk_pathway;
              const atencao = a.scales.some((s) => (s.band_level ?? 0) >= 2);
              const feito = revisados.includes(a.id);
              return (
                <motion.tr
                  key={a.id}
                  variants={{
                    hidden: { opacity: 0, y: prefersReduced ? 0 : 4 },
                    show: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: prefersReduced ? 0.12 : 0.22 },
                    },
                  }}
                  className={`border-b border-border align-top last:border-0 ${
                    risco ? "bg-destructive/5" : feito ? "opacity-60" : ""
                  }`}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Selecionar triagem de ${a.respondent_name}`}
                      checked={selecionados.includes(a.id)}
                      onChange={() => onToggleSelecao(a.id)}
                      className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-start gap-2">
                      <span
                        aria-hidden
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          risco
                            ? "bg-destructive"
                            : atencao
                              ? "bg-warning"
                              : "bg-muted-foreground/40"
                        }`}
                      />
                      <div className="min-w-0">
                        <Link
                          to="/painel/$id"
                          params={{ id: a.id }}
                          onClick={() => onAbrir(a.id)}
                          className="block truncate font-medium text-foreground hover:underline"
                        >
                          {a.respondent_name}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {a.respondent_age != null
                            ? `${a.respondent_age} anos`
                            : "idade não informada"}
                          {multiClinica && a.clinic_name ? ` · ${a.clinic_name}` : ""}
                        </div>
                        <span className="mt-1 flex flex-wrap gap-1">
                          {risco && (
                            <span className="inline-flex rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                              Via de risco
                            </span>
                          )}
                          {a.doctor_name && (
                            <span className="inline-flex rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                              → {a.doctor_name}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
                    {new Date(a.submitted_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {a.respondent_type === "familiar"
                      ? `Familiar/responsável${
                          a.informant_name ? ` — ${a.informant_name}` : ""
                        }${a.informant_relation ? ` (${a.informant_relation})` : ""}`
                      : "O próprio paciente"}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {a.scales.length === 0 && (
                        <span className="text-xs text-muted-foreground">
                          Sem escalas aplicadas
                        </span>
                      )}
                      {a.scales.map((s) => (
                        <BandBadge
                          key={s.scale_code}
                          level={s.band_level ?? 0}
                          label={`${s.scale_code}: ${s.score ?? "—"}${
                            s.band ? ` · ${s.band}` : ""
                          }`}
                        />
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        variant={feito ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => onToggleRevisado(a.id)}
                      >
                        {feito ? "Revisado ✓" : "Revisado"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pdfBusy === `${a.id}:clinico`}
                        onClick={() => onBaixarPdf(a.id, "clinico")}
                      >
                        {pdfBusy === `${a.id}:clinico` ? "Gerando…" : "PDF"}
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </motion.tbody>
        </table>
      </div>
    </Card>
  );
}
