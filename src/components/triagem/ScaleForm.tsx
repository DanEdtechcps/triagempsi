import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getItemOptions, type Scale } from "@/lib/scales-data";

type Props = {
  scale: Scale;
  onSubmit: (answers: Record<string, number>) => void;
  onBack?: () => void;
  step: number;
  totalSteps: number;
};

export function ScaleForm({ scale, onSubmit, onBack, step, totalSteps }: Props) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const allAnswered = useMemo(
    () => scale.items.every((it) => answers[it.id] !== undefined),
    [answers, scale.items],
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Etapa {step} de {totalSteps} · {scale.code}
        </div>
        <h2 className="mt-1 text-xl font-semibold text-foreground sm:text-2xl">
          {scale.fullName}
        </h2>
        {scale.timeframe && (
          <p className="mt-1 text-sm text-muted-foreground">
            Período de referência: {scale.timeframe}
          </p>
        )}
        <p className="mt-3 text-sm leading-relaxed text-foreground/80 sm:text-base">
          {scale.instructions}
        </p>
      </div>

      <div className="space-y-3">
        {scale.items.map((item, idx) => {
          const opts = getItemOptions(scale, item.id);
          const val = answers[item.id];
          return (
            <Card key={item.id} className="border-border bg-card p-4">
              <div className="mb-3 text-sm font-medium text-foreground sm:text-base">
                {idx + 1}. {item.text}
              </div>
              <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {opts.map((opt) => {
                  const selected = val === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setAnswers((prev) => ({ ...prev, [item.id]: opt.value }))
                      }
                      className={`min-h-11 rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:border-primary/50 hover:bg-accent/30"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="ghost"
          onClick={onBack}
          disabled={!onBack}
          className="w-full sm:w-auto"
        >
          Voltar
        </Button>
        <Button
          disabled={!allAnswered}
          onClick={() => onSubmit(answers)}
          className="w-full sm:w-auto"
        >
          Continuar
        </Button>
      </div>
    </div>
  );
}
