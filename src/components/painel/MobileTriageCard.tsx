import { Link } from "@tanstack/react-router";
import { Check, FileDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { BandBadge } from "@/components/painel/PainelShell";
import { FadeIn } from "@/components/motion/primitives";

export type TriageCardItem = {
  id: string;
  respondent_name: string;
  respondent_age: number | null;
  submitted_at: string;
  clinic_name: string | null;
  respondent_type: "paciente" | "familiar";
  informant_name: string | null;
  informant_relation: string | null;
  doctor_name: string | null;
  risk_flags: string[];
  summary: { risk_pathway?: boolean } | null;
  scales: {
    scale_code: string;
    score: number | null;
    band: string | null;
    band_level: number | null;
  }[];
};

function tempoRelativo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ontem";
  if (d < 7) return `há ${d} dias`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

/**
 * Cartão de leitura rápida da fila de triagem (modo "cartões").
 * Pensado para escaneamento no celular: faixa lateral de gravidade,
 * nome + tempo relativo, até 3 escalas e ações compactas.
 * O toque no corpo do cartão abre o detalhe da triagem.
 */
export function MobileTriageCard({
  a,
  multiClinica,
  feito,
  selecionado,
  pdfBusy,
  onOpen,
  onToggleSelecao,
  onToggleRevisado,
  onPdf,
}: {
  a: TriageCardItem;
  multiClinica: boolean;
  feito: boolean;
  selecionado: boolean;
  pdfBusy: string | null;
  onOpen: () => void;
  onToggleSelecao: () => void;
  onToggleRevisado: () => void;
  onPdf: (tipo: "paciente" | "clinico") => void;
}) {
  const risco = a.risk_flags.length > 0 || a.summary?.risk_pathway === true;
  const atencao = !risco && a.scales.some((s) => (s.band_level ?? 0) >= 2);
  const faixa = risco
    ? "border-l-destructive"
    : atencao
      ? "border-l-warning"
      : "border-l-border";
  const extras = a.scales.length - 3;

  return (
    <FadeIn>
      <Card
        className={`border-l-4 p-4 ${faixa} ${
          risco ? "bg-destructive/5" : ""
        } ${feito ? "opacity-60" : ""}`}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <Link
            to="/painel/$id"
            params={{ id: a.id }}
            onClick={onOpen}
            className="block min-w-0 hover:opacity-80"
          >
            <div className="min-w-0">
              <div className="truncate font-medium text-foreground">
                {a.respondent_name}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {a.respondent_age != null ? `${a.respondent_age} anos · ` : ""}
                {tempoRelativo(a.submitted_at)}
                {multiClinica && a.clinic_name ? ` · ${a.clinic_name}` : ""}
              </div>
              <div className="mt-1 truncate text-xs text-muted-foreground">
                {a.respondent_type === "familiar"
                  ? `Familiar/responsável${a.informant_name ? ` — ${a.informant_name}` : ""}`
                  : "Próprio paciente"}
                {a.doctor_name ? ` · → ${a.doctor_name}` : ""}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {a.scales.length === 0 && (
                <span className="text-xs text-muted-foreground">
                  Sem escalas aplicadas
                </span>
              )}
              {a.scales.slice(0, 3).map((s) => (
                <BandBadge
                  key={s.scale_code}
                  level={s.band_level ?? 0}
                  label={`${s.scale_code}: ${s.score ?? "—"}`}
                />
              ))}
              {extras > 0 && (
                <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                  +{extras}
                </span>
              )}
            </div>
          </Link>
          {risco && (
            <span className="shrink-0 rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-0.5 text-[11px] font-semibold text-destructive">
              Via de risco
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-3">
          <input
            type="checkbox"
            aria-label={`Selecionar triagem de ${a.respondent_name}`}
            checked={selecionado}
            onChange={onToggleSelecao}
            className="h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
          />
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={onToggleRevisado}
              aria-label={feito ? "Desmarcar revisão" : "Marcar como revisada"}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium ${
                feito
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Check className="h-4 w-4" />
              {feito ? "Revisado" : "Revisar"}
            </button>
            <button
              type="button"
              disabled={pdfBusy === `${a.id}:paciente`}
              onClick={() => onPdf("paciente")}
              aria-label="Baixar PDF do paciente"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <FileDown className="h-4 w-4" />
              {pdfBusy === `${a.id}:paciente` ? "Gerando…" : "PDF paciente"}
            </button>
            <button
              type="button"
              disabled={pdfBusy === `${a.id}:clinico`}
              onClick={() => onPdf("clinico")}
              aria-label="Baixar PDF clínico"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <FileDown className="h-4 w-4" />
              {pdfBusy === `${a.id}:clinico` ? "Gerando…" : "PDF clínico"}
            </button>
          </div>
        </div>
      </Card>
    </FadeIn>
  );
}
