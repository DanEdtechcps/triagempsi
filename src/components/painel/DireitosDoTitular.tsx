import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getMyAccess } from "@/lib/painel.functions";
import { exerciseSubjectRights } from "@/lib/titular.functions";
import { SUBJECT_MODE_LABEL, type SubjectMode } from "@/lib/titular";

/**
 * Direitos do titular (LGPD art. 18): anonimizar ou excluir os dados de uma
 * pessoa. Só aparece para administrador — a checagem real é no servidor.
 */
export function DireitosDoTitular({ assessmentId }: { assessmentId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchAccess = useServerFn(getMyAccess);
  const exercise = useServerFn(exerciseSubjectRights);
  const [busy, setBusy] = useState<SubjectMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: access } = useQuery({ queryKey: ["my-access"], queryFn: () => fetchAccess() });
  if (!access?.isAdmin) return null;

  async function run(mode: SubjectMode) {
    setBusy(mode);
    setError(null);
    try {
      await exercise({ data: { assessment_id: assessmentId, mode, confirm: true } });
      await qc.invalidateQueries();
      await navigate({ to: "/painel" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível concluir a operação.");
      setBusy(null);
    }
  }

  return (
    <Card className="border-destructive/30 p-5">
      <h2 className="text-sm font-semibold">Direitos do titular (LGPD)</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Use quando o paciente pedir a eliminação dos próprios dados. Vale para <strong>todas as
        triagens</strong> dessa pessoa nesta clínica (mesmo e-mail). A ação fica registrada na
        auditoria, sem dados pessoais.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(["anonimizar", "excluir"] as const).map((mode) => (
          <AlertDialog key={mode}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={busy !== null}>
                {SUBJECT_MODE_LABEL[mode].title}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{SUBJECT_MODE_LABEL[mode].title}?</AlertDialogTitle>
                <AlertDialogDescription>{SUBJECT_MODE_LABEL[mode].confirm}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => void run(mode)}>Confirmar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ))}
      </div>
      {busy && <p className="mt-3 text-xs text-muted-foreground" role="status">Processando…</p>}
      {error && (
        <p className="mt-3 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </Card>
  );
}
