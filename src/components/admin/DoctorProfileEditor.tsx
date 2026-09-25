import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  upsertDoctorProfileAdmin,
  removeDoctorProfileAdmin,
  type DoctorProfileRow,
} from "@/lib/admin.functions";

type DoctorProfileEditorProps = {
  profile: DoctorProfileRow;
};

export function DoctorProfileEditor({ profile }: DoctorProfileEditorProps) {
  const queryClient = useQueryClient();
  const saveProfile = useServerFn(upsertDoctorProfileAdmin);
  const removeProfile = useServerFn(removeDoctorProfileAdmin);
  const [nome, setNome] = useState(profile.display_name);
  const [especialidade, setEspecialidade] = useState(profile.specialty ?? "");
  const [listado, setListado] = useState(profile.is_listed);
  const [busy, setBusy] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function salvar() {
    setBusy(true);
    setMsg(null);
    setSalvo(false);
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
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2500);
      await queryClient.invalidateQueries({ queryKey: ["doctor-profiles"] });
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function remover() {
    if (!window.confirm(`Remover ${profile.display_name} da lista pública de escolha?`)) return;
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
    <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 min-w-0">
          <UserCheck className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="font-medium text-foreground truncate">
            {profile.email ?? profile.user_id}
          </span>
          {profile.clinic_name && <span className="truncate">· {profile.clinic_name}</span>}
        </div>
        {!listado && (
          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px]">
            Oculto da triagem
          </span>
        )}
      </div>

      <div className="mt-3 grid gap-2.5 grid-cols-1 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]">
        <Input
          aria-label="Nome público"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={120}
          className="h-10 text-xs"
          placeholder="Nome exibido para o paciente"
        />
        <Input
          aria-label="Especialidade"
          value={especialidade}
          onChange={(e) => setEspecialidade(e.target.value)}
          placeholder="Especialidade (ex: Psiquiatria Clínica)"
          maxLength={120}
          className="h-10 text-xs"
        />
        <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground">
          <input
            type="checkbox"
            checked={listado}
            onChange={(e) => setListado(e.target.checked)}
            className="h-4 w-4 rounded accent-primary cursor-pointer"
          />
          <span className="select-none">Visível na triagem</span>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          onClick={() => void salvar()}
          disabled={busy || nome.trim().length < 2}
          className="min-h-9 px-3 text-xs font-medium"
        >
          {busy ? "Salvando…" : salvo ? "✓ Salvo!" : "Salvar"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void remover()}
          disabled={busy}
          className="min-h-9 px-3 text-xs text-muted-foreground hover:text-destructive"
        >
          Remover
        </Button>
        {msg && <span className="text-xs text-destructive">{msg}</span>}
      </div>
    </div>
  );
}
