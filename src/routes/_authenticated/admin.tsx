import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PainelShell } from "@/components/painel/PainelShell";
import { AcessoNegado } from "@/components/painel/AcessoNegado";
import { LandingSettingsForm } from "@/components/painel/LandingSettingsForm";

import { isAccessDenied, accessDeniedMessage } from "@/lib/access-error";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FadeIn, StaggerGroup, StaggerItem } from "@/components/motion/primitives";
import {
  addStaffAdmin,
  createClinicAdmin,
  listClinicsAdmin,
  listStaffAdmin,
  removeStaffAdmin,
  setClinicActiveAdmin,
  listDoctorProfilesAdmin,
  upsertDoctorProfileAdmin,
  removeDoctorProfileAdmin,
  type AdminStaff,
  type DoctorProfileRow,
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
  const [savingClinic, setSavingClinic] = useState(false);
  const [clinicMsg, setClinicMsg] = useState<string | null>(null);

  const [staffEmail, setStaffEmail] = useState("");
  const [staffRole, setStaffRole] = useState<"admin" | "doctor" | "staff">("doctor");
  const [staffClinic, setStaffClinic] = useState<string>("");
  const [staffPassword, setStaffPassword] = useState("");
  const [savingStaff, setSavingStaff] = useState(false);
  const [staffMsg, setStaffMsg] = useState<string | null>(null);

  const list = clinics.data ?? [];
  const activeCount = useMemo(() => list.filter((c) => c.is_active).length, [list]);
  const staffList = staff.data ?? [];

  async function handleCreateClinic(e: React.FormEvent) {
    e.preventDefault();
    setClinicMsg(null);
    const finalSlug = slugTouched ? slugify(slug) : slugify(name);
    if (!finalSlug) {
      setClinicMsg("Informe um nome válido para gerar o endereço.");
      return;
    }
    setSavingClinic(true);
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
        },
      });
      setName("");
      setSlug("");
      setSlugTouched(false);
      setTagline("");
      setContactEmail("");
      setContactPhone("");
      setClinicMsg("Consultório criado com sucesso.");
      await queryClient.invalidateQueries({ queryKey: ["admin-clinics"] });
    } catch (err) {
      setClinicMsg(
        isAccessDenied(err)
          ? accessDeniedMessage(err)
          : err instanceof Error
            ? err.message
            : "Não foi possível criar o consultório.",
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
            ? "Acesso criado e vinculado. Combine a senha provisória com o profissional."
            : "Profissional já existente vinculado ao consultório.",
      );
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
            <h1 className="mt-1 font-serif text-2xl font-semibold sm:text-3xl">
              Consultórios e equipe
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Cadastre unidades com identidade visual própria e conceda acesso aos médicos.
              Cada profissional enxerga apenas as triagens do consultório em que está vinculado.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Stat label="Consultórios" value={list.length} />
              <Stat label="Ativos" value={activeCount} />
              <Stat label="Vínculos de equipe" value={staffList.length} />
            </div>
            <div className="mt-5">
              <Button variant="outline" asChild>
                <Link to="/comercial">Abrir visão comercial</Link>
              </Button>
            </div>
          </div>
        </section>
      </FadeIn>

      <Tabs defaultValue="consultorios" className="mt-6">
        <TabsList>
          <TabsTrigger value="consultorios">Consultórios</TabsTrigger>
          <TabsTrigger value="equipe">Equipe médica</TabsTrigger>
          <TabsTrigger value="landing">Landing</TabsTrigger>
        </TabsList>

        <TabsContent value="landing" className="mt-4">
          <LandingSettingsForm />
        </TabsContent>


        <TabsContent value="consultorios" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
            <Card className="p-5">
              <h2 className="font-serif text-lg font-semibold">Novo consultório</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                O endereço público fica em <code className="text-xs">/seu-slug</code>.
              </p>
              <form onSubmit={handleCreateClinic} className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="c-name">Nome</Label>
                  <Input
                    id="c-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Clínica Ser Psiquiatria"
                    required
                    maxLength={120}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-slug">Endereço (slug)</Label>
                  <Input
                    id="c-slug"
                    value={slugTouched ? slug : slugify(name)}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setSlug(e.target.value);
                    }}
                    placeholder="ser-psiquiatria"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-tagline">Frase de apresentação</Label>
                  <Input
                    id="c-tagline"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="Cuidado em saúde mental"
                    maxLength={160}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="c-email">E-mail de contato</Label>
                    <Input
                      id="c-email"
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="contato@clinica.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="c-phone">Telefone</Label>
                    <Input
                      id="c-phone"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="(11) 99999-8888"
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
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

                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">Prévia da marca</p>
                  <div className="mt-3 flex items-center gap-3">
                    <span
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold"
                      style={{ background: primary, color: accent }}
                    >
                      {(name || "C").slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-serif text-sm font-semibold">
                        {name || "Nome do consultório"}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {tagline || "Frase de apresentação"}
                      </div>
                    </div>
                  </div>
                </div>

                {clinicMsg && (
                  <p className="text-sm text-muted-foreground" role="status">
                    {clinicMsg}
                  </p>
                )}
                <Button type="submit" disabled={savingClinic} className="w-full">
                  {savingClinic ? "Criando…" : "Criar consultório"}
                </Button>
              </form>
            </Card>

            <div>
              {clinics.isLoading ? (
                <Card className="p-6 text-sm text-muted-foreground">Carregando…</Card>
              ) : list.length === 0 ? (
                <Card className="p-6 text-sm text-muted-foreground">
                  Nenhum consultório cadastrado ainda.
                </Card>
              ) : (
                <StaggerGroup className="grid gap-3 sm:grid-cols-2">
                  {list.map((c) => (
                    <StaggerItem key={c.id}>
                      <Card className="h-full p-4">
                        <div className="flex items-start gap-3">
                          <span
                            className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold"
                            style={{
                              background: c.primary_color ?? "var(--primary)",
                              color: c.accent_color ?? "var(--primary-foreground)",
                            }}
                          >
                            {c.name.slice(0, 1).toUpperCase()}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="truncate font-medium">{c.name}</h3>
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[11px] ${
                                  c.is_active
                                    ? "border-primary/30 bg-primary/10 text-primary"
                                    : "border-border bg-muted text-muted-foreground"
                                }`}
                              >
                                {c.is_active ? "Ativo" : "Inativo"}
                              </span>
                            </div>
                            <p className="truncate text-xs text-muted-foreground">
                              /{c.slug} · {c.staff_count} profissional(is)
                            </p>
                            {c.contact_email && (
                              <p className="mt-1 truncate text-xs text-muted-foreground">
                                {c.contact_email}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              await toggleClinic({
                                data: { clinic_id: c.id, is_active: !c.is_active },
                              });
                              await queryClient.invalidateQueries({
                                queryKey: ["admin-clinics"],
                              });
                            }}
                          >
                            {c.is_active ? "Desativar" : "Reativar"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              navigator.clipboard?.writeText(
                                `${window.location.origin}/${c.slug}`,
                              )
                            }
                          >
                            Copiar link
                          </Button>
                        </div>
                      </Card>
                    </StaggerItem>
                  ))}
                </StaggerGroup>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="equipe" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
            <Card className="p-5">
              <h2 className="font-serif text-lg font-semibold">Novo acesso</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Se o e-mail ainda não tiver conta, o acesso é criado com a senha provisória.
              </p>
              <form onSubmit={handleAddStaff} className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="s-email">E-mail do profissional</Label>
                  <Input
                    id="s-email"
                    type="email"
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    placeholder="medico@clinica.com"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-clinic">Consultório</Label>
                  <select
                    id="s-clinic"
                    value={staffClinic}
                    onChange={(e) => setStaffClinic(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
                  <Label htmlFor="s-role">Papel</Label>
                  <select
                    id="s-role"
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value as "admin" | "doctor" | "staff")}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="doctor">Médico</option>
                    <option value="staff">Equipe / Apoio</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-pass">Senha provisória (opcional)</Label>
                  <Input
                    id="s-pass"
                    type="text"
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    minLength={8}
                  />
                </div>
                {staffMsg && (
                  <p className="text-sm text-muted-foreground" role="status">
                    {staffMsg}
                  </p>
                )}
                <Button type="submit" disabled={savingStaff} className="w-full">
                  {savingStaff ? "Vinculando…" : "Vincular profissional"}
                </Button>
              </form>
            </Card>

            <Card className="overflow-hidden">
              {staff.isLoading ? (
                <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
              ) : staffList.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">
                  Nenhum profissional vinculado.
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {staffList.map((s) => (
                    <li
                      key={`${s.user_id}-${s.role}-${s.clinic_id ?? "global"}`}
                      className="flex flex-wrap items-center justify-between gap-3 p-4"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {s.email ?? s.user_id}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {s.role === "admin" ? "Administrador" : s.role === "doctor" ? "Médico" : "Equipe"} ·{" "}
                          {s.clinic_name ?? "Todos os consultórios"}
                          {s.last_sign_in_at
                            ? ` · último acesso ${new Date(s.last_sign_in_at).toLocaleDateString("pt-BR")}`
                            : " · nunca acessou"}
                        </div>
                      </div>
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
                      >
                        Remover
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <DoctorProfilesCard staffList={staffList} />
        </TabsContent>
      </Tabs>
    </PainelShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-4">
      <div className="font-serif text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

/** Sugere um nome público a partir do e-mail do profissional. */
function nomeSugerido(email: string | null) {
  if (!email) return "";
  const base = email
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .trim();
  return base
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

function DoctorProfilesCard({ staffList }: { staffList: AdminStaff[] }) {
  const queryClient = useQueryClient();
  const fetchProfiles = useServerFn(listDoctorProfilesAdmin);
  const saveProfile = useServerFn(upsertDoctorProfileAdmin);

  const { data: profiles, isLoading, error } = useQuery({
    queryKey: ["doctor-profiles"],
    queryFn: () => fetchProfiles({}),
    retry: false,
  });

  const [novoSel, setNovoSel] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [novaEspecialidade, setNovaEspecialidade] = useState("");
  const [savingNew, setSavingNew] = useState(false);
  const [msgNew, setMsgNew] = useState<string | null>(null);

  // Médicos com vínculo em consultório que ainda não têm perfil público
  const candidatos = staffList.filter(
    (m) =>
      m.role === "doctor" &&
      m.clinic_id &&
      !(profiles ?? []).some(
        (p) => p.user_id === m.user_id && p.clinic_id === m.clinic_id,
      ),
  );

  async function adicionar() {
    const alvo = candidatos.find(
      (c) => `${c.user_id}:${c.clinic_id}` === novoSel,
    );
    if (!alvo || !alvo.clinic_id) return;
    setSavingNew(true);
    setMsgNew(null);
    try {
      await saveProfile({
        data: {
          clinic_id: alvo.clinic_id,
          user_id: alvo.user_id,
          display_name:
            novoNome.trim() || nomeSugerido(alvo.email) || "Profissional",
          specialty: novaEspecialidade.trim() || null,
          is_listed: true,
        },
      });
      setNovoSel("");
      setNovoNome("");
      setNovaEspecialidade("");
      await queryClient.invalidateQueries({ queryKey: ["doctor-profiles"] });
    } catch (err) {
      setMsgNew(
        isAccessDenied(err)
          ? accessDeniedMessage(err)
          : err instanceof Error
            ? err.message
            : "Não foi possível adicionar.",
      );
    } finally {
      setSavingNew(false);
    }
  }

  return (
    <FadeIn delay={0.1}>
      <Card className="mt-6 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg font-semibold">
              Lista pública de médicos
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Quem aparece para o paciente escolher no início da triagem. O nome
              público pode ser diferente do e-mail de acesso (ex.: "Dr. José
              Saraiva Jr.").
            </p>
          </div>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            {(profiles ?? []).filter((p) => p.is_listed).length} ativo(s)
          </span>
        </div>

        {isLoading && (
          <p className="mt-4 text-sm text-muted-foreground">
            Carregando perfis…
          </p>
        )}
        {error && (
          <p className="mt-4 text-sm text-destructive">
            {error instanceof Error ? error.message : "Erro ao carregar."}
          </p>
        )}

        <div className="mt-4 space-y-3">
          {(profiles ?? []).map((p) => (
            <DoctorProfileEditor key={p.id} profile={p} />
          ))}
          {profiles && profiles.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum perfil público ainda. Adicione abaixo para que o paciente
              possa escolher o médico na triagem.
            </p>
          )}
        </div>

        {candidatos.length > 0 && (
          <div className="mt-5 rounded-xl border border-dashed border-border bg-background/60 p-4">
            <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Adicionar médico à lista pública
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <select
                aria-label="Profissional"
                value={novoSel}
                onChange={(e) => {
                  setNovoSel(e.target.value);
                  const alvo = candidatos.find(
                    (c) => `${c.user_id}:${c.clinic_id}` === e.target.value,
                  );
                  if (alvo && !novoNome) setNovoNome(nomeSugerido(alvo.email));
                }}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Selecionar profissional…</option>
                {candidatos.map((c) => (
                  <option
                    key={`${c.user_id}:${c.clinic_id}`}
                    value={`${c.user_id}:${c.clinic_id}`}
                  >
                    {c.email ?? c.user_id} · {c.clinic_name ?? ""}
                  </option>
                ))}
              </select>
              <Input
                aria-label="Nome público"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="Nome público (ex.: Dr. José)"
                maxLength={120}
              />
              <Input
                aria-label="Especialidade"
                value={novaEspecialidade}
                onChange={(e) => setNovaEspecialidade(e.target.value)}
                placeholder="Especialidade (ex.: Psiquiatria)"
                maxLength={120}
              />
              <Button
                onClick={() => void adicionar()}
                disabled={!novoSel || savingNew}
              >
                {savingNew ? "Adicionando…" : "Adicionar à lista"}
              </Button>
            </div>
            {msgNew && <p className="mt-2 text-sm text-destructive">{msgNew}</p>}
          </div>
        )}
      </Card>
    </FadeIn>
  );
}

function DoctorProfileEditor({ profile }: { profile: DoctorProfileRow }) {
  const queryClient = useQueryClient();
  const saveProfile = useServerFn(upsertDoctorProfileAdmin);
  const removeProfile = useServerFn(removeDoctorProfileAdmin);
  const [nome, setNome] = useState(profile.display_name);
  const [especialidade, setEspecialidade] = useState(profile.specialty ?? "");
  const [listado, setListado] = useState(profile.is_listed);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function salvar() {
    setBusy(true);
    setMsg(null);
    try {
      await saveProfile({
        data: {
          clinic_id: profile.clinic_id,
          user_id: profile.user_id,
          display_name: nome.trim(),
          specialty: especialidade.trim() || null,
          is_listed: listado,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["doctor-profiles"] });
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function remover() {
    if (
      !window.confirm(
        `Remover ${profile.display_name} da lista pública de escolha?`,
      )
    )
      return;
    setBusy(true);
    setMsg(null);
    try {
      await removeProfile({ data: { id: profile.id } });
      await queryClient.invalidateQueries({ queryKey: ["doctor-profiles"] });
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Erro ao remover.");
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-background/50 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          {profile.email ?? profile.user_id}
        </span>
        {profile.clinic_name && <span>· {profile.clinic_name}</span>}
        {!listado && (
          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px]">
            oculto da triagem
          </span>
        )}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <Input
          aria-label="Nome público"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={120}
        />
        <Input
          aria-label="Especialidade"
          value={especialidade}
          onChange={(e) => setEspecialidade(e.target.value)}
          placeholder="Especialidade"
          maxLength={120}
        />
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={listado}
            onChange={(e) => setListado(e.target.checked)}
            className="h-4 w-4 accent-[hsl(var(--primary))]"
          />
          Visível na triagem
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => void salvar()} disabled={busy || nome.trim().length < 2}>
          {busy ? "Salvando…" : "Salvar"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void remover()}
          disabled={busy}
        >
          Remover da lista
        </Button>
        {msg && <span className="text-sm text-destructive">{msg}</span>}
      </div>
    </div>
  );
}

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded-md border border-input bg-background p-1"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1" />
      </div>
    </div>
  );
}
