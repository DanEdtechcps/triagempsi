import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { PainelShell } from "@/components/painel/PainelShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Check,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  HeartHandshake,
  Lightbulb,
  Printer,
  Search,
  Share2,
  Sparkles,
  Sun,
  Wind,
  Moon,
  BrainCircuit,
  Activity,
  Wine,
  ShieldCheck,
  BatteryWarning,
  GitBranch,
  ShieldAlert,
  ClipboardCheck,
  ArrowRight,
} from "lucide-react";
import {
  OFFICIAL_PSYCHOEDUCATION_TOPICS,
  type PsychoTopicDefinition,
} from "@/lib/psychoeducation-data";
import { PSYCHOEDUCATION_TRIGGER_SPECS, type PsychoTriggerSpec } from "@/lib/psychoeducation";

export const Route = createFileRoute("/_authenticated/materiais")({
  head: () => ({
    meta: [
      { title: "Cockpit de Psicoeducação — Painel do profissional" },
      {
        name: "description",
        content:
          "Cockpit clínico de psicoeducação para pacientes e protocolos técnicos para a equipe médica.",
      },
      { property: "og:title", content: "Cockpit de Psicoeducação" },
      { property: "og:description", content: "Materiais clínicos e psicoeducação estruturada." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CockpitPsicoeducacao,
});

function getTopicIcon(iconName: string) {
  switch (iconName) {
    case "Sun":
      return <Sun className="h-5 w-5 text-amber-500" />;
    case "Wind":
      return <Wind className="h-5 w-5 text-sky-500" />;
    case "HeartHandshake":
      return <HeartHandshake className="h-5 w-5 text-rose-500" />;
    case "Moon":
      return <Moon className="h-5 w-5 text-indigo-400" />;
    case "BrainCircuit":
      return <BrainCircuit className="h-5 w-5 text-violet-500" />;
    case "Activity":
      return <Activity className="h-5 w-5 text-emerald-500" />;
    case "Wine":
      return <Wine className="h-5 w-5 text-purple-500" />;
    case "ShieldCheck":
      return <ShieldCheck className="h-5 w-5 text-teal-500" />;
    case "BatteryWarning":
      return <BatteryWarning className="h-5 w-5 text-orange-500" />;
    case "Sparkles":
    default:
      return <Sparkles className="h-5 w-5 text-primary" />;
  }
}

type TabType = "temas" | "regras" | "tecnicos";

function CockpitPsicoeducacao() {
  const [activeTab, setActiveTab] = useState<TabType>("temas");
  const [busca, setBusca] = useState("");
  const [categoriaTag, setCategoriaTag] = useState<string>("todas");
  const [selectedTopic, setSelectedTopic] = useState<PsychoTopicDefinition | null>(null);
  const [copiadoSlug, setCopiadoSlug] = useState<string | null>(null);
  const [copiadoModelo, setCopiadoModelo] = useState(false);

  // Extrair todas as tags únicas
  const allTags = useMemo(() => {
    const set = new Set<string>();
    OFFICIAL_PSYCHOEDUCATION_TOPICS.forEach((t) => {
      t.tags.forEach((tag) => set.add(tag));
    });
    return Array.from(set);
  }, []);

  // Filtragem dos temas
  const filteredTopics = useMemo(() => {
    const q = busca.toLowerCase().trim();
    return OFFICIAL_PSYCHOEDUCATION_TOPICS.filter((t) => {
      const matchBusca =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.resumo_card.toLowerCase().includes(q) ||
        t.body_md.toLowerCase().includes(q) ||
        t.tags.some((tg) => tg.toLowerCase().includes(q));

      const matchTag = categoriaTag === "todas" || t.tags.includes(categoriaTag);

      return matchBusca && matchTag;
    });
  }, [busca, categoriaTag]);

  function handleCopyForPatient(topic: PsychoTopicDefinition) {
    const text = `*${topic.title}*\n\n${topic.resumo_card}\n\n_Orientações do seu consultório médico via TriagemPsi._`;
    void navigator.clipboard?.writeText(text);
    setCopiadoSlug(topic.slug);
    setTimeout(() => setCopiadoSlug(null), 2500);
  }

  function handleCopyProntuarioModel() {
    const model = `REGISTRO DE TRIAGEM CLÍNICA E PSICOEDUCAÇÃO (TriagemPsi)
Data: ${new Date().toLocaleDateString("pt-BR")}
Paciente: [NOME DO PACIENTE]
Queixa Principal: [RELATO DA QUEIXA PRINCIPAL]
Escalas Aplicadas & Escores:
- [ESCALA 1]: [SCORE] ([FAIXA])
- [ESCALA 2]: [SCORE] ([FAIXA])
Risco e Segurança: [SEM SINAIS DE RISCO AGUDO / PROTOCOLO DE SEGURANÇA ACIONADO]
Psicoeducação Disponibilizada:
- [TEMA DE PSICOEDUCAÇÃO LIBERADO NO PORTAL]
Conduta:
- Orientações de estilo de vida, higiene do sono e estratégias de autorregulação emocional.
- Agendamento de retorno / avaliação médica complementar.`;

    void navigator.clipboard?.writeText(model);
    setCopiadoModelo(true);
    setTimeout(() => setCopiadoModelo(false), 2500);
  }

  return (
    <PainelShell title="Cockpit de Psicoeducação">
      {/* Header Executivo do Cockpit */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/10 text-primary gap-1 px-2.5 py-0.5 text-xs font-semibold"
              >
                <Sparkles className="h-3 w-3" />
                Curadoria Clínica Validada
              </Badge>
              <span className="text-xs text-muted-foreground">
                Baseada em TCC · ABP · Redução de Danos
              </span>
            </div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Cockpit de Psicoeducação Clínica
            </h1>
            <p className="max-w-2xl text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Acervo de materiais educativos disponibilizados no portal do paciente e no prontuário.
              Alinhado às diretrizes psiquiátricas contemporâneas, regulação circadiana e medicina
              humanizada.
            </p>
          </div>

          {/* Cards de Métricas Rápidas */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 shrink-0">
            <div className="rounded-xl border border-border/80 bg-background/50 p-3 text-center">
              <div className="font-serif text-xl font-bold text-foreground">10</div>
              <div className="text-[11px] text-muted-foreground">Temas Ativos</div>
            </div>
            <div className="rounded-xl border border-border/80 bg-background/50 p-3 text-center">
              <div className="font-serif text-xl font-bold text-primary">28</div>
              <div className="text-[11px] text-muted-foreground">Escalas Integradas</div>
            </div>
            <div className="rounded-xl border border-border/80 bg-background/50 p-3 text-center">
              <div className="font-serif text-xl font-bold text-emerald-600">100%</div>
              <div className="text-[11px] text-muted-foreground">Automatizado</div>
            </div>
          </div>
        </div>

        {/* Abas de Navegação do Cockpit */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-border/60 pt-4">
          <Button
            variant={activeTab === "temas" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("temas")}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Temas para Pacientes ({OFFICIAL_PSYCHOEDUCATION_TOPICS.length})
          </Button>

          <Button
            variant={activeTab === "regras" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("regras")}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <GitBranch className="h-3.5 w-3.5" />
            Matriz de Gatilhos Automáticos ({PSYCHOEDUCATION_TRIGGER_SPECS.length})
          </Button>

          <Button
            variant={activeTab === "tecnicos" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("tecnicos")}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <ClipboardCheck className="h-3.5 w-3.5" />
            Materiais Técnicos do Consultório
          </Button>
        </div>
      </div>

      {/* ABA 1: TEMAS DE PSICOEDUCAÇÃO PARA PACIENTES */}
      {activeTab === "temas" && (
        <div className="space-y-4">
          {/* Filtros e Busca */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por sintoma, tema, escala ou palavra-chave..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="h-9 pl-9 text-xs"
              />
            </div>

            {/* Tags de Categoria */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <Button
                variant={categoriaTag === "todas" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setCategoriaTag("todas")}
                className="h-7 text-xs px-2.5"
              >
                Todas as tags
              </Button>
              {allTags.slice(0, 6).map((tag) => (
                <Button
                  key={tag}
                  variant={categoriaTag === tag ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setCategoriaTag(tag)}
                  className="h-7 text-xs px-2.5 font-normal"
                >
                  {tag}
                </Button>
              ))}
            </div>
          </div>

          {/* Grid de Cards dos Temas */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {filteredTopics.map((topic) => {
              const isCopied = copiadoSlug === topic.slug;

              return (
                <Card
                  key={topic.slug}
                  className="flex flex-col justify-between border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md"
                >
                  <div className="space-y-3">
                    {/* Topo do Card */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                          {getTopicIcon(topic.icon)}
                        </div>
                        <div>
                          <h3 className="font-serif text-base font-bold text-foreground leading-tight">
                            {topic.title}
                          </h3>
                          <div className="text-[11px] text-muted-foreground">
                            {topic.short_title}
                          </div>
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className="text-[10px] px-2 py-0.5 border-border/80 text-muted-foreground shrink-0"
                      >
                        v1 (2026)
                      </Badge>
                    </div>

                    {/* Descrição Curta */}
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {topic.description}
                    </p>

                    {/* Gatilho Clínico Automático */}
                    <div className="rounded-lg border border-primary/15 bg-primary/5 p-2.5 text-xs">
                      <div className="font-semibold text-[11px] text-primary flex items-center gap-1.5">
                        <GitBranch className="h-3 w-3" />
                        Gatilho na Triagem:
                      </div>
                      <div className="text-[11px] text-foreground/80 mt-0.5 font-medium">
                        {topic.triggersDescription}
                      </div>
                    </div>

                    {/* Resumo do Paciente (Prévia) */}
                    <div className="rounded-lg bg-muted/40 p-3 text-xs text-foreground/85 leading-relaxed line-clamp-3 italic">
                      "{topic.resumo_card}"
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {topic.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground border border-border"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Ações do Card */}
                  <div className="mt-5 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyForPatient(topic)}
                      className="h-8 gap-1.5 text-xs"
                      title="Copiar resumo formatado para enviar no WhatsApp ou prontuário"
                    >
                      {isCopied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copiar Texto</span>
                        </>
                      )}
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => setSelectedTopic(topic)}
                      className="h-8 gap-1.5 text-xs font-semibold"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Ver Guia Completo</span>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {filteredTopics.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
              Nenhum tema localizado para o termo "{busca}".
            </div>
          )}
        </div>
      )}

      {/* ABA 2: MATRIZ DE REGRAS DE GATILHOS CLÍNICOS AUTOMÁTICOS */}
      {activeTab === "regras" && (
        <Card className="p-5 sm:p-6 border-border bg-card">
          <div className="mb-4">
            <h2 className="font-serif text-lg font-bold text-foreground">
              Matriz de Disparo Automatizado na Triagem
            </h2>
            <p className="text-xs text-muted-foreground">
              Quando um paciente responde às escalas da pré-avaliação, o motor clínico avalia as
              pontuações e vincula automaticamente os temas correspondentes ao portal dele.
            </p>
          </div>

          <div className="divide-y divide-border/80 rounded-xl border border-border overflow-hidden">
            {PSYCHOEDUCATION_TRIGGER_SPECS.map((rule: PsychoTriggerSpec, idx: number) => {
              const topicDef = OFFICIAL_PSYCHOEDUCATION_TOPICS.find(
                (t) => t.slug === rule.topicSlug,
              );

              return (
                <div
                  key={idx}
                  className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-serif font-bold text-sm text-foreground">
                        {topicDef?.title ?? rule.topicSlug}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0.5 ${
                          rule.priority === "urgente"
                            ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 font-bold"
                            : "border-primary/30 bg-primary/10 text-primary"
                        }`}
                      >
                        {rule.priority === "urgente" ? "Acolhimento Crítico" : "Rotina Clínica"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{rule.description}</p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-foreground/80">
                      <span className="font-semibold text-primary">Critério:</span>
                      <span className="font-mono bg-muted/60 px-1.5 py-0.5 rounded">
                        {rule.criterion}
                      </span>
                      <span className="text-muted-foreground">|</span>
                      <span className="text-muted-foreground font-mono">
                        Escalas: {rule.scales.join(", ")}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 pt-2 sm:pt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (topicDef) setSelectedTopic(topicDef);
                      }}
                      className="h-7 text-xs gap-1"
                    >
                      <Eye className="h-3 w-3" />
                      Visualizar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ABA 3: MATERIAIS TÉCNICOS PARA A EQUIPE CLÍNICA */}
      {activeTab === "tecnicos" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Card 1: Protocolo de Risco de Suicídio */}
            <Card className="p-5 border-border bg-card flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-base font-bold text-foreground">
                      Protocolo de Manejo de Risco de Suicídio
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Algoritmo C-SSRS e Plano de Segurança Colaborativo
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Fluxograma de acolhimento prioritário quando o paciente pontua no item 9 do PHQ-9
                  (≥ 1) ou quando a via de risco clínico composta é acionada. Inclui direcionamento
                  imediato para CVV 188 e SAMU 192.
                </p>
                <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
                  <div className="font-semibold text-foreground">
                    Ações de Segurança no Consultório:
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground text-[11px]">
                    <li>Notificação visual imediata no Cockpit do Médico (Badge Vermelho)</li>
                    <li>Liberação do módulo de crise com plano de segurança no portal</li>
                    <li>Mensagem humanizada automática com canais de emergência 24h</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border flex justify-end">
                <Button size="sm" asChild variant="outline" className="h-8 gap-1.5 text-xs">
                  <Link to="/protocolo">
                    <GitBranch className="h-3.5 w-3.5" />
                    <span>Ver Árvore de Risco</span>
                  </Link>
                </Button>
              </div>
            </Card>

            {/* Card 2: Pontos de Corte das 28 Escalas */}
            <Card className="p-5 border-border bg-card flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                    <Lightbulb className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-base font-bold text-foreground">
                      Interpretação e Pontos de Corte
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Manual psicométrico das 28 escalas clínicas
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Guia de faixas de corte de severidade para PHQ-9, GAD-7, ISI, ASRS-18, AUDIT,
                  DAST-10, PCL-5, MDQ, EPDS, AD-8, GDS-15, SNAP-IV e WHO-5.
                </p>
                <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
                  <div className="font-semibold text-foreground">Destaques psicométricos:</div>
                  <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground text-[11px]">
                    <li>Validação brasileira com sensibilidade e especificidade documentadas</li>
                    <li>Classificação por cores (Mínimo, Leve, Moderado, Grave)</li>
                    <li>Exportação em PDF clínico com gráficos diagnósticos</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border flex justify-end">
                <Button size="sm" asChild variant="outline" className="h-8 gap-1.5 text-xs">
                  <Link to="/interpretar">
                    <ArrowRight className="h-3.5 w-3.5" />
                    <span>Consultar Pontos de Corte</span>
                  </Link>
                </Button>
              </div>
            </Card>

            {/* Card 3: Modelo de Prontuário Médico */}
            <Card className="p-5 border-border bg-card flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-base font-bold text-foreground">
                      Modelo de Registro em Prontuário
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Template padronizado a partir da triagem digital
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Estrutura pronta para colar no prontuário eletrônico do seu consultório (CFM/CRM e
                  LGPD compatíveis).
                </p>
                <div className="rounded-lg bg-muted/40 p-2.5 font-mono text-[11px] text-muted-foreground space-y-0.5 overflow-hidden">
                  <div>REGISTRO DE TRIAGEM CLÍNICA E PSICOEDUCAÇÃO</div>
                  <div>- Queixa Principal & Linha do Tempo</div>
                  <div>- Escalas & Pontuações Psicométricas</div>
                  <div>- Conduta & Materiais Educativos Entregues</div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyProntuarioModel}
                  className="h-8 gap-1.5 text-xs"
                >
                  {copiadoModelo ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copiar Template</span>
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {/* Card 4: NR-01 e Saúde Mental Ocupacional */}
            <Card className="p-5 border-border bg-card flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600">
                    <ClipboardCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-base font-bold text-foreground">
                      NR-01 e Riscos Psicossociais
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Diretrizes do Ministério do Trabalho e Emprego
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Avaliação de estresse crônico (PSS-10) e esgotamento profissional (Burnout) em
                  conformidade com as novas exigências da NR-01 para empresas e consultórios.
                </p>
                <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
                  <div className="font-semibold text-foreground">Aplicações ocupacionais:</div>
                  <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground text-[11px]">
                    <li>Identificação de sobrecarga e risco ergonômico cognitivo</li>
                    <li>Recomendações de limites e pausas ativas na rotina de trabalho</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border flex justify-end">
                <Button size="sm" asChild variant="outline" className="h-8 gap-1.5 text-xs">
                  <Link to="/ocupacional">
                    <ArrowRight className="h-3.5 w-3.5" />
                    <span>Ver Módulo NR-01</span>
                  </Link>
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* MODAL / DRAWER DE VISUALIZAÇÃO COMPLETA DO GUIA */}
      {selectedTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl max-h-[90vh] flex flex-col">
            {/* Topo do Modal */}
            <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  {getTopicIcon(selectedTopic.icon)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="border-primary/30 bg-primary/10 text-primary text-[10px]"
                    >
                      Material de Psicoeducação
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">
                      /{selectedTopic.slug}
                    </span>
                  </div>
                  <h2 className="font-serif text-xl font-bold text-foreground mt-0.5">
                    {selectedTopic.title}
                  </h2>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full"
                onClick={() => setSelectedTopic(null)}
              >
                ✕
              </Button>
            </div>

            {/* Conteúdo com rolagem */}
            <div className="mt-4 flex-1 overflow-y-auto pr-2 space-y-4 text-sm leading-relaxed">
              {/* Card Resumo do Paciente */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1.5">
                <div className="text-xs font-semibold text-primary uppercase tracking-wider">
                  Resumo Entregue ao Paciente no Portal:
                </div>
                <p className="text-xs sm:text-sm text-foreground/90 italic">
                  "{selectedTopic.resumo_card}"
                </p>
              </div>

              {/* Gatilho Clínico */}
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs flex items-center justify-between">
                <div>
                  <span className="font-semibold text-foreground">Critério de disparo: </span>
                  <span className="text-muted-foreground">{selectedTopic.triggersDescription}</span>
                </div>
                <div className="flex gap-1">
                  {selectedTopic.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] bg-background px-1.5 py-0.5 rounded border border-border"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Texto Clínico Completo */}
              <div className="prose prose-sm dark:prose-invert max-w-none text-xs sm:text-sm whitespace-pre-line text-foreground/90">
                {selectedTopic.body_md}
              </div>
            </div>

            {/* Rodapé de Ações do Modal */}
            <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyForPatient(selectedTopic)}
                className="h-8 gap-1.5 text-xs"
              >
                {copiadoSlug === selectedTopic.slug ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Copiado para WhatsApp</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-3.5 w-3.5" />
                    <span>Copiar p/ Enviar ao Paciente</span>
                  </>
                )}
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="h-8 gap-1.5 text-xs"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Imprimir</span>
                </Button>
                <Button size="sm" onClick={() => setSelectedTopic(null)} className="h-8 text-xs">
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PainelShell>
  );
}
