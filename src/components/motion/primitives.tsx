import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion, type Transition } from "motion/react";

const EASE: Transition = { duration: 0.24, ease: [0.22, 1, 0.36, 1] };

/**
 * Transição entre etapas (uma tela por vez). Respeita prefers-reduced-motion:
 * quando o usuário pede menos movimento, só há um fade curtíssimo.
 */
export function StepTransition({
  stepKey,
  children,
  direction = "forward",
}: {
  stepKey: string | number;
  children: ReactNode;
  direction?: "forward" | "backward";
}) {
  const reduce = useReducedMotion();
  const offset = reduce ? 0 : direction === "backward" ? -16 : 16;
  const panelRef = useRef<HTMLDivElement>(null);

  // Cada troca de etapa desmonta o botão que tinha o foco (Continuar,
  // opção de resposta) sem nenhum elemento assumir o foco no lugar — o
  // foco cai pro <body> e usuários de teclado/leitor de tela perdem a
  // posição e não são avisados que uma nova tela apareceu. Move o foco
  // pro contêiner da nova etapa (tabIndex=-1: focável via script, fora
  // da ordem de tab normal).
  useEffect(() => {
    panelRef.current?.focus();
  }, [stepKey]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={stepKey}
        ref={panelRef}
        tabIndex={-1}
        role="group"
        aria-live="polite"
        className="outline-none"
        initial={{ opacity: 0, x: offset }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -offset }}
        transition={reduce ? { duration: 0.12 } : EASE}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** Entrada suave de um bloco/section. */
export function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0.12 } : { ...EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Contêiner com entrada escalonada dos filhos (listas, filas, cards). */
export function StaggerGroup({
  children,
  className,
  step = 0.03,
}: {
  children: ReactNode;
  className?: string;
  step?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: reduce ? 0 : step } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: reduce ? 0 : 6 },
        show: { opacity: 1, y: 0, transition: reduce ? { duration: 0.12 } : EASE },
      }}
    >
      {children}
    </motion.div>
  );
}

export { motion, AnimatePresence, useReducedMotion };
