import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FadeIn } from "@/components/motion/primitives";
import { isAccessDenied, accessDeniedMessage } from "@/lib/access-error";
import {
  listDoctorProfilesAdmin,
  upsertDoctorProfileAdmin,
  type AdminStaff,
} from "@/lib/admin.functions";
import { DoctorProfileEditor } from "@/components/admin/DoctorProfileEditor";

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

type DoctorProfilesCardProps = {
  staffList: AdminStaff[];
};

export function DoctorProfilesCard({ staffList }: DoctorProfilesCardProps) {
  const queryClient = useQueryClient();
  const fetchProfiles = useServerFn(listDoctorProfilesAdmin);
  const saveProfile = useServerFn(upsertDoctorProfileAdmin);

  const {
    data: profiles,
    isLoading,
    error,
  } = useQuery({
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
      !(profiles ?? []).some((p) => p.user_id === m.user_id && p.clinic_id === m.clinic_id),
  );

  async function adicionar() {
    const alvo = candidatos.find((c) => `${c.user_id}:${c.clinic_id}` === novoSel);
    if (!alvo || !alvo.clinic_id) return;
    setSavingNew(true);
    setMsgNew(null);
    try {
      await saveProfile({
        data: {
          clinic_id: alvo.clinic_id,
          user_id: alvo.user_id,
          display_name: novoNome.trim() || nomeSugerido(alvo.email) || "Profissional",
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
      <Card className="mt-6 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <h2 className="font-serif text-base sm:text-lg font-semibold">
              Lista pública de médicos na triagem
            </h2>
            <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground">
              Quem aparece para o paciente escolher no início da pré-avaliação (ex.: "Dr. José
              Ribamar Fernandes Saraiva Junior").
            </p>
          </div>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            {(profiles ?? []).filter((p) => p.is_listed).length} listado(s)
          </span>
        </div>

        {isLoading && (
          <p className="mt-4 text-xs text-muted-foreground">Carregando perfis médicos…</p>
        )}
        {error && (
          <p className="mt-4 text-xs text-destructive">
            {error instanceof Error ? error.message : "Erro ao carregar."}
          </p>
        )}

        <div className="mt-4 space-y-3">
          {(profiles ?? []).map((p) => (
            <DoctorProfileEditor key={p.id} profile={p} />
          ))}
          {profiles && profiles.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Nenhum médico configurado para escolha pública ainda.
            </p>
          )}
        </div>

        {candidatos.length > 0 && (
          <div className="mt-5 rounded-xl border border-dashed border-border bg-muted/20 p-3 sm:p-4">
            <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Adicionar médico à lista pública
            </div>
            <div className="mt-3 grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
                className="h-10 rounded-xl border border-input bg-background px-3 text-xs"
              >
                <option value="">Selecionar profissional…</option>
                {candidatos.map((c) => (
                  <option key={`${c.user_id}:${c.clinic_id}`} value={`${c.user_id}:${c.clinic_id}`}>
                    {c.email ?? c.user_id} · {c.clinic_name ?? ""}
                  </option>
                ))}
              </select>
              <Input
                aria-label="Nome público"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="Nome público (ex.: Dr. José Saraiva)"
                maxLength={120}
                className="h-10 text-xs"
              />
              <Input
                aria-label="Especialidade"
                value={novaEspecialidade}
                onChange={(e) => setNovaEspecialidade(e.target.value)}
                placeholder="Especialidade (ex.: Psiquiatria Clínica)"
                maxLength={120}
                className="h-10 text-xs"
              />
              <Button
                onClick={() => void adicionar()}
                disabled={!novoSel || savingNew}
                className="min-h-10 text-xs font-medium"
              >
                {savingNew ? "Adicionando…" : "Adicionar à lista"}
              </Button>
            </div>
            {msgNew && <p className="mt-2 text-xs text-destructive">{msgNew}</p>}
          </div>
        )}
      </Card>
    </FadeIn>
  );
}
