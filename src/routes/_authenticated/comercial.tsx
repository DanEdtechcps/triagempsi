import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Banknote,
  CalendarClock,
  CircleAlert,
  FlaskConical,
  Pencil,
  TrendingUp,
} from "lucide-react";
import { PainelShell } from "@/components/painel/PainelShell";
import { AcessoNegado } from "@/components/painel/AcessoNegado";
import { isAccessDenied } from "@/lib/access-error";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FadeIn } from "@/components/motion/primitives";
import {
  listCommercialAdmin,
  listPlans,
  upsertSubscriptionAdmin,
  type CommercialRow,
  type SubscriptionStatus,
} from "@/lib/billing.functions";

export const Route = createFileRoute("/_authenticated/comercial")({
  head: () => ({
    meta: [
      { title: "Visão comercial — Assinaturas dos consultórios" },
      {
        name: "description",
        content:
          "Acompanhe planos, situação das assinaturas, vencimentos e receita recorrente da plataforma.",
      },
      { property: "og:title", content: "Visão comercial" },
      {
        property: "og:description",
        content: "Assinaturas, planos e receita recorrente dos consultórios.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ComercialPage,
});

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  trial: "Trial",
  ativa: "Ativa",
  inadimplente: "Inadimplente",
  suspensa: "Suspensa",
  cancelada: "Cancelada",
};

const STATUS_STYLE: Record<SubscriptionStatus, string> = {
  trial: "border-sky-300 bg-sky-50 text-sky-700",
  ativa: "border-emerald-300 bg-emerald-50 text-emerald-700",
  inadimplente: "border-amber-300 bg-amber-50 text-amber-700",
  suspensa: "border-orange-300 bg-orange-50 text-orange-700",
  cancelada: "border-rose-300 bg-rose-50 text-rose-700",
};

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const end = new Date(`${dateStr}T23:59:59`);
  return Math.ceil((end.getTime() - Date.now()) / 86_400_000);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Banknote;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/70 p-4">
      <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
        {label}
      </div>
      <p className="mt-2 font-serif text-2xl font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function ComercialPage() {
  const queryClient = useQueryClient();
  const fetchCommercial = useServerFn(listCommercialAdmin);
  const fetchPlans = useServerFn(listPlans);
  const saveSubscription = useServerFn(upsertSubscriptionAdmin);

  const commercial = useQuery({
    queryKey: ["admin-commercial"],
    queryFn: () => fetchCommercial({}),
  });
  const plans = useQuery({
    queryKey: ["billing-plans"],
    queryFn: () => fetchPlans({}),
  });

  const denied = isAccessDenied(commercial.error);
  const rows = commercial.data ?? [];

  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [editing, setEditing] = useState<CommercialRow | null>(null);
  const [planCode, setPlanCode] = useState("");
  const [status, setStatus] = useState<SubscriptionStatus>("trial");
  const [customPrice, setCustomPrice] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [trialEnd, setTrialEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const kpis = useMemo(() => {
    const mrr = rows
      .filter((r) => r.status === "ativa")
      .reduce((acc, r) => acc + (r.effective_price_cents ?? 0), 0);
    const trialPotential = rows
      .filter((r) => r.status === "trial")
      .reduce((acc, r) => acc + (r.effective_price_cents ?? 0), 0);
    const trials = rows.filter((r) => r.status === "trial").length;
    const overdue = rows.filter((r) => r.status === "inadimplente").length;
    const expiring = rows.filter((r) => {
      if (r.status !== "ativa" && r.status !== "trial") return false;
      const d = daysUntil(r.current_period_end);
      return d !== null && d >= 0 && d <= 30;
    }).length;
    return { mrr, trialPotential, trials, overdue, expiring };
  }, [rows]);

  const filtered = useMemo(
    () =>
      statusFilter === "todos"
        ? rows
        : rows.filter((r) => (r.status ?? "sem_assinatura") === statusFilter),
    [rows, statusFilter],
  );

  function openEdit(row: CommercialRow) {
    setEditing(row);
    setPlanCode(row.plan_code ?? "consultorio");
    setStatus(row.status ?? "trial");
    setCustomPrice(
      row.monthly_price_cents != null
        ? (row.monthly_price_cents / 100).toFixed(2).replace(".", ",")
        : "",
    );
    setPeriodEnd(row.current_period_end ?? "");
    setTrialEnd(row.trial_ends_at ? row.trial_ends_at.slice(0, 10) : "");
    setNotes(row.notes ?? "");
    setMsg(null);
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    setMsg(null);
    try {
      const priceDigits = customPrice.replace(/[^\d,\.]/g, "").replace(",", ".");
      const priceCents =
        customPrice.trim() === "" || Number.isNaN(Number(priceDigits))
          ? null
          : Math.round(Number(priceDigits) * 100);
      await saveSubscription({
        data: {
          clinic_id: editing.clinic_id,
          plan_code: planCode,
          status,
          monthly_price_cents: priceCents,
          current_period_end: periodEnd || null,
          trial_ends_at: trialEnd ? `${trialEnd}T23:59:59.000Z` : null,
          notes: notes.trim() || null,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-commercial"] });
      setEditing(null);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Não foi possível salvar a assinatura.");
    } finally {
      setSaving(false);
    }
  }

  if (denied) {
    return (
      <PainelShell title="Visão comercial">
        <AcessoNegado error={commercial.error} />
      </PainelShell>
    );
  }

  return (
    <PainelShell title="Visão comercial">
      <FadeIn>
        <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-28 -left-16 h-64 w-64 rounded-full bg-accent/40 blur-3xl"
          />
          <div className="relative">
            <p className="text-xs font-medium tracking-wide text-primary uppercase">
              Administração
            </p>
            <h1 className="mt-1 font-serif text-2xl font-semibold sm:text-3xl">Visão comercial</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Planos, situação das assinaturas e receita recorrente. Suspender ou cancelar uma
              assinatura desativa o acesso do consultório automaticamente.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi
                icon={Banknote}
                label="MRR ativo"
                value={BRL.format(kpis.mrr / 100)}
                hint={
                  kpis.trialPotential > 0
                    ? `+ ${BRL.format(kpis.trialPotential / 100)} potencial em trials`
                    : undefined
                }
              />
              <Kpi
                icon={FlaskConical}
                label="Em trial"
                value={String(kpis.trials)}
                hint="aguardando conversão"
              />
              <Kpi
                icon={CircleAlert}
                label="Inadimplentes"
                value={String(kpis.overdue)}
                hint="cobrança pendente"
              />
              <Kpi
                icon={CalendarClock}
                label="Vencem em 30 dias"
                value={String(kpis.expiring)}
                hint="renovação ou follow-up"
              />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48 bg-background/70">
                  <SelectValue placeholder="Filtrar por situação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as situações</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="inadimplente">Inadimplente</SelectItem>
                  <SelectItem value="suspensa">Suspensa</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                  <SelectItem value="sem_assinatura">Sem assinatura</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" asChild>
                <Link to="/admin">Consultórios e equipe</Link>
              </Button>
            </div>
          </div>
        </section>
      </FadeIn>

      <FadeIn className="mt-6">
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Consultório</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Valor/mês</TableHead>
                <TableHead>Equipe</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commercial.isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Carregando visão comercial…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Nenhum consultório nessa situação.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => {
                  const days = daysUntil(row.current_period_end);
                  const limit = row.max_professionals;
                  return (
                    <TableRow key={row.clinic_id}>
                      <TableCell>
                        <p className="font-medium">{row.clinic_name}</p>
                        <p className="text-xs text-muted-foreground">
                          /{row.clinic_slug}
                          {!row.clinic_is_active ? " · acesso inativo" : ""}
                        </p>
                      </TableCell>
                      <TableCell>
                        {row.plan_name ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {row.status ? (
                          <Badge variant="outline" className={STATUS_STYLE[row.status]}>
                            {STATUS_LABEL[row.status]}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Sem assinatura
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.effective_price_cents != null ? (
                          <span>
                            {BRL.format(row.effective_price_cents / 100)}
                            {row.monthly_price_cents != null &&
                            row.monthly_price_cents !== row.plan_price_cents ? (
                              <span className="ml-1 text-xs text-muted-foreground">
                                (personalizado)
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Sob medida</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.staff_count}
                        {limit != null ? (
                          <span className="text-xs text-muted-foreground">/{limit}</span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <span>{formatDate(row.current_period_end)}</span>
                        {days !== null && days >= 0 && row.status !== "cancelada" ? (
                          <p
                            className={`text-xs ${
                              days <= 7 ? "font-medium text-amber-600" : "text-muted-foreground"
                            }`}
                          >
                            {days === 0 ? "vence hoje" : `${days} dias`}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
                          <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                          Gerenciar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </section>
      </FadeIn>

      <FadeIn className="mt-6">
        <section className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          <p className="flex items-start gap-2">
            <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span>
              Os limites do plano são aplicados automaticamente: o plano Consultório aceita até 2
              profissionais por unidade; equipes maiores pedem o plano Clínica. Valores
              “personalizados” substituem o preço de tabela (acordos sob medida).
            </span>
          </p>
        </section>
      </FadeIn>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">Assinatura — {editing?.clinic_name}</DialogTitle>
            <DialogDescription>
              Ajuste plano, situação e vencimento. Ao suspender ou cancelar, o consultório perde o
              acesso na hora.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="sub-plan">Plano</Label>
              <Select value={planCode} onValueChange={setPlanCode}>
                <SelectTrigger id="sub-plan">
                  <SelectValue placeholder="Selecione o plano" />
                </SelectTrigger>
                <SelectContent>
                  {(plans.data ?? []).map((p) => (
                    <SelectItem key={p.code} value={p.code}>
                      {p.name}
                      {p.monthly_price_cents != null
                        ? ` — ${BRL.format(p.monthly_price_cents / 100)}/mês`
                        : " — sob medida"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sub-status">Situação</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as SubscriptionStatus)}>
                <SelectTrigger id="sub-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="inadimplente">Inadimplente</SelectItem>
                  <SelectItem value="suspensa">Suspensa</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="sub-price">Valor mensal personalizado (R$)</Label>
                <Input
                  id="sub-price"
                  inputMode="decimal"
                  placeholder="Vazio = preço do plano"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sub-period">Vencimento do período</Label>
                <Input
                  id="sub-period"
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sub-trial">Fim do trial (opcional)</Label>
              <Input
                id="sub-trial"
                type="date"
                value={trialEnd}
                onChange={(e) => setTrialEnd(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sub-notes">Observações internas</Label>
              <Textarea
                id="sub-notes"
                rows={3}
                placeholder="Acordos, descontos combinados, contato financeiro…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {msg ? (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {msg}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando…" : "Salvar assinatura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PainelShell>
  );
}
