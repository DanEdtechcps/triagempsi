import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PainelShell } from "@/components/painel/PainelShell";
import { AcessoNegado } from "@/components/painel/AcessoNegado";
import { LandingSettingsForm } from "@/components/painel/LandingSettingsForm";
import { PsychoeducationGenerationPanel } from "@/components/painel/PsychoeducationGenerationPanel";
import { Stat } from "@/components/admin/Stat";
import { ColorField } from "@/components/admin/ColorField";
import { DoctorProfilesCard } from "@/components/admin/DoctorProfilesCard";
import { ClinicEditDialog } from "@/components/admin/ClinicEditDialog";
import { ManagerAccessDialog } from "@/components/admin/ManagerAccessDialog";

import { isAccessDenied, accessDeniedMessage } from "@/lib/access-error";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { maskPhoneBR } from "@/lib/masks";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FadeIn, StaggerGroup, StaggerItem } from "@/components/motion/primitives";
import {
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import {
  addStaffAdmin,
  createClinicAdmin,
  listClinicsAdmin,
  listStaffAdmin,
  removeStaffAdmin,
  setClinicActiveAdmin,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Consultórios e equipe — Administração da pré-triagem" },
      {
        name: "description",
        content:
          "Cadastre consultórios, defina identidade visual e vincule médicos com acesso isolado por unidade.",
      },
      { property: "og:title", content: "Consultórios e equipe" },
      {
        property: "og:description",
        content: "Administração de consultórios e profissionais da pré-triagem.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function slugify(v: string) {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// Presets de Cores Institucionais
const COLOR_PRESETS = [
  { name: "Saraiva Esmeralda", primary: "#0f766e", accent: "#ccfbf1" },
  { name: "Azul Clínico", primary: "#0284c7", accent: "#e0f2fe" },
  { name: "Anil Profundo", primary: "#4338ca", accent: "#e0e7ff" },
  { name: "Grafite Moderno", primary: "#334155", accent: "#f1f5f9" },
  { name: "Vinho Nobre", primary: "#881337", accent: "#ffe4e6" },
];

function AdminPage() {
  const queryClient = useQueryClient();
  const fetchClinics = useServerFn(listClinicsAdmin);
  const fetchStaff = useServerFn(listStaffAdmin);
  const addClinic = useServerFn(createClinicAdmin);
  const toggleClinic = useServerFn(setClinicActiveAdmin);
  const addStaff = useServerFn(addStaffAdmin);
  const removeStaff = useServerFn(removeStaffAdmin);

  const clinics = useQuery({ queryKey: ["admin-clinics"], queryFn: () => fetchClinics({}) });
  const staff = useQuery({ queryKey: ["admin-staff"], queryFn: () => fetchStaff({}) });

  const denied = isAccessDenied(clinics.error);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [tagline, setTagline] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [primary, setPrimary] = useState("#0f766e");
  const [accent, setAccent] = useState("#ccfbf1");
  const [planCode, setPlanCode] = useState<"consultorio" | "clinica" | "instituicao">(
    "consultorio",
  );
  const [subscriptionStatus, setSubscriptionStatus] = useState<"trial" | "ativa">("trial");
  const [savingClinic, setSavingClinic] = useState(false);
  const [clinicMsg, setClinicMsg] = useState<string | null>(null);
  const [novoConsultorioAberto, setNovoConsultorioAberto] = useState(false);

  const [staffEmail, setStaffEmail] = useState("");
  const [staffRole, setStaffRole] = useState<"admin" | "doctor" | "staff">("doctor");
  const [staffClinic, setStaffClinic] = useState<string>("");
  const [staffPassword, setStaffPassword] = useState("");
  const [savingStaff, setSavingStaff] = useState(false);
  const [staffMsg, setStaffMsg] = useState<string | null>(null);
  const [novoAcessoAberto, setNovoAcessoAberto] = useState(false);

  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [editingClinicId, setEditingClinicId] = useState<string | null>(null);
  const [managerAccessClinicId, setManagerAccessClinicId] = useState<string | null>(null);

  const list = clinics.data ?? [];
  const activeCount = useMemo(() => list.filter((c) => c.is_active).length, [list]);
  const staffList = staff.data ?? [];

  function handleCopiarLink(slug: string, id: string) {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/${slug}`;
    void navigator.clipboard?.writeText(url);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2500);
  }

  async function handleCreateClinic(e: React.FormEvent) {
    e.preventDefault();
    setClinicMsg(null);
    setSavingClinic(true);
    const finalSlug = (slugTouched ? slug : slugify(name)).trim();
    if (!finalSlug) {
      setClinicMsg("Informe um slug válido.");
      setSavingClinic(false);
      return;
    }
    try {
      await addClinic({
        data: {
          name: name.trim(),
          slug: finalSlug,
          tagline: tagline.trim() || null,
          contact_email: contactEmail.trim() || null,
          contact_phone: contactPhone.trim() || null,
          primary_color: primary,
          accent_color: accent,
          plan_code: planCode,
          subscription_status: subscriptionStatus,
        },
      });
      setName("");
      setSlug("");
      setSlugTouched(false);
      setTagline("");
      setContactEmail("");
      setContactPhone("");
      setPlanCode("consultorio");
      setSubscriptionStatus("trial");
      setClinicMsg("Consultório cadastrado com sucesso!");
      setNovoConsultorioAberto(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-clinics"] });
    } catch (err) {
      setClinicMsg(
        isAccessDenied(err)
          ? accessDeniedMessage(err)
          : err instanceof Error
            ? err.message
            : "Não foi possível cadastrar o consultório.",
      );
    } finally {
      setSavingClinic(false);
    }
  }

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault();
    setStaffMsg(null);
    setSavingStaff(true);
    try {
      const res = await addStaff({
        data: {
          email: staffEmail.trim(),
          role: staffRole,
          clinic_id: staffClinic || null,
          password: staffPassword || null,
        },
      });
      setStaffEmail("");
      setStaffPassword("");
      setStaffMsg(
        res.already_linked
          ? "Esse profissional já tinha esse vínculo."
          : res.created
            ? "Acesso criado e vinculado com sucesso."
            : "Profissional já existente vinculado ao consultório.",
      );
      setNovoAcessoAberto(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-clinics"] });
    } catch (err) {
      setStaffMsg(
        isAccessDenied(err)
          ? accessDeniedMessage(err)
          : err instanceof Error
            ? err.message
            : "Não foi possível vincular o profissional.",
      );
    } finally {
      setSavingStaff(false);
    }
  }

  if (clinics.isLoading || staff.isLoading) {
    return (
      <PainelShell title="Consultórios e equipe">
        <div
          className="space-y-4"
          aria-busy="true"
          aria-label="Carregando informações administrativas"
        >
          <div className="h-32 w-full animate-pulse rounded-2xl bg-muted/60" />
          <div className="h-64 w-full animate-pulse rounded-2xl bg-muted/40" />
        </div>
      </PainelShell>
    );
  }

  if (denied) {
    return (
      <PainelShell title="Consultórios e equipe">
        <AcessoNegado error={clinics.error} />
      </PainelShell>
    );
  }

  return (
    <PainelShell title="Consultórios e equipe">
      <FadeIn>
        {/* Banner Hero Responsivo */}
        <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-6 lg:p-8">
          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-wider text-primary uppercase">
                  Gestão & Unidades
                </p>
                <h1 className="mt-1 font-serif text-xl font-semibold sm:text-2xl lg:text-3xl">
                  Consultórios e Equipe Médica
                </h1>
                <p className="mt-1 max-w-2xl text-xs sm:text-sm text-muted-foreground">
                  Configure unidades com identidade visual própria e vincule médicos com acesso
                  isolado por consultório.
                </p>
              </div>

              <Button variant="outline" size="sm" asChild className="h-9 gap-1.5 text-xs">
                <Link to="/comercial">
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Visão comercial</span>
                </Link>
              </Button>
            </div>

            {/* Régua de Estatísticas Compacta (responsiva em 3 colunas até em telas estreitas) */}
            <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-4">
              <Stat
                label="Consultórios"
                value={list.length}
                icon={<Building2 className="h-4 w-4 text-primary" />}
              />
              <Stat
                label="Ativos"
                value={activeCount}
                icon={<Check className="h-4 w-4 text-emerald-600" />}
              />
              <Stat
                label="Profissionais"
                value={staffList.length}
                icon={<Users className="h-4 w-4 text-blue-600" />}
              />
            </div>
          </div>
        </section>
      </FadeIn>

      {/* Tabs com estilo pílula e rolagem controlada */}
      <Tabs defaultValue="consultorios" className="mt-6">
        <TabsList className="grid w-full grid-cols-4 sm:inline-flex sm:w-auto h-auto p-1 bg-muted rounded-xl">
          <TabsTrigger value="consultorios" className="py-2 text-xs sm:text-sm font-medium">
            Consultórios
          </TabsTrigger>
          <TabsTrigger value="equipe" className="py-2 text-xs sm:text-sm font-medium">
            Equipe médica
          </TabsTrigger>
          <TabsTrigger value="landing" className="py-2 text-xs sm:text-sm font-medium">
            Landing page
          </TabsTrigger>
          <TabsTrigger value="conteudo" className="py-2 text-xs sm:text-sm font-medium">
            Conteúdo (IA)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="landing" className="mt-4">
          <LandingSettingsForm />
        </TabsContent>

        <TabsContent value="conteudo" className="mt-4">
          <PsychoeducationGenerationPanel />
        </TabsContent>

        {/* ABA: CONSULTÓRIOS */}
        <TabsContent value="consultorios" className="mt-4">
          {/* Botão de Toggle para Mobile */}
          <div className="mb-4 lg:hidden">
            <Button
              variant="outline"
              onClick={() => setNovoConsultorioAberto(!novoConsultorioAberto)}
              className="w-full min-h-11 justify-between gap-2 border-primary/30 bg-primary/5 text-primary"
            >
              <span className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Novo consultório
              </span>
              {novoConsultorioAberto ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
            {/* Formulário Novo Consultório (sempre aberto no Desktop, colapsável no Mobile) */}
            <Card className={`p-4 sm:p-5 ${novoConsultorioAberto ? "block" : "hidden lg:block"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-base sm:text-lg font-semibold">
                    Novo consultório
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Endereço público em{" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-[11px]">/seu-slug</code>
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateClinic} className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="c-name" className="text-xs">
                    Nome do Consultório *
                  </Label>
                  <Input
                    id="c-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Saraiva Clínica de Psiquiatria"
                    required
                    maxLength={120}
                    className="h-10 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="c-slug" className="text-xs">
                    Endereço público (slug) *
                  </Label>
                  <Input
                    id="c-slug"
                    value={slugTouched ? slug : slugify(name)}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setSlug(e.target.value);
                    }}
                    placeholder="saraiva"
                    className="h-10 text-sm font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="c-tagline" className="text-xs">
                    Frase de apresentação
                  </Label>
                  <Input
                    id="c-tagline"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="Psiquiatria com escuta, ciência e humanidade"
                    maxLength={160}
                    className="h-10 text-sm"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="c-email" className="text-xs">
                      E-mail de contato
                    </Label>
                    <Input
                      id="c-email"
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="contato@clinica.com"
                      className="h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="c-phone" className="text-xs">
                      Telefone / WhatsApp
                    </Label>
                    <Input
                      id="c-phone"
                      type="tel"
                      inputMode="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(maskPhoneBR(e.target.value))}
                      placeholder="(54) 99999-9999"
                      maxLength={16}
                      className="h-10 text-sm"
                    />
                  </div>
                </div>

                {/* Plano e status da assinatura contratada */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="c-plan" className="text-xs">
                      Plano contratado
                    </Label>
                    <select
                      id="c-plan"
                      value={planCode}
                      onChange={(e) => setPlanCode(e.target.value as typeof planCode)}
                      className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="consultorio">Consultório — R$ 890/mês</option>
                      <option value="clinica">Clínica — R$ 2.400/mês</option>
                      <option value="instituicao">Instituição — sob consulta</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="c-status" className="text-xs">
                      Status da assinatura
                    </Label>
                    <select
                      id="c-status"
                      value={subscriptionStatus}
                      onChange={(e) =>
                        setSubscriptionStatus(e.target.value as typeof subscriptionStatus)
                      }
                      className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="trial">Período de teste (30 dias)</option>
                      <option value="ativa">Assinatura ativa (já contratado)</option>
                    </select>
                  </div>
                </div>

                {/* Seletor com Presets de Cores */}
                <div className="space-y-2">
                  <Label className="text-xs">Paleta de cores recomendada</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {COLOR_PRESETS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => {
                          setPrimary(p.primary);
                          setAccent(p.accent);
                        }}
                        title={p.name}
                        className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-[11px] font-medium transition-colors hover:border-primary/50"
                      >
                        <span
                          className="h-3 w-3 rounded-full border border-black/10 shrink-0"
                          style={{ background: p.primary }}
                        />
                        <span className="truncate">{p.name.split(" ")[0]}</span>
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 pt-1">
                    <ColorField
                      id="c-primary"
                      label="Cor principal"
                      value={primary}
                      onChange={setPrimary}
                    />
                    <ColorField
                      id="c-accent"
                      label="Cor de apoio"
                      value={accent}
                      onChange={setAccent}
                    />
                  </div>
                </div>

                {/* Prévia da marca */}
                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Prévia visual
                  </p>
                  <div className="mt-2.5 flex items-center gap-3">
                    <span
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-bold shadow-sm"
                      style={{ background: primary, color: accent }}
                    >
                      {(name || "S").slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-serif text-sm font-semibold">
                        {name || "Saraiva Clínica de Psiquiatria"}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {tagline || "Cuidado psiquiátrico com escuta, ciência e humanidade"}
                      </div>
                    </div>
                  </div>
                </div>

                {clinicMsg && (
                  <p className="text-xs text-muted-foreground" role="status">
                    {clinicMsg}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={savingClinic}
                  className="w-full min-h-11 font-medium"
                >
                  {savingClinic ? "Criando consultório…" : "Salvar consultório"}
                </Button>
              </form>
            </Card>

            {/* Lista de Consultórios Cadastrados */}
            <div>
              {clinics.isLoading ? (
                <Card className="p-6 text-sm text-muted-foreground">Carregando consultórios…</Card>
              ) : list.length === 0 ? (
                <Card className="p-6 text-sm text-muted-foreground">
                  Nenhum consultório cadastrado ainda.
                </Card>
              ) : (
                <StaggerGroup className="grid gap-3 sm:grid-cols-2">
                  {list.map((c) => (
                    <StaggerItem key={c.id}>
                      <Card className="flex h-full flex-col justify-between p-4 sm:p-5 transition-shadow hover:shadow-sm">
                        <div>
                          <div className="flex items-start gap-3">
                            <span
                              className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-bold shadow-sm"
                              style={{
                                background: c.primary_color ?? "var(--primary)",
                                color: c.accent_color ?? "var(--primary-foreground)",
                              }}
                            >
                              {c.name.slice(0, 1).toUpperCase()}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="truncate font-serif text-sm sm:text-base font-semibold">
                                  {c.name}
                                </h3>
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium shrink-0 ${
                                    c.is_active
                                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                      : "border-border bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {c.is_active ? "Ativo" : "Inativo"}
                                </span>
                                {c.staff_count === 0 && (
                                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 shrink-0 dark:text-amber-400">
                                    Sem acesso criado
                                  </span>
                                )}
                              </div>
                              <p className="truncate text-xs text-muted-foreground mt-0.5 font-mono">
                                /{c.slug} · {c.staff_count} profissional(is)
                              </p>
                              {c.contact_email && (
                                <p className="mt-1 truncate text-xs text-muted-foreground">
                                  {c.contact_email}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Fileira 1 — ações primárias, sempre as mesmas 3, nunca condicional
                            (inserir/remover um botão aqui já quebrou a altura dos cards uma vez). */}
                        <div className="mt-4 flex flex-col gap-2 pt-2 border-t border-border/60 sm:flex-row">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingClinicId(c.id)}
                            className="min-h-10 flex-1 gap-1.5 text-xs font-medium"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </Button>
                          <Button
                            variant={c.staff_count === 0 ? "default" : "outline"}
                            size="sm"
                            onClick={() => setManagerAccessClinicId(c.id)}
                            className="min-h-10 flex-1 gap-1.5 text-xs font-medium"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            {c.staff_count === 0 ? "Criar acesso do gestor" : "Novo acesso"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopiarLink(c.slug, c.id)}
                            className="min-h-10 flex-1 gap-1.5 text-xs font-medium"
                          >
                            {copiadoId === c.id ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                Copiado!
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                Copiar link
                              </>
                            )}
                          </Button>
                        </div>

                        {/* Fileira 2 — ações secundárias, largura própria, sempre presentes
                            (flex-wrap evita que sumam quando o card é mais estreito). */}
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="h-8 gap-1.5 px-2 text-xs"
                          >
                            <a href={`/${c.slug}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" />
                              Ver landing
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              await toggleClinic({
                                data: { clinic_id: c.id, is_active: !c.is_active },
                              });
                              await queryClient.invalidateQueries({
                                queryKey: ["admin-clinics"],
                              });
                            }}
                            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                          >
                            {c.is_active ? "Desativar" : "Reativar"}
                          </Button>
                        </div>
                      </Card>

                      <ClinicEditDialog
                        clinic={c}
                        open={editingClinicId === c.id}
                        onOpenChange={(open) => setEditingClinicId(open ? c.id : null)}
                      />
                      <ManagerAccessDialog
                        clinic={c}
                        open={managerAccessClinicId === c.id}
                        onOpenChange={(open) => setManagerAccessClinicId(open ? c.id : null)}
                      />
                    </StaggerItem>
                  ))}
                </StaggerGroup>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ABA: EQUIPE MÉDICA */}
        <TabsContent value="equipe" className="mt-4">
          {/* Botão de Toggle para Mobile */}
          <div className="mb-4 lg:hidden">
            <Button
              variant="outline"
              onClick={() => setNovoAcessoAberto(!novoAcessoAberto)}
              className="w-full min-h-11 justify-between gap-2 border-primary/30 bg-primary/5 text-primary"
            >
              <span className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Vincular novo profissional
              </span>
              {novoAcessoAberto ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
            {/* Formulário Novo Acesso */}
            <Card className={`p-4 sm:p-5 ${novoAcessoAberto ? "block" : "hidden lg:block"}`}>
              <h2 className="font-serif text-base sm:text-lg font-semibold">Novo acesso</h2>
              <p className="text-xs text-muted-foreground">
                Se o e-mail ainda não tiver conta, o acesso é criado com a senha provisória
                informada.
              </p>
              <form onSubmit={handleAddStaff} className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="s-email" className="text-xs">
                    E-mail do profissional *
                  </Label>
                  <Input
                    id="s-email"
                    type="email"
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    placeholder="medico@clinica.com"
                    required
                    className="h-10 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="s-clinic" className="text-xs">
                    Consultório vinculado
                  </Label>
                  <select
                    id="s-clinic"
                    value={staffClinic}
                    onChange={(e) => setStaffClinic(e.target.value)}
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Todos (acesso global)</option>
                    {list.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="s-role" className="text-xs">
                    Papel de acesso
                  </Label>
                  <select
                    id="s-role"
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value as "admin" | "doctor" | "staff")}
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="doctor">Médico(a)</option>
                    <option value="staff">Equipe de Apoio / Recepção</option>
                    <option value="admin">
                      {staffClinic
                        ? "Gestor(a) deste consultório"
                        : "Administrador Geral da plataforma (todas as clínicas)"}
                    </option>
                  </select>
                  {staffRole === "admin" && !staffClinic && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                      Acesso irrestrito a todas as clínicas — para o gestor de UM consultório só,
                      selecione o consultório acima antes de escolher este papel.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="s-pass" className="text-xs">
                    Senha provisória (opcional)
                  </Label>
                  <Input
                    id="s-pass"
                    type="text"
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    minLength={8}
                    className="h-10 text-sm"
                  />
                </div>

                {staffMsg && (
                  <p className="text-xs text-muted-foreground" role="status">
                    {staffMsg}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={savingStaff}
                  className="w-full min-h-11 font-medium"
                >
                  {savingStaff ? "Vinculando…" : "Vincular profissional"}
                </Button>
              </form>
            </Card>

            {/* Lista de Membros da Equipe */}
            <Card className="overflow-hidden">
              <div className="border-b border-border bg-muted/20 px-4 py-3 sm:px-5">
                <h3 className="font-serif text-sm sm:text-base font-semibold">Equipe com acesso</h3>
                <p className="text-xs text-muted-foreground">
                  Profissionais vinculados aos consultórios.
                </p>
              </div>

              {staff.isLoading ? (
                <div className="p-6 text-sm text-muted-foreground">Carregando equipe…</div>
              ) : staffList.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">
                  Nenhum profissional vinculado.
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {staffList.map((s) => (
                    <li
                      key={`${s.user_id}-${s.role}-${s.clinic_id ?? "global"}`}
                      className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-foreground">
                            {s.email ?? s.user_id}
                          </span>
                          <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary shrink-0">
                            {s.role === "admin"
                              ? "Admin"
                              : s.role === "doctor"
                                ? "Médico"
                                : "Equipe"}
                          </span>
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {s.clinic_name ?? "Todos os consultórios"}
                          {s.last_sign_in_at
                            ? ` · último acesso ${new Date(s.last_sign_in_at).toLocaleDateString("pt-BR")}`
                            : " · nunca acessou"}
                        </div>
                      </div>
                      <div className="self-end sm:self-center shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            await removeStaff({
                              data: {
                                user_id: s.user_id,
                                clinic_id: s.clinic_id,
                                role: s.role as "admin" | "doctor" | "staff",
                              },
                            });
                            await queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
                          }}
                          className="h-8 text-xs text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5 sm:hidden" />
                          <span className="hidden sm:inline">Remover</span>
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Perfis Públicos de Médicos na Triagem */}
          <DoctorProfilesCard staffList={staffList} />
        </TabsContent>
      </Tabs>
    </PainelShell>
  );
}
