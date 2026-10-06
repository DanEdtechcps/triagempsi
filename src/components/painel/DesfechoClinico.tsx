import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAssessmentOutcome, saveAssessmentOutcome } from "@/lib/research.functions";
import { normalizeIcd10 } from "@/lib/outcome-metrics";

const CONCORDANCE = [
  { value: "concorda", label: "Concordo com a classificação" },
  { value: "concorda_parcialmente", label: "Concordo em parte" },
  { value: "nao_concorda", label: "Não concordo" },
] as const;

const RISK = [
  { value: "risco_confirmado", label: "Risco confirmado na consulta" },
  { value: "risco_nao_confirmado", label: "Risco não confirmado" },
  { value: "nao_avaliado", label: "Não avaliado" },
] as const;

type Concordance = (typeof CONCORDANCE)[number]["value"];
type RiskAssessment = (typeof RISK)[number]["value"];

/**
 * Desfecho clínico (1 clique): a impressão do psiquiatra depois da consulta.
 * É o dado que permite medir a acurácia real da pré-triagem (sensibilidade,
 * especificidade, VPP e VPN). Sem texto livre: só opções e códigos CID-10.
 */
export function DesfechoClinico({ assessmentId }: { assessmentId: string }) {
  const qc = useQueryClient();
  const load = useServerFn(getAssessmentOutcome);
  const save = useServerFn(saveAssessmentOutcome);
  const { data: outcome, isLoading } = useQuery({
    queryKey: ["assessment-outcome", assessmentId],
    queryFn: () => load({ data: { assessment_id: assessmentId } }),
  });

  const [concordance, setConcordance] = useState<Concordance | null>(null);
  const [risk, setRisk] = useState<RiskAssessment>("nao_avaliado");
  const [dx, setDx] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (outcome) {
      setConcordance(outcome.concordance);
      setRisk(outcome.risk_assessment);
      setDx(outcome.final_dx_icd10.join(", "));
    }
  }, [outcome]);

  async function onSave() {
    if (!concordance) return;
    setBusy(true);
    setMsg(null);
    try {
      await save({
        data: {
          assessment_id: assessmentId,
          concordance,
          risk_assessment: risk,
          final_dx_icd10: normalizeIcd10(dx.split(/[,\s;]+/)),
        },
      });
      await qc.invalidateQueries({ queryKey: ["assessment-outcome", assessmentId] });
      setMsg({ ok: true, text: "Desfecho registrado. Obrigado: ele melhora a precisão da pré-triagem." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Não foi possível salvar." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5" data-testid="desfecho-clinico">
      <h2 className="text-sm font-semibold">Desfecho clínico (após a consulta)</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Registre em 1 clique se a pré-triagem refletiu o que você encontrou. Não escreva dados do
        paciente aqui: apenas as opções e, se quiser, o CID-10 final. Isso alimenta o relatório de
        acurácia do sistema.
      </p>

      {isLoading ? (
        <p className="mt-3 text-xs text-muted-foreground">Carregando…</p>
      ) : (
        <>
          <fieldset className="mt-3">
            <legend className="text-xs font-medium">A classificação da pré-triagem…</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {CONCORDANCE.map((o) => (
                <Button
                  key={o.value}
                  type="button"
                  size="sm"
                  variant={concordance === o.value ? "default" : "outline"}
                  aria-pressed={concordance === o.value}
                  onClick={() => setConcordance(o.value)}
                >
                  {o.label}
                </Button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-3">
            <legend className="text-xs font-medium">Risco de suicídio/autolesão na consulta</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {RISK.map((o) => (
                <Button
                  key={o.value}
                  type="button"
                  size="sm"
                  variant={risk === o.value ? "default" : "outline"}
                  aria-pressed={risk === o.value}
                  onClick={() => setRisk(o.value)}
                >
                  {o.label}
                </Button>
              ))}
            </div>
          </fieldset>

          <div className="mt-3">
            <label htmlFor="dx" className="text-xs font-medium">
              Diagnóstico(s) final(is) CID-10 (opcional, até 5, separados por vírgula)
            </label>
            <Input
              id="dx"
              value={dx}
              onChange={(e) => setDx(e.target.value)}
              placeholder="F32.1, F41.1"
              className="mt-1 max-w-sm"
              maxLength={60}
            />
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Button size="sm" onClick={onSave} disabled={!concordance || busy}>
              {outcome ? "Atualizar desfecho" : "Registrar desfecho"}
            </Button>
            {msg && (
              <span className={`text-xs ${msg.ok ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"}`}>
                {msg.text}
              </span>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
