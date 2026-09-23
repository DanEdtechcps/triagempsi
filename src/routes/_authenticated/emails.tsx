import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PainelShell } from "@/components/painel/PainelShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getEmailStatus,
  listEmailTargets,
  previewResultsEmail,
  resendResultsEmail,
} from "@/lib/emails.functions";

export const Route = createFileRoute("/_authenticated/emails")({
  head: () => ({
    meta: [
      { title: "E-mails — confirmação de envio e reenvio" },
      {
        name: "description",
        content:
          "Confirme se os e-mails de resultados foram enviados com sucesso ou falharam e reenvie ao paciente ou ao profissional quando necessário.",
      },
      { property: "og:title", content: "Confirmação de envio de e-mails" },
      {
        property: "og:description",
        content: "Status de entrega dos e-mails de resultados e reenvio manual.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EmailsPage,
});

const EVENT_LABEL: Record<string, string> = {
  sent: "Enviado",
  rejected: "Recusado pelo provedor",
  bounced: "Devolvido (caixa inexistente)",
  complained: "Marcado como spam",
  unsubscribed: "Cancelou inscrição",
  suppressed: "Bloqueado (lista de supressão)",
  rate_limited: "Adiado por limite de envio",
};

function eventTone(type: string) {
  if (type === "sent") return "bg-accent/40 text-accent-foreground border-accent";
  if (type === "rate_limited" || type === "unsubscribed")
    return "bg-muted text-muted-foreground border-border";
  return "bg-destructive/12 text-destructive border-destructive/30";
}

function EmailsPage() {
  const fetchStatus = useServerFn(getEmailStatus);
  const fetchTargets = useServerFn(listEmailTargets);
  const resend = useServerFn(resendResultsEmail);
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<"todos" | "sucesso" | "falha">("todos");
  const [q, setQ] = useState("");
  const [target, setTarget] = useState("");
  const [audience, setAudience] = useState<"profissional" | "paciente">("profissional");
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [previewData, setPreviewData] = useState<{
    to: string | null;
    subject: string;
    html: string;
    respondent_name: string;
  } | null>(null);
  const buildPreview = useServerFn(previewResultsEmail);
  const preview = useMutation({
    mutationFn: (vars: { assessment_id: string; audience: "profissional" | "paciente" }) =>
      buildPreview({ data: vars }),
    onSuccess: (res) =>
      setPreviewData({
        to: res.to,
        subject: res.subject,
        html: res.html,
        respondent_name: res.respondent_name,
      }),
    onError: (e) =>
      setFeedback({
        ok: false,
        msg: e instanceof Error ? e.message : "Não foi possível gerar a pré-visualização.",
      }),
  });
  const [waNotice, setWaNotice] = useState<{
    to_phone: string;
    body: string;
    link: string;
  } | null>(null);

  const status = useQuery({ queryKey: ["email-status"], queryFn: () => fetchStatus() });
  const targets = useQuery({ queryKey: ["email-targets"], queryFn: () => fetchTargets() });

  const mutation = useMutation({
    mutationFn: (vars: { assessment_id: string; audience: "profissional" | "paciente" }) =>
      resend({ data: vars }),
    onSuccess: (res) => {
      setFeedback(
        res.ok
          ? { ok: true, msg: "E-mail reenviado com sucesso." }
          : { ok: false, msg: `Falha no reenvio: ${res.reason}` },
      );
      setWaNotice(res.ok ? (res.whatsapp ?? null) : null);
      queryClient.invalidateQueries({ queryKey: ["email-status"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },

    onError: (e) =>
      setFeedback({
        ok: false,
        msg: e instanceof Error ? e.message : "Não foi possível reenviar.",
      }),
  });

  const rows = useMemo(() => {
    const all = status.data?.deliveries ?? [];
    const byType =
      filter === "todos"
        ? all
        : filter === "sucesso"
          ? all.filter((d) => d.event_type === "sent")
          : all.filter((d) => d.event_type !== "sent");
    const term = q.trim().toLowerCase();
    if (!term) return byType;
    return byType.filter((d) =>
      `${d.recipient} ${d.event_type} ${d.status ?? ""}`.toLowerCase().includes(term),
    );
  }, [status.data, filter, q]);

  const domainMissing = status.data && !status.data.domainConfigured;

  return (
    <PainelShell title="E-mails">
      <div className="space-y-5">
        <Card className="border-border bg-card p-4 sm:p-5">
          <h2 className="font-serif text-lg font-semibold">Confirmação de envio dos e-mails</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe se cada e-mail de resultados foi entregue ou falhou (recusa, devolução, spam
            ou bloqueio) e reenvie quando necessário. Cada reenvio fica registrado na auditoria com
            data, hora e destinatário.
          </p>

          {domainMissing && (
            <p className="mt-3 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">
              O domínio de envio ainda não está configurado — por isso nenhum e-mail é disparado e o
              histórico aparece vazio. Após configurar o domínio, os envios e reenvios funcionam
              imediatamente nesta tela.
            </p>
          )}
          {status.data?.error && (
            <p className="mt-3 text-sm text-destructive">{status.data.error}</p>
          )}
        </Card>

        <Card className="border-border bg-card p-4 sm:p-5">
          <h3 className="text-sm font-semibold">Reenviar resultados</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="">Selecione a triagem…</option>
              {(targets.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.respondent_name} — {new Date(t.submitted_at).toLocaleString("pt-BR")}
                </option>
              ))}
            </select>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as "profissional" | "paciente")}
              className="h-11 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="profissional">Para o profissional</option>
              <option value="paciente">Para o paciente</option>
            </select>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!target || preview.isPending}
                onClick={() => {
                  setFeedback(null);
                  preview.mutate({ assessment_id: target, audience });
                }}
              >
                {preview.isPending ? "Gerando…" : "Pré-visualizar"}
              </Button>
              <Button
                type="button"
                disabled={!target || mutation.isPending}
                onClick={() => {
                  setFeedback(null);
                  mutation.mutate({ assessment_id: target, audience });
                }}
              >
                {mutation.isPending ? "Enviando…" : "Reenviar"}
              </Button>
            </div>
          </div>
          {feedback && (
            <p className={`mt-3 text-sm ${feedback.ok ? "text-foreground" : "text-destructive"}`}>
              {feedback.msg}
            </p>
          )}

          {waNotice && (
            <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-sm font-medium">Aviso por WhatsApp preparado</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Para {waNotice.to_phone} — registrado no histórico e na auditoria.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{waNotice.body}</p>
              <Button asChild size="sm" className="mt-3">
                <a href={waNotice.link} target="_blank" rel="noopener noreferrer">
                  Abrir WhatsApp
                </a>
              </Button>
            </div>
          )}

          {previewData && (
            <div className="mt-4 rounded-lg border border-border">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{previewData.subject}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Para: {previewData.to ?? "sem destinatário definido"} ·{" "}
                    {previewData.respondent_name}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewData(null)}
                >
                  Fechar
                </Button>
              </div>
              <iframe
                title="Pré-visualização do e-mail"
                srcDoc={previewData.html}
                sandbox=""
                className="h-[520px] w-full rounded-b-lg bg-white"
              />
            </div>
          )}
        </Card>

        <Card className="border-border bg-card p-4 sm:p-5">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["todos", "Tudo"],
                ["sucesso", "Enviados"],
                ["falha", "Falhas"],
              ] as const
            ).map(([id, label]) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={filter === id ? "default" : "outline"}
                onClick={() => setFilter(id)}
              >
                {label}
              </Button>
            ))}
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por destinatário ou status…"
            className="mt-3 h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </Card>

        {status.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {!status.isLoading && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum envio registrado até agora.</p>
        )}

        {rows.length > 0 && (
          <Card className="border-border bg-card p-0">
            <ul className="divide-y divide-border">
              {rows.map((d, i) => (
                <li key={`${d.message_id ?? "x"}-${i}`} className="p-4 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{d.recipient}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(d.timestamp).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${eventTone(d.event_type)}`}
                    >
                      {EVENT_LABEL[d.event_type] ?? d.event_type}
                    </span>
                    {d.status && <span className="text-xs text-muted-foreground">{d.status}</span>}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </PainelShell>
  );
}
