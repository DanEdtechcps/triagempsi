import { Link } from "@tanstack/react-router";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef, useState } from "react";

import {
  LANDING_DEFAULTS,
  type LandingSettings,
} from "@/lib/landing-settings.functions";


import { GatewaySplit } from "./GatewaySplit";
import {
  LandingVariantSwitcher,
  useLandingVariant,
} from "./LandingVariantSwitcher";
import {
  AuroraBackdrop,
  CountUp,
  FaqItem,
  MagneticButton,
  Marquee,
  Reveal,
  ScrollProgress,
  SpotlightCard,
  WordsReveal,
} from "./parts";
import { DemoModal } from "./DemoModal";

const ESCALAS = [
  "PHQ-9",
  "GAD-7",
  "ASRS-18",
  "MDQ",
  "AUDIT",
  "ASSIST",
  "OCI-R",
  "GDS-15",
  "PGSI",
  "SRQ-20",
  "GHQ-12",
  "CAGE",
  "EPDS",
  "Fagerström",
  "ISI",
  "SCOFF",
  "AQ-10",
  "AD-8",
];

const ETAPAS = [
  {
    n: "01",
    t: "Convite em 1 clique",
    d: "O consultório dispara o link pelo WhatsApp. Sem app, sem cadastro, sem fricção para o paciente.",
  },
  {
    n: "02",
    t: "Triagem adaptativa",
    d: "Uma pergunta por tela. A árvore de decisão roteia por idade e sintoma — e abre a escala completa quando o rastreio acende.",
  },
  {
    n: "03",
    t: "Leitura clínica pronta",
    d: "Escores, bandas, sinalizações de risco e a trilha de decisão narrada em linguagem clara. Nada de planilha.",
  },
  {
    n: "04",
    t: "Consulta que começa no meio",
    d: "O médico entra na sala já sabendo o terreno. O paciente recebe o resumo por e-mail com orientação segura.",
  },
];

const RECURSOS = [
  {
    t: "Motor de escalonamento",
    d: "PHQ-2 positivo abre PHQ-9. Sinal de mania abre MDQ. Cada caminho é auditável, versionado e explicado.",
    span: "lg:col-span-3",
  },
  {
    t: "Risco em primeiro plano",
    d: "Ideação suicida e sinais graves sobem ao topo da fila com semáforo e protocolo de conduta imediata.",
    span: "lg:col-span-3",
  },
  {
    t: "Fila de revisão",
    d: "Navegação em lote, atalhos de teclado e parecer médico com histórico auditado.",
    span: "lg:col-span-2",
  },
  {
    t: "White-label real",
    d: "Cores, logo, textos e domínio por consultório. Isolamento estrito de dados entre unidades.",
    span: "lg:col-span-2",
  },
  {
    t: "LGPD por desenho",
    d: "Consentimento registrado, log de auditoria exportável e acesso por escopo de consultório.",
    span: "lg:col-span-2",
  },
];

const PLANOS = [
  {
    nome: "Consultório",
    preco: "R$ 890",
    ciclo: "/mês",
    para: "Para o profissional solo que quer devolver a primeira consulta à clínica.",
    itens: [
      "1 consultório, até 2 profissionais",
      "Triagens ilimitadas",
      "Convites por WhatsApp",
      "PDF paciente + PDF clínico",
    ],
    destaque: false,
  },
  {
    nome: "Clínica",
    preco: "R$ 2.400",
    ciclo: "/mês",
    para: "Para equipes que atendem em volume e precisam de governança.",
    itens: [
      "Até 6 consultórios white-label",
      "Painel multi-unidade e resumo executivo",
      "Log de auditoria com exportação",
      "Parecer médico com histórico",
      "Onboarding e treinamento da equipe",
    ],
    destaque: true,
  },
  {
    nome: "Instituição",
    preco: "Sob medida",
    ciclo: "",
    para: "Redes, operadoras e programas de saúde mental corporativa.",
    itens: [
      "Consultórios ilimitados",
      "Escalas e protocolos customizados",
      "Integrações e domínio próprio",
      "SLA e suporte dedicado",
    ],
    destaque: false,
  },
];

