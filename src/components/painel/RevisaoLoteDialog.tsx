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

type RevisaoLoteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quantidade: number;
  nota: string;
  onNotaChange: (nota: string) => void;
  salvando: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
};

/** Diálogo de confirmação para marcar várias triagens como revisadas de uma vez. */
export function RevisaoLoteDialog({
  open,
  onOpenChange,
  quantidade,
  nota,
  onNotaChange,
  salvando,
  onCancelar,
  onConfirmar,
}: RevisaoLoteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !salvando && onOpenChange(v)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marcar triagens como revisadas</DialogTitle>
          <DialogDescription>
            {quantidade} triagem(ns) serão marcadas como revisadas. Confirme antes de salvar. A
            observação abaixo é opcional e será registrada no histórico de pareceres de cada
            triagem.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={nota}
          onChange={(e) => onNotaChange(e.target.value.slice(0, 5000))}
          rows={4}
          placeholder="Observações da revisão (opcional)"
          disabled={salvando}
        />

        <DialogFooter>
          <Button variant="ghost" onClick={onCancelar} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={onConfirmar} disabled={salvando}>
            {salvando ? "Salvando…" : `Confirmar ${quantidade} revisão(ões)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
