import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PainelShell } from "@/components/painel/PainelShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  exportResearchDataset,
  getAccuracyReport,
  listResearchSettings,
  saveResearchSettings,
  type ResearchSettings,
} from "@/lib/research.functions";
import { formatProportion } from "@/lib/outcome-metrics";
import { CAAE_RE } from "@/lib/research";

export const Route = createFileRoute("/_authenticated/pesquisa")({
  head: () => ({
    meta: [
      { title: "Pesquisa — dados e acurácia" },
      { name: "description", content: "Configuração da pesquisa, exportação anonimizada e acurácia da pré-triagem." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PesquisaPage,
});

function download(name: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob(["﻿" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function PesquisaPage() {
  const fetchAccuracy = useServerFn(getAccuracyReport);
  const fetchSettings = useServerFn(listResearchSettings);
  const accuracy = useQuery({ queryKey: ["accuracy"], queryFn: () => fetchAccuracy({ data: {} }) });
  const settings = useQuery({ queryKey: ["research-settings"], queryFn: () => fetchSettings(), retry: false });

  const a = accuracy.data;
  return (
    <PainelShell title="Pesquisa">
      <div className="space-y-5">
        <Card className="p-4 sm:p-5" data-testid="accuracy-panel">
          <h2 className="font-serif text-lg font-semibold">Acurácia da pré-triagem (via de risco)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Calculada a partir do <strong>desfecho clínico</strong> registrado pelos psiquiatras após a
            consulta. Teste positivo = a triagem acionou a via de risco; referência = risco confirmado
            na consulta. Só entram desfechos com risco avaliado (isso gera viés de verificação).
          </p>
          {accuracy.isLoading && <p className="mt-3 text-sm text-muted-foreground">Calculando…</p>}
          {accuracy.isError && (
            <p className="mt-3 text-sm text-destructive">
              Não foi possível calcular (a migração de pesquisa já foi aplicada no banco?).
            </p>
          )}
          {a && (
            <>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["Sensibilidade", a.sensitivity],
                    ["Especificidade", a.specificity],
                    ["Valor preditivo positivo (VPP)", a.ppv],
                    ["Valor preditivo negativo (VPN)", a.npv],
                  ] as const
                ).map(([label, p]) => (
                  <div key={label} className="rounded-lg border border-border p-3">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="mt-1 text-sm font-medium">{formatProportion(p)}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">
                {a.total_outcomes} desfecho(s) registrado(s); {a.evaluated} com risco avaliado
                (VP {a.tp} · FP {a.fp} · FN {a.fn} · VN {a.tn}). Concordância total ou parcial:{" "}
                {formatProportion(a.concordance.rate_full_or_partial)}.
              </p>
              {a.small_sample && (
                <p className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
                  Amostra pequena: com menos de 30 casos de referência positivos ou negativos, estas
                  estimativas são instáveis. Use o intervalo de confiança, não só o percentual.
                </p>
              )}
            </>
          )}
        </Card>

        {settings.isError ? (
          <Card className="p-4 sm:p-5">
            <h2 className="font-serif text-lg font-semibold">Configuração e exportação de dados</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Disponível apenas para o administrador global.
            </p>
          </Card>
        ) : (
          (settings.data ?? []).map((c) => <ClinicResearchCard key={c.clinic_id} c={c} />)
        )}
      </div>
    </PainelShell>
  );
}

function ClinicResearchCard({ c }: { c: ResearchSettings & { name: string } }) {
  const qc = useQueryClient();
  const save = useServerFn(saveResearchSettings);
  const exp = useServerFn(exportResearchDataset);
  const [enabled, setEnabled] = useState(c.research_enabled);
  const [protocol, setProtocol] = useState(c.research_protocol ?? "");
  const [tcle, setTcle] = useState(c.research_tcle_text ?? "");
  const [version, setVersion] = useState(c.research_tcle_version ?? "");
  const [k, setK] = useState(5);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const caaeOk = !protocol.trim() || CAAE_RE.test(protocol.trim());

  const saveM = useMutation({
    mutationFn: () =>
      save({
        data: {
          clinic_id: c.clinic_id,
          research_enabled: enabled,
          research_protocol: protocol.trim() || null,
          research_tcle_text: tcle.trim() || null,
          research_tcle_version: version.trim() || null,
        },
      }),
    onSuccess: () => {
      setMsg({ ok: true, text: "Configuração salva." });
      qc.invalidateQueries({ queryKey: ["research-settings"] });
    },
    onError: (e) => setMsg({ ok: false, text: e instanceof Error ? e.message : "Erro ao salvar." }),
  });

  const expM = useMutation({
    mutationFn: () => exp({ data: { clinic_id: c.clinic_id, k_min: k, confirm: true } }),
    onSuccess: (r) => {
      const stamp = new Date().toISOString().slice(0, 10);
      download(`triagens_${stamp}.csv`, r.triagens_csv);
      download(`escalas_${stamp}.csv`, r.escalas_csv);
      download(`dicionario_${stamp}.csv`, r.dicionario_csv);
      download(`manifesto_${stamp}.json`, JSON.stringify(r.manifest, null, 2), "application/json");
      setMsg({
        ok: true,
        text: `Exportado: ${r.manifest.included} triagem(ns) incluída(s); ${r.manifest.suppressed} suprimida(s) por k-anonimato.`,
      });
    },
    onError: (e) => setMsg({ ok: false, text: e instanceof Error ? e.message : "Erro na exportação." }),
  });

  return (
    <Card className="p-4 sm:p-5" data-testid={`research-clinic-${c.clinic_id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-serif text-lg font-semibold">{c.name}</h2>
        <span className="text-xs text-muted-foreground">
          {c.consented_count} de {c.total_count} triagem(ns) com consentimento de pesquisa
        </span>
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Pesquisa habilitada nesta clínica (exige protocolo do CEP e TCLE)
      </label>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium" htmlFor={`p-${c.clinic_id}`}>
            Protocolo do CEP (CAAE)
          </label>
          <Input
            id={`p-${c.clinic_id}`}
            value={protocol}
            onChange={(e) => setProtocol(e.target.value)}
            placeholder="12345678.9.0000.0000"
            className="mt-1"
          />
          {!caaeOk && <p className="mt-1 text-xs text-destructive">Formato esperado: 12345678.9.0000.0000</p>}
        </div>
        <div>
          <label className="text-xs font-medium" htmlFor={`v-${c.clinic_id}`}>
            Versão do TCLE
          </label>
          <Input
            id={`v-${c.clinic_id}`}
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="TCLE-v1"
            className="mt-1"
          />
        </div>
      </div>
      <div className="mt-3">
        <label className="text-xs font-medium" htmlFor={`t-${c.clinic_id}`}>
          Texto do TCLE aprovado pelo CEP (é o texto exato mostrado ao participante)
        </label>
        <Textarea
          id={`t-${c.clinic_id}`}
          value={tcle}
          onChange={(e) => setTcle(e.target.value)}
          rows={8}
          className="mt-1"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={() => saveM.mutate()} disabled={saveM.isPending || !caaeOk}>
          Salvar configuração
        </Button>
        <label className="flex items-center gap-2 text-xs">
          k mínimo
          <Input
            type="number"
            min={3}
            max={50}
            value={k}
            onChange={(e) => setK(Math.max(3, Math.min(50, Number(e.target.value) || 5)))}
            className="h-8 w-16"
          />
        </label>
        <Button
          size="sm"
          variant="outline"
          onClick={() => expM.mutate()}
          disabled={expM.isPending || !c.research_enabled}
        >
          Exportar dados anonimizados
        </Button>
      </div>
      {msg && <p className={`mt-2 text-xs ${msg.ok ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"}`}>{msg.text}</p>}
      <p className="mt-2 text-xs text-muted-foreground">
        A exportação inclui só triagens com consentimento, sem nome, e-mail, telefone, data de
        nascimento, IP nem texto livre; identificadores viram pseudônimos e células com menos de k
        pessoas são generalizadas ou suprimidas. Cada exportação fica na auditoria.
      </p>
    </Card>
  );
}
