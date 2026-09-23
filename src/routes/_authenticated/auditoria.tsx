import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PainelShell } from "@/components/painel/PainelShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listAuditLogs, type AuditLogRow } from "@/lib/audit.functions";
import { AUDIT_ACTION_LABEL } from "@/lib/audit-labels";
import { AcessoNegado } from "@/components/painel/AcessoNegado";
import { isAccessDenied } from "@/lib/access-error";

export const Route = createFileRoute("/_authenticated/auditoria")({
  head: () => ({
    meta: [
      { title: "Auditoria — quem acessou e enviou resultados" },
      {
        name: "description",
        content:
          "Histórico de acessos a triagens, downloads de relatórios, convites e envios por WhatsApp, com autor e data/hora.",
      },
      { property: "og:title", content: "Log de auditoria do painel" },
      {
        property: "og:description",
        content: "Quem acessou, alterou ou enviou resultados e encaminhamentos, e quando.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuditoriaPage,
});

const FILTERS: { id: string; label: string; actions: string[] }[] = [
  { id: "todos", label: "Tudo", actions: [] },
  { id: "acesso", label: "Acessos", actions: ["assessment_viewed"] },
  {
    id: "envio",
    label: "Envios",
    actions: ["invite_created", "whatsapp_sent", "whatsapp_result_notice"],
  },

  { id: "email", label: "E-mails", actions: ["email_sent", "email_failed"] },
  { id: "relatorio", label: "Relatórios", actions: ["report_exported"] },
  {
    id: "alteracao",
    label: "Alterações",
    actions: [
      "contact_created",
      "assessment_submitted",
      "note_added",
      "subscription_created",
      "subscription_updated",
    ],
  },
];

function csvCell(value: unknown) {
  const s = String(value ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

function exportCsv(rows: AuditLogRow[]) {
  const header = ["Data/hora", "Ação", "Autor", "Tipo", "Registro", "Detalhes"];
  const lines = rows.map((r) =>
    [
      new Date(r.created_at).toLocaleString("pt-BR"),
      AUDIT_ACTION_LABEL[r.action] ?? r.action,
      r.actor_email ?? "paciente / acesso público",
      r.entity_type ?? "",
      r.entity_id ?? "",
      Object.entries(r.details ?? {})
        .map(([k, v]) => `${k}: ${String(v)}`)
        .join(" · "),
    ]
      .map(csvCell)
      .join(";"),
  );
  const csv = `\uFEFF${[header.map(csvCell).join(";"), ...lines].join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function AuditoriaPage() {
  const fetchLogs = useServerFn(listAuditLogs);
  const [filter, setFilter] = useState("todos");
  const [q, setQ] = useState("");
  const [acao, setAcao] = useState("todas");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => fetchLogs(),
  });

  const acoesDisponiveis = useMemo(
    () => Array.from(new Set(((data ?? []) as AuditLogRow[]).map((r) => r.action))).sort(),
    [data],
  );

  const rows = useMemo(() => {
    const all = (data ?? []) as AuditLogRow[];
    const f = FILTERS.find((x) => x.id === filter);
    let out = !f || f.actions.length === 0 ? all : all.filter((r) => f.actions.includes(r.action));

    if (acao !== "todas") out = out.filter((r) => r.action === acao);

    if (de) {
      const min = new Date(`${de}T00:00:00`).getTime();
      out = out.filter((r) => new Date(r.created_at).getTime() >= min);
    }
    if (ate) {
      const max = new Date(`${ate}T23:59:59.999`).getTime();
      out = out.filter((r) => new Date(r.created_at).getTime() <= max);
    }

    const term = q.trim().toLowerCase();
    if (!term) return out;
    return out.filter((r) =>
      `${r.actor_email ?? ""} ${AUDIT_ACTION_LABEL[r.action] ?? r.action} ${JSON.stringify(
        r.details ?? {},
      )}`
        .toLowerCase()
        .includes(term),
    );
  }, [data, filter, q, acao, de, ate]);

  const limparFiltros = () => {
    setFilter("todos");
    setAcao("todas");
    setDe("");
    setAte("");
    setQ("");
  };

  return (
    <PainelShell title="Auditoria">
      <div className="space-y-5">
        <Card className="border-border bg-card p-4 sm:p-5">
          <h2 className="font-serif text-lg font-semibold">
            Quem acessou, alterou ou enviou — e quando
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Registro automático das ações no painel: abertura de triagens, download de relatórios,
            criação de contatos, geração de convites e envios por WhatsApp. Os registros não podem
            ser editados nem apagados pelo aplicativo.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <Button
                key={f.id}
                type="button"
                size="sm"
                variant={f.id === filter ? "default" : "outline"}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </Button>
            ))}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="text-xs text-muted-foreground">
              Tipo de ação
              <select
                value={acao}
                onChange={(e) => setAcao(e.target.value)}
                className="mt-1 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="todas">Todas as ações</option>
                {acoesDisponiveis.map((a) => (
                  <option key={a} value={a}>
                    {AUDIT_ACTION_LABEL[a] ?? a}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-muted-foreground">
              De
              <input
                type="date"
                value={de}
                onChange={(e) => setDe(e.target.value)}
                className="mt-1 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Até
              <input
                type="date"
                value={ate}
                onChange={(e) => setAte(e.target.value)}
                className="mt-1 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
          </div>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por pessoa, ação ou paciente…"
            className="mt-3 h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={rows.length === 0}
              onClick={() => exportCsv(rows)}
            >
              Exportar CSV ({rows.length})
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={limparFiltros}>
              Limpar filtros
            </Button>
          </div>
        </Card>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {error && isAccessDenied(error) && (
          <AcessoNegado error={error} title="Acesso negado a estes registros" />
        )}
        {error && !isAccessDenied(error) && (
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : "Erro ao carregar."}
          </p>
        )}

        {!isLoading && !error && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum registro para este filtro ainda.</p>
        )}

        {rows.length > 0 && (
          <Card className="border-border bg-card p-0">
            <ul className="divide-y divide-border">
              {rows.map((r) => (
                <li key={r.id} className="p-4 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{AUDIT_ACTION_LABEL[r.action] ?? r.action}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Por: {r.actor_email ?? "paciente / acesso público"}
                  </div>
                  {r.details && Object.keys(r.details).length > 0 && (
                    <div className="mt-1 text-xs text-foreground/80">
                      {Object.entries(r.details)
                        .map(([k, v]) => `${k}: ${String(v)}`)
                        .join(" · ")}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </PainelShell>
  );
}
