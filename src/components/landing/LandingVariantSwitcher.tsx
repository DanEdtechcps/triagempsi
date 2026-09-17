import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

export const LANDING_VARIANTS = [
  { id: "claro", label: "Claro", hint: "Editorial em papel (padrão)" },
  { id: "noir", label: "Noir", hint: "Premium escuro" },
  { id: "escuro", label: "Escuro", hint: "Azul profundo sereno" },
  { id: "ousada", label: "Ousadíssima", hint: "Neon ácido e magenta" },
] as const;

export type LandingVariant = (typeof LANDING_VARIANTS)[number]["id"];

const STORAGE_KEY = "landing-variant";

export function useLandingVariant() {
  const [variant, setVariant] = useState<LandingVariant>("claro");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as LandingVariant | null;
    if (saved && LANDING_VARIANTS.some((v) => v.id === saved)) setVariant(saved);
  }, []);

  const change = (v: LandingVariant) => {
    setVariant(v);
    try {
      window.localStorage.setItem(STORAGE_KEY, v);
    } catch {
      /* storage indisponível */
    }
  };

  return { variant, setVariant: change };
}

/** Botão flutuante simples para alternar entre os modelos visuais da landing. */
export function LandingVariantSwitcher({
  variant,
  onChange,
}: {
  variant: LandingVariant;
  onChange: (v: LandingVariant) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = LANDING_VARIANTS.find((v) => v.id === variant) ?? LANDING_VARIANTS[0];

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="w-60 overflow-hidden rounded-2xl border border-ivory/15 bg-ink-2/90 p-1.5 backdrop-blur-xl"
          >
            {LANDING_VARIANTS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  onChange(v.id);
                  setOpen(false);
                }}
                className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  v.id === variant ? "bg-ivory/10" : "hover:bg-ivory/5"
                }`}
              >
                <span
                  data-landing-variant={v.id}
                  className="mt-1 h-4 w-4 shrink-0 rounded-full border border-ivory/30 bg-[linear-gradient(135deg,var(--ink)_0%,var(--ink)_45%,var(--gold)_45%,var(--jade)_100%)]"
                />
                <span>
                  <span className="block text-sm text-ivory">{v.label}</span>
                  <span className="block text-[0.68rem] text-ivory/45">{v.hint}</span>
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-2.5 rounded-full border border-ivory/20 bg-ink-2/80 px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-ivory/80 backdrop-blur-xl transition-colors hover:border-ivory/50 hover:text-ivory"
      >
        <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-gold to-jade" />
        Design · {current.label}
      </button>
    </div>
  );
}
