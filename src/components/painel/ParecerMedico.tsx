import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { addAssessmentNote, listAssessmentNotes } from "@/lib/notes.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ParecerMedico({ assessmentId }: { assessmentId: string }) {
  const list = useServerFn(listAssessmentNotes);
  const add = useServerFn(addAssessmentNote);
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const { data: notes, isLoading } = useQuery({
    queryKey: ["assessment-notes", assessmentId],
    queryFn: () => list({ data: { assessment_id: assessmentId } }),
  });

  const salvar = useMutation({
    mutationFn: () => add({ data: { assessment_id: assessmentId, body: body.trim() } }),
    onSuccess: () => {
      setBody("");
      setErro(null);
      void qc.invalidateQueries({ queryKey: ["assessment-notes", assessmentId] });
    },
    onError: (e) => setErro(e instanceof Error ? e.message : "Não foi possível salvar o parecer."),
  });

  const tooShort = body.trim().length < 3;

  return (
    <Card className="p-4 sm:p-5">
      <h2 className="font-serif text-lg font-semibold">Parecer do médico</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Registre sua avaliação clínica. Cada parecer fica no histórico com autor e data, e a ação é
        registrada na auditoria.
      </p>

      <div className="mt-4 print:hidden">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 5000))}
          rows={5}
          placeholder="Impressão clínica, conduta e encaminhamento…"
          aria-label="Parecer do médico"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{body.trim().length}/5000</span>
          <Button size="sm" disabled={tooShort || salvar.isPending} onClick={() => salvar.mutate()}>
            {salvar.isPending ? "Salvando…" : "Salvar parecer"}
          </Button>
        </div>
        {erro && <p className="mt-2 text-sm text-destructive">{erro}</p>}
      </div>

      <div className="mt-5 space-y-3">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Histórico de pareceres
        </div>
        {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {!isLoading && (notes ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum parecer registrado.</p>
        )}
        {(notes ?? []).map((n) => (
          <div key={n.id} className="rounded-md border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{n.author_email ?? "Profissional"}</span>
              <span>{new Date(n.created_at).toLocaleString("pt-BR")}</span>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm text-foreground/90">{n.body}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
