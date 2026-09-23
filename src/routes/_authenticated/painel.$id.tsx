import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAssessment } from "@/lib/painel.functions";
import { PainelShell, BandBadge } from "@/components/painel/PainelShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { downloadFhirBundle, type FhirAssessment, type FhirScaleRow } from "@/lib/fhir";
import {
  getItemOptions,
  resolveScaleForAnswers,
  skippedItemIds,
} from "@/lib/scales-data";
import { computeSubscores } from "@/lib/scoring";
import { DecisionTrail } from "@/components/painel/DecisionTrail";
import { BRANDING } from "@/config/branding";
import { downloadClinicianPdf, downloadPatientPdf } from "@/lib/pdf-report";
import { buildPdfPayload } from "@/lib/pdf-payload";
import { logReportExport } from "@/lib/audit.functions";
import { resendAssessmentInvite } from "@/lib/contacts.functions";
import { toE164BR, waLink } from "@/lib/phone";
import { formatDateBR, maskPhoneBR } from "@/lib/masks";
import { useState } from "react";
import { ParecerMedico } from "@/components/painel/ParecerMedico";
import { QueueNav } from "@/components/painel/QueueNav";
import { HistoricoRevisoes } from "@/components/painel/HistoricoRevisoes";
import { PainelPsicoeducacao } from "@/components/painel/PainelPsicoeducacao";
import { TelemetryCard } from "@/components/medical/TelemetryCard";
import { PsychoeducationTracker } from "@/components/medical/PsychoeducationTracker";
import { AcessoNegado } from "@/components/painel/AcessoNegado";
import type { ItemDwellRecord } from "@/lib/clinical-engine/dwell-time";
import { isAccessDenied, accessDeniedMessage } from "@/lib/access-error";



