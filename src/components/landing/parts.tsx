import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  useScroll,
  AnimatePresence,
} from "motion/react";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Revela ao entrar na viewport, com deslocamento sutil. */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: reduce ? 0.2 : 0.9, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Headline com entrada palavra a palavra. */
export function WordsReveal({
  text,
  className,
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((w, i) => (
        <span
          key={`${w}-${i}`}
          className="mr-[0.26em] inline-block overflow-hidden pb-[0.08em] align-bottom"
        >
          <motion.span
            className="inline-block"
            initial={{ y: reduce ? 0 : "110%", opacity: reduce ? 0 : 1 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              duration: reduce ? 0.2 : 1,
              delay: delay + (reduce ? 0 : i * 0.055),
              ease: EASE,
            }}
          >
            {w}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/** Cartão com spotlight que segue o cursor. */
export function SpotlightCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const background = useMotionTemplate`radial-gradient(340px circle at ${x}px ${y}px, color-mix(in oklab, var(--gold) 16%, transparent), transparent 70%)`;

  return (
    <div
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - r.left);
        y.set(e.clientY - r.top);
      }}
      className={`group relative overflow-hidden rounded-3xl border border-ivory/10 bg-ink-2/60 backdrop-blur-xl transition-colors duration-500 hover:border-ivory/25 ${className}`}
    >
      <motion.div
        aria-hidden
        style={{ background }}
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />
      <div className="relative">{children}</div>
    </div>
  );
}

/** Botão com efeito magnético + brilho. */
export function MagneticButton({
  children,
  onClick,
  variant = "solid",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "solid" | "ghost";
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLButtonElement>(null);
  const mx = useSpring(useMotionValue(0), { stiffness: 220, damping: 18 });
  const my = useSpring(useMotionValue(0), { stiffness: 220, damping: 18 });

  return (
    <motion.button
      ref={ref}
      type="button"
      onClick={onClick}
      style={{ x: mx, y: my }}
      onMouseMove={(e) => {
        if (reduce || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        mx.set(((e.clientX - r.left) / r.width - 0.5) * 14);
        my.set(((e.clientY - r.top) / r.height - 0.5) * 10);
      }}
      onMouseLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      whileTap={{ scale: 0.97 }}
      className={
        `relative inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium tracking-wide transition-colors duration-300 ` +
        (variant === "solid"
          ? "bg-ivory text-ink hover:bg-gold "
          : "border border-ivory/25 text-ivory hover:border-ivory/60 hover:bg-ivory/5 ") +
        className
      }
    >
      {children}
    </motion.button>
  );
}

/** Número que conta ao entrar na tela. */
export function CountUp({
  to,
  suffix = "",
  prefix = "",
  decimals = 0,
}: {
  to: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduce = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setValue(to);
      return;
    }
    const start = performance.now();
    const dur = 1400;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min((t - start) / dur, 1);
      setValue(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, reduce]);

  return (
    <span ref={ref}>
      {prefix}
      {value.toLocaleString("pt-BR", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

/** Faixa infinita horizontal. */
export function Marquee({
  items,
  duration = 38,
  reverse = false,
}: {
  items: string[];
  duration?: number;
  reverse?: boolean;
}) {
  const reduce = useReducedMotion();
  const loop = [...items, ...items];
  return (
    <div className="relative flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
      <motion.div
        className="flex shrink-0 gap-10 pr-10"
        animate={reduce ? undefined : { x: reverse ? ["-50%", "0%"] : ["0%", "-50%"] }}
        transition={{ duration, repeat: Infinity, ease: "linear" }}
      >
        {loop.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="whitespace-nowrap font-display text-2xl text-ivory/35 sm:text-3xl"
          >
            {item}
            <span className="ml-10 text-gold/50">✦</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/** Aurora de fundo com leve parallax no scroll. */
export function AuroraBackdrop() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const yRaw = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -220]);
  const y = useSpring(yRaw, { stiffness: 60, damping: 22 });

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <motion.div
        style={{ y }}
        className="absolute -top-40 left-1/2 h-[46rem] w-[46rem] -translate-x-1/2 rounded-full opacity-40 blur-[120px]"
      >
        <div className="h-full w-full rounded-full bg-[radial-gradient(circle_at_30%_30%,color-mix(in_oklab,var(--jade)_55%,transparent),transparent_60%)]" />
      </motion.div>
      <motion.div
        style={{ y }}
        className="absolute right-[-10rem] top-[28rem] h-[34rem] w-[34rem] rounded-full opacity-30 blur-[130px]"
      >
        <div className="h-full w-full rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--gold)_60%,transparent),transparent_65%)]" />
      </motion.div>
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,color-mix(in_oklab,var(--ink)_92%,transparent))]" />
    </div>
  );
}

/** Barra de progresso de leitura no topo. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });
  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-50 h-[2px] origin-left bg-gradient-to-r from-jade via-gold to-ivory"
    />
  );
}

/** Item de FAQ animado. */
export function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-ivory/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-6 py-6 text-left"
        aria-expanded={open}
      >
        <span className="font-display text-xl text-ivory sm:text-2xl">{q}</span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          className="shrink-0 text-2xl leading-none text-gold"
        >
          +
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="overflow-hidden"
          >
            <p className="max-w-2xl pb-6 text-sm leading-relaxed text-ivory/60 sm:text-base">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
