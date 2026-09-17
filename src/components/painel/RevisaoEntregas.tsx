import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PENDING_DELIVERIES,
  formatDeliveryDate,
  type Delivery,
} from "@/config/deliveries";

function approvalText(d: Delivery) {
  return `Aprovar a entrega "${d.title}" (${formatDeliveryDate(d.date)}) para o roadmap.`;
}

function adjustText(d: Delivery) {
  return `Ajustar a entrega "${d.title}" antes de aprovar: `;
}

/**
 * Fila de revisão: entregas registradas ficam pendentes até a validação do
 * médico responsável. Enquanto pendentes, não aparecem no roadmap público
 * nem no changelog.
 */
export function RevisaoEntregas() {
  const [copied, setCopied] = useState<string | null>(null);

  if (PENDING_DELIVERIES.length === 0) {
    return (
      <Card className="space-y-1 p-4 sm:p-6">
        <h2 className="font-serif text-lg font-semibold">Revisão de entregas</h2>
        <p className="text-sm text-muted-foreground">
          Nenhuma entrega aguardando aprovação. Toda nova entrega entra primeiro nesta
          fila e só é fixada no roadmap e no changelog depois da sua validação.
        </p>
      </Card>
    );
  }

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
    } catch {
      setCopied(null);
    }
  };

  return (
    <Card className="space-y-4 border-primary/40 p-4 sm:p-6">
      <div>
        <h2 className="font-serif text-lg font-semibold">
          Aguardando sua aprovação ({PENDING_DELIVERIES.length})
        </h2>
        <p className="text-sm text-muted-foreground">
          Revise descrição, área, versão e impacto. Enquanto estiver pendente, a entrega
          não aparece no roadmap fixado nem no changelog.
        </p>
      </div>
      <ul className="space-y-4">
        {PENDING_DELIVERIES.map((d) => {
          const key = `${d.date}-${d.title}`;
          return (
            <li key={key} className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">{d.title}</span>
                <span className="inline-flex rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                  Pendente
                </span>
                {d.version && (
                  <span className="inline-flex rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                    v{d.version}
                  </span>
                )}
                {d.area && (
                  <span className="inline-flex rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    {d.area}
                  </span>
                )}
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatDeliveryDate(d.date)}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{d.detail}</p>
              {d.impact && <p className="mt-1 text-sm">Impacto: {d.impact}</p>}
              {d.review_note && (
                <p className="mt-1 text-sm text-primary">
                  Ajuste solicitado: {d.review_note}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => copy(`${key}-ok`, approvalText(d))}>
                  {copied === `${key}-ok` ? "Texto copiado" : "Aprovar (copiar pedido)"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copy(`${key}-fix`, adjustText(d))}
                >
                  {copied === `${key}-fix` ? "Texto copiado" : "Pedir ajuste"}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground">
        Cole o texto copiado no chat do projeto para confirmar a aprovação ou descrever o
        ajuste desejado.
      </p>
    </Card>
  );
}
