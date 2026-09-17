import { Link } from "@tanstack/react-router";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import { useRef, type ReactNode } from "react";

import { MagneticButton } from "./parts";

const EASE = [0.16, 1, 0.3, 1] as const;

type Accent = "jade" | "gold";

function GatewayPanel({
  accent,
  eyebrow,
  title,
  desc,
  items,
  children,
  enterFrom,
  delay,
}: {
  accent: Accent;
  eyebrow: string;
  title: string;
  desc: string;
  items: string[];
  /** CTAs (botões/links) renderizados no rodapé do painel */
  children: ReactNode;
  /** -1 entra pela esquerda, 1 pela direita */
  enterFrom: number;
  delay: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(-600);
  const my = useMotionValue(-600);
  const glow = useMotionTemplate`radial-gradient(460px circle at ${mx}px ${my}px, color-mix(in oklab, var(--${accent}) 17%, transparent), transparent 70%)`;

  const accentText = accent === "jade" ? "text-jade" : "text-gold";
  const accentDot = accent === "jade" ? "bg-jade" : "bg-gold";
  const accentBorder =
    accent === "jade"
      ? "border-jade/20 hover:border-jade/55 focus-within:border-jade/55"
      : "border-gold/20 hover:border-gold/55 focus-within:border-gold/55";

  return (
    <motion.div
      ref={ref}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set(e.clientX - r.left);
        my.set(e.clientY - r.top);
      }}
      onMouseLeave={() => {
        mx.set(-600);
        my.set(-600);
      }}
      initial={{ opacity: 0, x: reduce ? 0 : 64 * enterFrom, filter: "blur(8px)" }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      transition={{ duration: reduce ? 0.2 : 1.1, delay, ease: EASE }}
      className={`group relative flex-1 overflow-hidden rounded-[2rem] border bg-ink-2/60 backdrop-blur-xl transition-[flex,border-color] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] lg:hover:flex-[1.55] lg:focus-within:flex-[1.55] ${accentBorder}`}
    >
      {/* brilho que segue o cursor */}
      <motion.div
        aria-hidden
        style={{ background: glow }}
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
      />

      <div className="relative flex h-full flex-col justify-between gap-9 p-8 sm:p-12">
        <div>
          <span
            className={`inline-flex items-center gap-2.5 rounded-full border border-ivory/12 bg-ivory/5 px-4 py-1.5 text-[0.66rem] uppercase tracking-[0.24em] ${accentText}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${accentDot}`} />
            {eyebrow}
          </span>
          <h3 className="mt-7 max-w-md font-display text-[clamp(1.85rem,3.2vw,2.9rem)] leading-[1.04] tracking-tight text-ivory">
            {title}
          </h3>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-ivory/55 sm:text-base">
            {desc}
          </p>
        </div>

        <div>
          {/* no mobile fica sempre visível; no desktop desliza suavemente no hover/foco */}
          <ul className="space-y-2.5 overflow-hidden text-sm text-ivory/65 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] lg:max-h-0 lg:-translate-y-2 lg:opacity-0 lg:group-hover:max-h-40 lg:group-hover:translate-y-0 lg:group-hover:opacity-100 lg:group-focus-within:max-h-40 lg:group-focus-within:translate-y-0 lg:group-focus-within:opacity-100">
            {items.map((it) => (
              <li key={it} className="flex items-center gap-3">
                <span className={`h-1 w-1 shrink-0 rounded-full ${accentDot}`} />
                {it}
              </li>
            ))}
          </ul>
          <div className="mt-7 flex flex-wrap items-center gap-3">{children}</div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Primeira dobra da landing: duas portas — paciente e profissional/clínica.
 * Os painéis se expandem suavemente no hover/foco e tudo navega sem recarregar.
 */
export function GatewaySplit() {
  const reduce = useReducedMotion();

  return (
    <section
      id="acessos"
      aria-label="Escolha o seu acesso"
      className="relative flex min-h-[100svh] flex-col px-5 pb-8 pt-28 sm:px-8 sm:pt-32"
    >
      {/* Cabeçalho compacto */}
      <motion.div
        initial={{ opacity: 0, y: reduce ? 0 : 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0.2 : 0.9, delay: 0.25, ease: EASE }}
        className="mx-auto max-w-3xl text-center"
      >
        <span className="inline-flex items-center gap-3 rounded-full border border-ivory/12 bg-ivory/5 px-4 py-1.5 text-[0.68rem] uppercase tracking-[0.24em] text-ivory/60">
          Duas portas, uma jornada
        </span>
        <h2 className="mt-6 font-display text-[clamp(2.1rem,5vw,3.9rem)] leading-[1.02] tracking-tight">
          Comece pelo <span className="text-gradient-gold">seu lado</span>.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-ivory/55 sm:text-base">
          O paciente responde em minutos. O profissional recebe a leitura clínica pronta.
          Escolha a sua porta — o resto do caminho já está pavimentado.
        </p>
      </motion.div>

      {/* Painéis divididos */}
      <div className="relative mx-auto mt-10 flex w-full max-w-6xl flex-1 flex-col gap-4 lg:flex-row lg:items-stretch">
        {/* divisor "ou" — círculo central no desktop */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 z-10 hidden h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-ivory/15 bg-ink text-[0.62rem] uppercase tracking-[0.22em] text-ivory/45 lg:flex"
        >
          ou
        </div>

        <GatewayPanel
          accent="jade"
          eyebrow="Sou paciente"
          title="Chegue à consulta com a triagem pronta."
          desc="Uma pergunta por tela, de 6 a 14 minutos, sem cadastro para responder. O resumo chega no seu e-mail e o consultório já te espera com o cenário lido."
          items={[
            "Sem cadastro para responder",
            "Resumo básico direto no seu e-mail",
            "Portal do paciente para rever quando quiser",
          ]}
          enterFrom={-1}
          delay={0.45}
        >
          <Link to="/$slug/triagem" params={{ slug: "padrao" }}>
            <MagneticButton>Começar pré-avaliação</MagneticButton>
          </Link>
          <Link
            to="/entrar"
            className="inline-flex items-center gap-2 rounded-full border border-ivory/15 px-6 py-3.5 text-sm text-ivory/70 transition-colors duration-300 hover:border-jade/50 hover:text-ivory"
          >
            Portal do paciente
            <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5">→</span>
          </Link>
        </GatewayPanel>

        {/* divisor "ou" — linha no mobile */}
        <div aria-hidden className="flex items-center gap-3 lg:hidden">
          <span className="h-px flex-1 bg-ivory/10" />
          <span className="text-[0.62rem] uppercase tracking-[0.22em] text-ivory/40">ou</span>
          <span className="h-px flex-1 bg-ivory/10" />
        </div>

        <GatewayPanel
          accent="gold"
          eyebrow="Sou profissional ou clínica"
          title="Entre na sala com o caso já lido."
          desc="Escores, bandas de risco e a trilha de decisão narrada em linguagem clara — esperando na sua fila de revisão, não numa pilha de papel."
          items={[
            "Fila de revisão com semáforo de risco",
            "29 instrumentos validados no motor",
            "White-label: sua marca, seu domínio",
          ]}
          enterFrom={1}
          delay={0.6}
        >
          <Link to="/auth">
            <MagneticButton>Entrar no painel</MagneticButton>
          </Link>
          <a
            href="#metodo"
            className="inline-flex items-center gap-2 rounded-full border border-ivory/15 px-6 py-3.5 text-sm text-ivory/70 transition-colors duration-300 hover:border-gold/50 hover:text-ivory"
          >
            Ver a plataforma
            <span aria-hidden>↓</span>
          </a>
        </GatewayPanel>
      </div>

      {/* deixa rolar — âncora suave para o pitch */}
      <motion.a
        href="#metodo"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.8 }}
        className="mx-auto mt-8 flex flex-col items-center gap-2 text-[0.62rem] uppercase tracking-[0.24em] text-ivory/40 transition-colors hover:text-ivory/75"
      >
        A plataforma em detalhe
        <motion.span
          aria-hidden
          animate={reduce ? undefined : { y: [0, 7, 0] }}
          transition={{ repeat: Infinity, duration: 1.9, ease: "easeInOut" }}
          className="text-sm"
        >
          ↓
        </motion.span>
      </motion.a>
    </section>
  );
}
