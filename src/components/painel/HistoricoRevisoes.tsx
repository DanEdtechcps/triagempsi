import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAssessmentNotes } from "@/lib/notes.functions";
import { loadReviewed } from "@/lib/review-queue";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PREFIXO = "[Revisão]";

/**
 * Histórico de revisões da triagem: quem revisou, quando e as observações
 * registradas no momento da marcação, além do meu status nesta sessão.
 */
export function HistoricoRevisoes({ assessmentId }: { assessmentId: string }) {
  const list = useServerFn(listAssessmentNotes);
  const [meuStatus, setMeuStatus] = useState(false);

  useEffect(() => {
    setMeuStatus(loadReviewed().includes(assessmentId));
  }, [assessmentId]);

  const { data: notes, isLoading } = useQuery({
    queryKey: ["assessment-notes", assessmentId],
    queryFn: () => list({ data: { assessment_id: assessmentId } }),
  });

  const revisoes = (notes ?? [])
    .filter((n) => n.body.trim().startsWith(PREFIXO))
    .map((n) => ({
      ...n,
      observacao: n.body.trim().slice(PREFIXO.length).trim(),
    }));

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-serif text-lg font-semibold">Histórico de revisões</h2>
        <Badge variant={meuStatus ? "default" : "outline"}>
          {meuStatus ? "Revisada por mim nesta sessão" : "Não revisada por mim"}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Cada marcação de "revisado" com observações fica registrada aqui com autor e data.
      </p>

      <div className="mt-4 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {!isLoading && revisoes.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma revisão registrada até o momento.</p>
        )}
        {revisoes.map((r) => (
          <div key={r.id} className="rounded-md border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">
                {r.author_email ?? "Profissional"}
              </span>
              <span>{new Date(r.created_at).toLocaleString("pt-BR")}</span>
            </div>
            {r.observacao && (
              <p className="mt-2 whitespace-pre-line text-sm text-foreground/90">{r.observacao}</p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
