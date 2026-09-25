import { Button } from "@/components/ui/button";

type PainelPaginacaoProps = {
  isMobile: boolean;
  paginaAtual: number;
  totalPaginas: number;
  totalItens: number;
  itensExibidos: number;
  inicio: number;
  porPagina: number;
  onCarregarMais: () => void;
  onPaginaAnterior: () => void;
  onProximaPagina: () => void;
};

/** Paginação da fila: "carregar mais" acumulável no mobile, clássica no desktop. */
export function PainelPaginacao({
  isMobile,
  paginaAtual,
  totalPaginas,
  totalItens,
  itensExibidos,
  inicio,
  porPagina,
  onCarregarMais,
  onPaginaAnterior,
  onProximaPagina,
}: PainelPaginacaoProps) {
  if (totalItens === 0) return null;

  if (isMobile) {
    return (
      <div className="mt-4">
        {paginaAtual < totalPaginas ? (
          <Button variant="outline" className="min-h-11 w-full" onClick={onCarregarMais}>
            Carregar mais ({totalItens - itensExibidos} restantes)
          </Button>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            {totalItens} triagem(ns) exibidas
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">
        Mostrando {inicio + 1}–{Math.min(inicio + porPagina, totalItens)} de {totalItens}
      </span>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={paginaAtual <= 1}
          onClick={onPaginaAnterior}
        >
          Anterior
        </Button>
        <span className="text-xs text-muted-foreground">
          Página {paginaAtual} de {totalPaginas}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={paginaAtual >= totalPaginas}
          onClick={onProximaPagina}
        >
          Próxima
        </Button>
      </div>
    </div>
  );
}
