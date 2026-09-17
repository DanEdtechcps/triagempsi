import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { addAssessmentNote } from "@/lib/notes.functions";
import { Button } from "@/components/ui/button";
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
  loadReviewQueue,
  loadReviewed,
  toggleReviewed,
} from "@/lib/review-queue";

/** Barra de revisão em lote: posição na fila, anterior/próxima e "revisado". */
export function QueueNav({ id }: { id: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const add = useServerFn(addAssessmentNote);
  const [ids, setIds] = useState<string[]>([]);
  const [label, setLabel] = useState("");
  const [revisados, setRevisados] = useState<string[]>([]);
  const [aberto, setAberto] = useState(false);
  const [avançar, setAvançar] = useState(false);
  const [nota, setNota] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const q = loadReviewQueue();
    setIds(q?.ids ?? []);
    setLabel(q?.label ?? "");
    setRevisados(loadReviewed());
  }, []);

  const idx = ids.indexOf(id);
  const anterior = idx > 0 ? ids[idx - 1] : null;
  const próxima = idx >= 0 && idx < ids.length - 1 ? ids[idx + 1] : null;
  const feito = revisados.includes(id);

  const salvar = useMutation({
    mutationFn: async () => {
      const body = nota.trim();
      if (body.length >= 3) {
        await add({
          data: { assessment_id: id, body: `[Revisão] ${body}` },
        });
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["assessment-notes", id] });
      if (!feito) setRevisados(toggleReviewed(id));
      setAberto(false);
      setNota("");
      setErro(null);
      if (avançar && próxima) {
        navigate({ to: "/painel/$id", params: { id: próxima } });
      }
    },
    onError: (e) =>
      setErro(e instanceof Error ? e.message : "Não foi possível salvar a nota."),
  });

  function abrir(comAvanço: boolean) {
    setAvançar(comAvanço);
    setErro(null);
    setNota("");
    setAberto(true);
  }

  function marcar(comAvanço: boolean) {
    if (feito) {
      // Já revisada: apenas desmarca (ou avança) sem pedir nota.
      if (comAvanço) {
        if (próxima) navigate({ to: "/painel/$id", params: { id: próxima } });
      } else {
        setRevisados(toggleReviewed(id));
      }
      return;
    }
    abrir(comAvanço);
  }

  const notaCurta = nota.trim().length > 0 && nota.trim().length < 3;



  // Atalhos: J / → próxima, K / ← anterior, R marcar revisado,
  // Shift+R revisado e próxima. No diálogo, Ctrl/Cmd+Enter confirma.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const alvo = e.target as HTMLElement | null;
      const digitando =
        !!alvo &&
        (alvo.tagName === "INPUT" ||
          alvo.tagName === "TEXTAREA" ||
          alvo.isContentEditable);

      if (aberto) {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          if (!salvar.isPending && !notaCurta) salvar.mutate();
        }
        return;
      }
      if (digitando || e.metaKey || e.ctrlKey || e.altKey) return;

      const k = e.key.toLowerCase();
      if (k === "j" || e.key === "ArrowRight") {
        if (próxima) {
          e.preventDefault();
          navigate({ to: "/painel/$id", params: { id: próxima } });
        }
      } else if (k === "k" || e.key === "ArrowLeft") {
        if (anterior) {
          e.preventDefault();
          navigate({ to: "/painel/$id", params: { id: anterior } });
        }
      } else if (k === "r") {
        e.preventDefault();
        marcar(e.shiftKey);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });


  const dialog = (
    <Dialog open={aberto} onOpenChange={(v) => !salvar.isPending && setAberto(v)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marcar triagem como revisada</DialogTitle>
          <DialogDescription>
            Registre notas e observações desta revisão (opcional). O texto entra no
            histórico de pareceres com autor, data e registro na auditoria.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Textarea
            value={nota}
            onChange={(e) => setNota(e.target.value.slice(0, 5000))}
            rows={5}
            placeholder="Observações da revisão, pendências e conduta…"
            aria-label="Notas e observações da revisão"
          />
          <div className="mt-2 text-xs text-muted-foreground">
            {nota.trim().length}/5000
          </div>
          {notaCurta && (
            <p className="mt-1 text-xs text-destructive">
              Escreva ao menos 3 caracteres ou deixe em branco.
            </p>
          )}
          {erro && <p className="mt-2 text-sm text-destructive">{erro}</p>}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setAberto(false)}
            disabled={salvar.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => salvar.mutate()}
            disabled={salvar.isPending || notaCurta}
          >
            {salvar.isPending
              ? "Salvando…"
              : avançar
                ? "Salvar e próxima"
                : "Confirmar revisão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (idx < 0 || ids.length < 2) {
    return (
      <div className="mb-4 flex justify-end print:hidden">
        <Button
          variant={feito ? "secondary" : "outline"}
          size="sm"
          onClick={() => marcar(false)}
        >
          {feito ? "Revisado ✓" : "Marcar revisado"}
        </Button>
        {dialog}
      </div>
    );
  }

  return (
    <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border bg-card p-3 print:hidden">
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">
          Revisão {idx + 1} de {ids.length}
        </div>
        {label && (
          <div className="truncate text-xs text-muted-foreground">{label}</div>
        )}
        <div className="mt-1 hidden text-xs text-muted-foreground sm:block">
          Atalhos: <kbd className="rounded border border-border px-1">J</kbd>/
          <kbd className="rounded border border-border px-1">K</kbd> navegar ·{" "}
          <kbd className="rounded border border-border px-1">R</kbd> revisado ·{" "}
          <kbd className="rounded border border-border px-1">Shift+R</kbd> revisado e
          próxima
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button
          variant={feito ? "secondary" : "outline"}
          size="sm"
          onClick={() => marcar(false)}
        >
          {feito ? "Revisado ✓" : "Marcar revisado"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!anterior}
          onClick={() => anterior && navigate({ to: "/painel/$id", params: { id: anterior } })}
        >
          Anterior
        </Button>
        <Button size="sm" disabled={!próxima} onClick={() => marcar(true)}>
          Revisado e próxima
        </Button>
      </div>
      {dialog}
    </div>
  );
}
