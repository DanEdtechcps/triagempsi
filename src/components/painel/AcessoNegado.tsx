import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { accessDeniedMessage } from "@/lib/access-error";

type Props = {
  /** Erro capturado (opcional) — usado para extrair a mensagem específica. */
  error?: unknown;
  /** Título do bloco. */
  title?: string;
  /** Mostra o link de volta para a lista de triagens. */
  backToPainel?: boolean;
};

/** Mensagem clara para quando o conteúdo está fora do escopo do usuário. */
export function AcessoNegado({
  error,
  title = "Acesso negado a este conteúdo",
  backToPainel = true,
}: Props) {
  return (
    <Card className="border-destructive/40 bg-destructive/5 p-6">
      <h2 className="font-serif text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-2 text-sm text-foreground/80">{accessDeniedMessage(error)}</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Seu perfil só enxerga dados dos consultórios vinculados à sua conta. Se você precisa
        acompanhar este registro, peça a um administrador para incluir o consultório correspondente
        no seu acesso.
      </p>
      {backToPainel && (
        <Link
          to="/painel"
          className="mt-4 inline-block text-sm font-medium text-foreground underline underline-offset-4"
        >
          ← Voltar às triagens do meu consultório
        </Link>
      )}
    </Card>
  );
}