export const Route = createFileRoute("/_authenticated/painel/$id")({
  head: () => ({
    meta: [
      { title: "Detalhe da triagem — Painel do profissional" },
      {
        name: "description",
        content:
          "Respostas item a item, escores e caminho de sintomas de uma pré-triagem.",
      },
      { property: "og:title", content: "Detalhe da triagem" },
      { property: "og:description", content: "Painel do profissional." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PainelDetalhe,
});

type ScaleRow = {
  scale_code: string;
  scale_name: string;
  score: number | null;
  band: string | null;
  band_level: number | null;
  risk: boolean;
  answers: Record<string, number>;
  notes?: string | null;
};




function PainelDetalhe() {
  const { id } = Route.useParams();
  const fetchOne = useServerFn(getAssessment);
  const logExport = useServerFn(logReportExport);
  const resendInvite = useServerFn(resendAssessmentInvite);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["assessment", id],
    queryFn: () => fetchOne({ data: { id } }),
  });

  const a = data as
    | (Record<string, unknown> & { scale_results: ScaleRow[] })
    | null
    | undefined;
  // Espelha o shape real de summarize() (scoring.ts) + os campos que
  // submitAssessment adiciona por cima (preferred_name/pronouns) — extendido
  // pra cobrir os campos que antes eram lidos via `as any` mais abaixo no
  // componente. Se o schema de summary mudar, quebra em compilação em vez
  // de silenciosamente mostrar campo vazio pro médico.
  const summary = (a?.summary ?? {}) as {
    symptoms?: string[];
    indicated_scales?: { code: string; name: string; reason: string }[];
    routing_decisions?: { step: string; reason: string }[];
    age_band?: string | null;
    risk_pathway?: boolean;
    preferred_name?: string | null;
    pronouns?: string | null;
    telemetry_records?: ItemDwellRecord[];
    item_telemetry?: ItemDwellRecord[];
  };

  const riskFlags = (a?.risk_flags as string[]) ?? [];
  const risco = riskFlags.length > 0 || summary.risk_pathway;
  const medico =
    (a as
      | { doctor_profiles?: { display_name: string; specialty: string | null } | null }
      | null
      | undefined)?.doctor_profiles ?? null;


  function baixarPdf(tipo: "clinico" | "paciente") {
    if (!a) return;
    const payload = buildPdfPayload(a);
    if (tipo === "clinico") downloadClinicianPdf(payload);
    else downloadPatientPdf(payload);
    void logExport({ data: { assessment_id: id, kind: tipo } }).catch(() => {});
  }


  function baixarFhir() {
    if (!a) return;
    downloadFhirBundle(a as unknown as FhirAssessment, (a.scale_results ?? []) as FhirScaleRow[]);
    void logExport({ data: { assessment_id: id, kind: "fhir" } }).catch(() => {});
  }

  async function reenviarWhatsapp() {
    setResendMsg(null);
    setResending(true);
    try {
      const r = await resendInvite({ data: { assessment_id: id } });
      const url = `${window.location.origin}/${r.clinic_slug}/triagem?t=${r.token}`;
      window.open(waLink(r.to_phone, `${r.body} ${url}`), "_blank", "noopener");
      setResendMsg(
        `Reenvio registrado em ${new Date(r.resent_at).toLocaleString("pt-BR")} para ${r.to_phone}.`,
      );
    } catch (err) {
      setResendMsg(
        isAccessDenied(err)
          ? `Acesso negado: ${accessDeniedMessage(err)}`
          : err instanceof Error
            ? err.message
            : "Não foi possível reenviar.",
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <PainelShell
      title="Detalhe da triagem"
      action={
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Button
            variant="outline"
            size="sm"
            disabled={!a}
            onClick={() => baixarPdf("paciente")}
          >
            PDF do paciente
          </Button>
          <Button size="sm" disabled={!a} onClick={() => baixarPdf("clinico")}>
            PDF clínico
          </Button>
          <Button variant="outline" size="sm" disabled={!a} onClick={baixarFhir}>
            Exportar FHIR
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/evolucao">Evolução</Link>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={!a || resending}
            onClick={() => void reenviarWhatsapp()}
          >
            {resending ? "Reenviando…" : "Reenviar por WhatsApp"}
          </Button>
        </div>
      }
    >
      {resendMsg && (
        <p className="mb-3 rounded-md border border-border bg-muted/40 p-3 text-sm print:hidden">
          {resendMsg}
        </p>
      )}

      <QueueNav id={id} />

      <Link
        to="/painel"
        className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground print:hidden"
      >
        ← Voltar à lista
      </Link>


      {isLoading && (
        <div className="space-y-4" aria-busy="true" aria-label="Carregando detalhes da triagem">
          <div className="h-28 w-full animate-pulse rounded-xl bg-muted/60" />
          <div className="h-44 w-full animate-pulse rounded-xl bg-muted/40" />
          <div className="h-32 w-full animate-pulse rounded-xl bg-muted/30" />
        </div>
      )}
      {error && isAccessDenied(error) && <AcessoNegado error={error} />}
      {error && !isAccessDenied(error) && (
        <Card className="flex flex-col items-center justify-center gap-3 border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-medium text-destructive">
            {error instanceof Error ? error.message : "Erro ao carregar detalhes da triagem."}
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </Card>
      )}

      {a && (
        <div className="space-y-5">
          {risco && (
            <Card className="border-destructive/50 bg-destructive/5 p-4">
              <div className="font-semibold text-destructive">
                Via de risco de suicídio acionada
              </div>
              <p className="mt-1 text-sm text-foreground/80">
                O paciente sinalizou pensamentos de morte ou autolesão. Sinalizadores:{" "}
                {riskFlags.join(", ") || "via de sintomas"}. Orientação de emergência
                exibida ao paciente ({BRANDING.emergency.cvvLabel} —{" "}
                {BRANDING.emergency.cvvPhone}).
              </p>
            </Card>
          )}

          {(() => {
            const preferredName = summary.preferred_name ?? undefined;
            const pronouns = summary.pronouns ?? undefined;
            const rawPhone = a.respondent_phone ? String(a.respondent_phone) : null;
            const phoneMasked = rawPhone ? maskPhoneBR(rawPhone) : null;
            const phoneE164 = rawPhone ? toE164BR(rawPhone) : null;

            return (
              <Card className="p-4 sm:p-5">
                <h2 className="font-serif text-lg font-semibold">Identificação</h2>
                <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  <Field label="Nome completo" value={String(a.respondent_name ?? "")} />
                  {preferredName && (
                    <Field
                      label="Nome social / Como prefere ser chamado(a)"
                      value={preferredName}
                    />
                  )}
                  {pronouns && (
                    <Field label="Pronomes de tratamento" value={pronouns} />
                  )}
                  <Field
                    label="Idade"
                    value={a.respondent_age != null ? `${a.respondent_age} anos` : "—"}
                  />
                  <Field
                    label="Nascimento"
                    value={formatDateBR(a.birth_date ? String(a.birth_date) : null)}
                  />
                  <Field label="Sexo / Identidade de gênero" value={String(a.respondent_sex ?? "—")} />
                  <Field
                    label="Quem respondeu"
                    value={
                      a.respondent_type === "familiar"
                        ? `Familiar/responsável${
                            a.informant_name ? ` — ${String(a.informant_name)}` : ""
                          }${a.informant_relation ? ` (${String(a.informant_relation)})` : ""}`
                        : "O próprio paciente"
                    }
                  />
                  <Field
                    label="Profissional escolhido"
                    value={
                      medico
                        ? `${medico.display_name}${medico.specialty ? ` — ${medico.specialty}` : ""}`
                        : "Sem preferência"
                    }
                  />
                  <Field label="E-mail" value={String(a.respondent_email ?? "—")} />
                  <div>
                    <dt className="text-xs text-muted-foreground">Telefone / WhatsApp</dt>
                    <dd className="font-medium text-foreground flex items-center gap-2">
                      <span>{phoneMasked || "—"}</span>
                      {phoneE164 && (
                        <a
                          href={waLink(
                            phoneE164,
                            `Olá, ${preferredName || a.respondent_name}! Entramos em contato a respeito da sua pré-avaliação na ${BRANDING.clinicName}.`,
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                        >
                          WhatsApp
                        </a>
                      )}
                    </dd>
                  </div>
                  <Field
                    label="Enviado em"
                    value={new Date(String(a.submitted_at)).toLocaleString("pt-BR")}
                  />
                  <Field
                    label="Consentimento LGPD"
                    value={
                      a.consent_at
                        ? `Registrado em ${new Date(String(a.consent_at)).toLocaleString("pt-BR")}`
                        : "Registrado"
                    }
                  />
                </dl>
                {a.main_complaint ? (
                  <div className="mt-4">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Motivo da busca (relato do paciente)
                    </div>
                    <p className="mt-1 whitespace-pre-line text-sm text-foreground/90">
                      {String(a.main_complaint)}
                    </p>
                  </div>
                ) : null}
              </Card>
            );
          })()}

          <Card className="p-4 sm:p-5">
            <h2 className="font-serif text-lg font-semibold">
              Por que estas escalas foram aplicadas
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Da característica relatada ao encaminhamento final, com o critério
              objetivo de cada decisão.
            </p>
            <div className="mt-4">
              <DecisionTrail
                symptoms={summary.symptoms ?? []}
                decisions={summary.routing_decisions ?? []}
                indicated={summary.indicated_scales ?? []}
                results={a.scale_results ?? []}
                ageBand={summary.age_band}
                age={a.respondent_age as number | null}
                riskPathway={Boolean(risco)}
              />
            </div>
          </Card>

          <TelemetryCard
            telemetryRecords={summary.telemetry_records ?? summary.item_telemetry ?? []}
            scaleResults={a.scale_results ?? []}
          />

          <HistoricoRevisoes assessmentId={id} />

          <ParecerMedico assessmentId={id} />

          <PsychoeducationTracker assessmentId={id} />

          <PainelPsicoeducacao
            assessmentId={id}
            scaleResults={a.scale_results ?? []}
            riskPathway={Boolean(summary.risk_pathway)}
            hasRiskFlags={riskFlags.length > 0}
          />

          {(a.scale_results ?? []).map((r) => {

            // resolveScaleForAnswers cobre registros antigos cuja definição
            // da escala foi substituída (ex.: ASSIST → ASSIST-Lite).
            const scale = resolveScaleForAnswers(r.scale_code, r.answers);
            const riskItems = scale?.riskItems ?? [];
            const skipped = scale
              ? skippedItemIds(scale, r.answers ?? {})
              : new Set<string>();
            const subscores = scale
              ? (computeSubscores(scale, r.answers ?? {}) ?? null)
              : null;
            const estimatedIds = new Set(
              (r as { estimated_items?: string[] }).estimated_items ?? [],
            );
            return (
              <Card
                key={r.scale_code}
                className={`p-4 sm:p-5 ${r.risk ? "border-destructive/50" : ""}`}
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <h2 className="font-serif text-lg font-semibold">
                      {r.scale_code}
                    </h2>
                    <p className="text-sm text-muted-foreground">{r.scale_name}</p>
                    {r.notes && (
                      <p className="mt-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                        {r.notes}
                      </p>
                    )}
                    {r.risk && (
                      <span className="mt-2 inline-flex rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                        Sinalização de risco nesta escala
                      </span>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-2xl font-semibold">{r.score ?? "—"}</div>
                    <BandBadge level={r.band_level ?? 0} label={r.band ?? "—"} />
                  </div>
                </div>
                {subscores && (
                  <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                          <th className="px-3 py-2 font-medium">Substância</th>
                          <th className="px-3 py-2 text-right font-medium">Escore</th>
                          <th className="px-3 py-2 font-medium">Faixa</th>
                          <th className="hidden px-3 py-2 font-medium sm:table-cell">Conduta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {subscores.map((s) => (
                          <tr key={s.key}>
                            <td className="px-3 py-2 text-foreground/90">{s.label}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-foreground">
                              {s.score}/{s.max}
                            </td>
                            <td className="px-3 py-2">
                              <BandBadge level={s.band_level} label={s.band} />
                            </td>
                            <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">
                              {s.recommendation ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <ul className="mt-4 divide-y divide-border text-sm">
                  {scale?.items.map((item, idx) => {
                    const val = r.answers?.[item.id];
                    const isSkipped = skipped.has(item.id);
                    const opt = getItemOptions(scale, item.id).find(
                      (o) => o.value === val,
                    );
                    const itemRisk =
                      riskItems.includes(item.id) && typeof val === "number" && val > 0;
                    return (
                      <li
                        key={item.id}
                        className={`grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-1 py-2 ${
                          itemRisk ? "bg-destructive/5" : ""
                        }`}
                      >
                        <span
                          className={`min-w-0 ${itemRisk ? "font-medium text-destructive" : isSkipped ? "text-muted-foreground/70" : "text-foreground/90"}`}
                        >
                          {idx + 1}. {item.text}
                          {itemRisk && " ⚠"}
                        </span>
                        <span
                          className={`shrink-0 text-right ${itemRisk ? "font-medium text-destructive" : "text-muted-foreground"}`}
                        >
                          {isSkipped
                            ? "pulada — não se aplica"
                            : `${opt?.label ?? "—"} (${val ?? "—"})`}
                          {estimatedIds.has(item.id) && !isSkipped && (
                            <span className="ml-1.5 rounded bg-muted px-1 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              estimado
                            </span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            );
          })}

          <p className="text-xs text-muted-foreground">{BRANDING.disclaimer}</p>
        </div>
      )}
    </PainelShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-foreground/90">{value}</dd>
    </div>
  );
}