const FAQ = [
  {
    q: "Isso substitui a avaliação médica?",
    a: "Não. É um instrumento de apoio: organiza rastreios validados antes da consulta. O diagnóstico continua sendo do profissional — e a plataforma deixa isso explícito para o paciente em toda a jornada.",
  },
  {
    q: "Quanto tempo o paciente leva?",
    a: "Entre 6 e 14 minutos na maioria dos casos. A árvore adaptativa evita perguntas irrelevantes: quem não sinaliza um domínio simplesmente não responde àquela escala.",
  },
  {
    q: "Como funciona o envio por WhatsApp?",
    a: "O consultório gera um convite com token de validade e envia pelo WhatsApp em um clique. Cada envio fica registrado no log de auditoria com data, destinatário e responsável.",
  },
  {
    q: "Meus dados ficam isolados de outros consultórios?",
    a: "Sim. O isolamento é aplicado no banco e revalidado no servidor a cada requisição. Um profissional só enxerga triagens, contatos e auditoria dos consultórios aos quais pertence.",
  },
  {
    q: "Em quanto tempo entra no ar?",
    a: "Consultório configurado no mesmo dia. Marca, textos e equipe ficam prontos em uma sessão de onboarding de 60 minutos.",
  },
];

export function LandingPage({ settings }: { settings?: LandingSettings | null }) {
  const copy = { ...LANDING_DEFAULTS, ...(settings ?? {}) };
  const { variant, setVariant } = useLandingVariant();
  const [demoOpen, setDemoOpen] = useState(false);

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(heroProgress, [0, 1], [0, 120]);
  const heroOpacity = useTransform(heroProgress, [0, 0.8], [1, 0]);

  const stepsRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: stepsProgress } = useScroll({
    target: stepsRef,
    offset: ["start 70%", "end 60%"],
  });
  const lineScale = useSpring(stepsProgress, { stiffness: 90, damping: 28 });

  return (
    <div
      data-landing-variant={variant}
      className="relative min-h-screen overflow-x-clip bg-ink font-sans text-ivory landing-grain transition-colors duration-500"
    >
      <ScrollProgress />
      <AuroraBackdrop />
      <LandingVariantSwitcher variant={variant} onChange={setVariant} />


      {/* NAV */}
      <motion.header
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        className="fixed inset-x-0 top-0 z-40 px-4 pt-4 sm:px-8"
      >
        <nav className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-ivory/10 bg-ink-2/60 px-5 py-3 backdrop-blur-xl">
          <span className="font-display text-lg tracking-tight">
            Triagem<span className="text-gold">.</span>
          </span>
          <div className="hidden items-center gap-8 text-xs uppercase tracking-[0.18em] text-ivory/55 md:flex">
            <a href="#metodo" className="transition-colors hover:text-ivory">
              Método
            </a>
            <a href="#recursos" className="transition-colors hover:text-ivory">
              Recursos
            </a>
            <a href="#planos" className="transition-colors hover:text-ivory">
              Planos
            </a>
            <Link to="/entrar" className="transition-colors hover:text-ivory">
              Sou paciente
            </Link>
          </div>
          <Link
            to="/auth"
            className="rounded-full border border-ivory/20 px-4 py-2 text-xs uppercase tracking-[0.14em] text-ivory/80 transition-colors hover:border-ivory/50 hover:text-ivory"
          >
            Entrar
          </Link>
        </nav>
      </motion.header>

      {/* PORTA DE ENTRADA — paciente × profissional */}
      <GatewaySplit />

      {/* HERO */}
      <section ref={heroRef} className="relative px-5 pb-24 pt-24 sm:px-8 sm:pt-32">
        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="mx-auto max-w-5xl text-center"
        >
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.8 }}
            className="inline-flex items-center gap-3 rounded-full border border-ivory/12 bg-ivory/5 px-4 py-1.5 text-[0.68rem] uppercase tracking-[0.24em] text-ivory/60"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-jade" />
            {copy.eyebrow}
          </motion.span>

          <h1 className="mt-8 font-display text-[clamp(2.75rem,8vw,6.5rem)] leading-[0.95] tracking-tight">
            <WordsReveal text={copy.headline_line1} />
            <br />
            <span className="text-gradient-gold">
              <WordsReveal text={copy.headline_line2} delay={0.28} />
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-ivory/60 sm:text-lg"
          >
            {copy.subheadline}

          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.05, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="mt-11 flex flex-wrap items-center justify-center gap-3"
          >
            <Link to="/$slug" params={{ slug: "saraiva" }}>
              <MagneticButton>Ver a triagem por dentro</MagneticButton>
            </Link>
            <a href="#planos">
              <MagneticButton variant="ghost">Planos e implantação</MagneticButton>
            </a>
          </motion.div>
        </motion.div>

        {/* Mock do painel */}
        <Reveal delay={0.2} y={60} className="mx-auto mt-24 max-w-5xl">
          <div className="relative rounded-[2rem] border border-ivory/10 bg-ink-2/60 p-2 backdrop-blur-xl">
            <div className="rounded-[1.6rem] border border-ivory/8 bg-ink-3/50 p-6 sm:p-10">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-ivory/20" />
                <span className="h-2.5 w-2.5 rounded-full bg-ivory/20" />
                <span className="h-2.5 w-2.5 rounded-full bg-ivory/20" />
                <span className="ml-4 text-[0.65rem] uppercase tracking-[0.2em] text-ivory/35">
                  Painel clínico · fila de revisão
                </span>
              </div>
              <div className="mt-8 grid gap-3">
                {[
                  { n: "Paciente 1", s: "Risco alto · PHQ-9 21", c: "bg-destructive" },
                  { n: "Paciente 2", s: "Atenção · GAD-7 13", c: "bg-warning" },
                  { n: "Paciente 3", s: "Leve · SRQ-20 5", c: "bg-jade" },
                ].map((row, i) => (
                  <motion.div
                    key={row.n}
                    initial={{ opacity: 0, x: -18 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.15 * i, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-center justify-between rounded-2xl border border-ivory/8 bg-ink-2/70 px-5 py-4"
                  >
                    <div className="flex items-center gap-4">
                      <span className={`h-2 w-2 rounded-full ${row.c}`} />
                      <span className="text-sm text-ivory/85">{row.n}</span>
                    </div>
                    <span className="text-xs tracking-wide text-ivory/45">{row.s}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* MARQUEE ESCALAS */}
      <section className="relative border-y border-ivory/8 py-10">
        <Marquee items={ESCALAS} />
      </section>

      {/* NÚMEROS */}
      <section className="relative px-5 py-28 sm:px-8">
        <div className="mx-auto grid max-w-5xl gap-10 sm:grid-cols-3">
          {[
            { v: <CountUp to={22} suffix=" min" />, l: "devolvidos por primeira consulta" },
            { v: <CountUp to={29} />, l: "instrumentos validados no motor" },
            { v: <CountUp to={100} suffix="%" />, l: "das decisões com trilha auditável" },
          ].map((s, i) => (
            <Reveal key={s.l} delay={i * 0.1} className="text-center sm:text-left">
              <div className="font-display text-5xl text-gradient-gold sm:text-6xl">{s.v}</div>
              <p className="mt-3 text-sm leading-relaxed text-ivory/50">{s.l}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* MÉTODO */}
      <section id="metodo" className="relative scroll-mt-24 px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-gold/70">O método</p>
            <h2 className="mt-5 max-w-3xl font-display text-[clamp(2rem,5vw,3.75rem)] leading-[1.05]">
              Quatro movimentos entre o convite e o diagnóstico.
            </h2>
          </Reveal>

          <div ref={stepsRef} className="relative mt-20 pl-10 sm:pl-16">
            <div className="absolute left-[3px] top-0 h-full w-px bg-ivory/10 sm:left-[7px]" />
            <motion.div
              style={{ scaleY: lineScale }}
              className="absolute left-[3px] top-0 h-full w-px origin-top bg-gradient-to-b from-jade via-gold to-ivory sm:left-[7px]"
            />
            <div className="space-y-16">
              {ETAPAS.map((e, i) => (
                <Reveal key={e.n} delay={i * 0.05}>
                  <div className="relative">
                    <span className="absolute -left-10 top-2 h-2 w-2 rounded-full bg-gold sm:-left-16 sm:h-3.5 sm:w-3.5" />
                    <span className="font-display text-sm text-gold/70">{e.n}</span>
                    <h3 className="mt-2 font-display text-2xl text-ivory sm:text-4xl">{e.t}</h3>
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-ivory/55 sm:text-base">
                      {e.d}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* RECURSOS — bento */}
      <section id="recursos" className="relative scroll-mt-24 px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-gold/70">Engenharia clínica</p>
            <h2 className="mt-5 max-w-3xl font-display text-[clamp(2rem,5vw,3.75rem)] leading-[1.05]">
              Feito para quem leva a primeira consulta a sério.
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-4 lg:grid-cols-6">
            {RECURSOS.map((r, i) => (
              <Reveal key={r.t} delay={i * 0.06} className={r.span}>
                <SpotlightCard className="h-full p-8">
                  <h3 className="font-display text-2xl text-ivory">{r.t}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ivory/55">{r.d}</p>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CITAÇÃO */}
      <section className="relative px-5 py-28 sm:px-8">
        <Reveal className="mx-auto max-w-4xl text-center">
          <p className="font-display text-[clamp(1.6rem,4vw,3rem)] leading-[1.2] text-ivory/90">
            “Eu gastava metade da primeira consulta preenchendo escala. Agora entro na sala
            com o caso lido — e o paciente sente isso no primeiro minuto.”
          </p>
          <p className="mt-8 text-xs uppercase tracking-[0.22em] text-ivory/40">
            Psiquiatra · consultório particular
          </p>
        </Reveal>
      </section>

      {/* PLANOS */}
      <section id="planos" className="relative scroll-mt-24 px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <Reveal className="text-center">
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-gold/70">Implantação</p>
            <h2 className="mt-5 font-display text-[clamp(2rem,5vw,3.75rem)] leading-[1.05]">
              Menos de uma consulta por mês.
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {PLANOS.map((p, i) => (
              <Reveal key={p.nome} delay={i * 0.08}>
                <SpotlightCard
                  className={`flex h-full flex-col p-8 ${
                    p.destaque ? "border-gold/40 bg-ink-3/70" : ""
                  }`}
                >
                  {p.destaque && (
                    <span className="mb-5 inline-flex w-fit rounded-full bg-gold/15 px-3 py-1 text-[0.62rem] uppercase tracking-[0.2em] text-gold">
                      Mais escolhido
                    </span>
                  )}
                  <h3 className="font-display text-2xl">{p.nome}</h3>
                  <div className="mt-4 flex items-end gap-1">
                    <span className="font-display text-4xl text-gradient-gold">{p.preco}</span>
                    <span className="pb-1 text-sm text-ivory/40">{p.ciclo}</span>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-ivory/50">{p.para}</p>
                  <ul className="mt-7 space-y-3 text-sm text-ivory/70">
                    {p.itens.map((it) => (
                      <li key={it} className="flex gap-3">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gold" />
                        {it}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 pt-2">
                    <MagneticButton
                      variant={p.destaque ? "solid" : "ghost"}
                      className="w-full"
                      onClick={() => setDemoOpen(true)}
                    >
                      Falar com a equipe
                    </MagneticButton>
                  </div>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <h2 className="font-display text-[clamp(2rem,5vw,3.25rem)] leading-[1.05]">
              Perguntas honestas.
            </h2>
          </Reveal>
          <div className="mt-10">
            {FAQ.map((f, i) => (
              <Reveal key={f.q} delay={i * 0.04}>
                <FaqItem q={f.q} a={f.a} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section id="contato" className="relative scroll-mt-24 px-5 py-32 sm:px-8">
        <Reveal className="mx-auto max-w-4xl text-center">
          <h2 className="font-display text-[clamp(2.25rem,6.5vw,5rem)] leading-[0.98]">
            Devolva a sua <span className="text-gradient-gold">primeira consulta</span>.
          </h2>
          <p className="mx-auto mt-7 max-w-xl text-base leading-relaxed text-ivory/55">
            Uma sessão de 30 minutos: mostramos o painel com dados reais de demonstração e
            configuramos seu consultório no mesmo dia.
          </p>
          <div className="mt-11 flex flex-wrap justify-center gap-3">
            <MagneticButton onClick={() => setDemoOpen(true)}>
              Agendar demonstração
            </MagneticButton>
            <Link to="/$slug" params={{ slug: "saraiva" }}>
              <MagneticButton variant="ghost">Experimentar a triagem</MagneticButton>
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="relative border-t border-ivory/8 px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-xs text-ivory/35 sm:flex-row">
          <span className="font-display text-base text-ivory/60">
            Triagem<span className="text-gold">.</span>
          </span>
          <p className="max-w-md text-center leading-relaxed sm:text-right">
            Instrumento de apoio à prática clínica. Não realiza diagnóstico e não substitui a
            avaliação de um profissional de saúde.
          </p>
        </div>
      </footer>

      <DemoModal open={demoOpen} onOpenChange={setDemoOpen} />
    </div>
  );
}
