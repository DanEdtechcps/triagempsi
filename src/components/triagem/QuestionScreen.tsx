import { motion, useReducedMotion } from "motion/react";
import { getItemOptions, type Scale } from "@/lib/scales-data";

type Props = {
  scale: Scale;
  itemIndex: number;
  /** posição entre os itens visíveis (com ramificação, difere de itemIndex) */
  position?: number;
  /** total de itens visíveis */
  total?: number;
  /** rótulo do grupo de ramificação do item atual (ex.: "Tabaco") */
  groupLabel?: string;
  /** aviso opcional exibido no início da escala (ex.: explicação de encadeamento) */
  continuationNote?: string;
  value: number | undefined;
  onAnswer: (value: number) => void;
  onBack?: () => void;
};

/**
 * Uma pergunta por tela. Renderizador genérico: lê a estrutura da escala,
 * não conhece nenhuma escala específica.
 */
export function QuestionScreen({
  scale,
  itemIndex,
  position,
  total,
  groupLabel,
  continuationNote,
  value,
  onAnswer,
  onBack,
}: Props) {
  const item = scale.items[itemIndex];
  const options = getItemOptions(scale, item.id);
  const reduce = useReducedMotion();

  return (
    <div className="space-y-6">
      <div>
        {continuationNote && (
          <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm leading-relaxed text-foreground">
            {continuationNote}
          </div>
        )}
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {scale.name} · pergunta {position ?? itemIndex + 1} de {total ?? scale.items.length}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {scale.instructions}
          {scale.timeframe ? ` (${scale.timeframe})` : ""}
        </p>
        {groupLabel && (
          <div className="mt-3 inline-flex rounded-full bg-accent/60 px-3 py-1 text-xs font-medium text-accent-foreground">
            {groupLabel}
          </div>
        )}
        <h2
          id={`pergunta-${item.id}`}
          className="mt-4 text-xl font-semibold leading-snug text-foreground sm:text-2xl"
        >
          {item.text}
        </h2>
      </div>

      <motion.div
        className="grid gap-3"
        role="radiogroup"
        aria-labelledby={`pergunta-${item.id}`}
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: reduce ? 0 : 0.04 } },
        }}
      >
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <motion.button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onAnswer(opt.value)}
              variants={{
                hidden: { opacity: 0, y: reduce ? 0 : 6 },
                show: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: reduce ? 0.12 : 0.2 },
                },
              }}
              whileTap={reduce ? undefined : { scale: 0.985 }}
              className={`min-h-14 w-full rounded-xl border px-4 py-3 text-left text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:border-primary/50 hover:bg-accent/30"
              }`}
            >
              {opt.label}
            </motion.button>
          );
        })}
      </motion.div>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-[44px] items-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md py-2"
        >
          ← Voltar
        </button>
      )}
    </div>
  );
}
