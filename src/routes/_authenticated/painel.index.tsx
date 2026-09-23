import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import { listAssessments, getMyAccess, getAssessment } from "@/lib/painel.functions";
import { AcessoNegado } from "@/components/painel/AcessoNegado";
import { isAccessDenied } from "@/lib/access-error";
import { PainelShell, BandBadge } from "@/components/painel/PainelShell";
import { computeQueueImpact, impactSentence } from "@/lib/queue-impact";
import { InformanteMetrics } from "@/components/painel/InformanteMetrics";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buildPdfPayload } from "@/lib/pdf-payload";
import { logReportExport } from "@/lib/audit.functions";
import { downloadClinicianPdf, downloadPatientPdf } from "@/lib/pdf-report";
import {
  describeView,
  loadSavedViews,
  persistSavedViews,
  loadPainelSession,
  persistPainelSession,
  type PainelViewFilters,
  type SavedView,
} from "@/lib/saved-views";
import {
  loadReviewed,
  saveReviewQueue,
  toggleReviewed,
  markReviewedBulk,
} from "@/lib/review-queue";
import { addAssessmentNote } from "@/lib/notes.functions";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { MobileTriageCard } from "@/components/painel/MobileTriageCard";
import {
  PainelFiltros,
  PainelViews,
  type PainelFiltrosProps,
} from "@/components/painel/PainelFiltros";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/_authenticated/painel/")({
  head: () => ({
    meta: [
      { title: "Triagens recebidas — Painel do profissional" },
      {
        name: "description",
        content:
          "Lista das pré-triagens respondidas pelos pacientes, com escores e faixas de gravidade.",
      },
      { property: "og:title", content: "Triagens recebidas" },
      { property: "og:description", content: "Painel do profissional." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PainelLista,
});

function PainelLista() {
  const prefersReduced = useReducedMotion();
  const fetchList = useServerFn(listAssessments);
  const fetchAccess = useServerFn(getMyAccess);
  const fetchOne = useServerFn(getAssessment);
  const logExport = useServerFn(logReportExport);
  const [clinicFilter, setClinicFilter] = useState<string>("todas");
  const [busca, setBusca] = useState("");
  const [riscoFilter, setRiscoFilter] = useState<"todos" | "risco" | "atencao" | "sem">("todos");

  const [escalaFilter, setEscalaFilter] = useState<string>("todas");
  const [statusFilter, setStatusFilter] = useState<"todos" | "enviado" | "pendente">("todos");
  const [informanteFilter, setInformanteFilter] = useState<"todos" | "paciente" | "familiar">(
    "todos",
  );
  const [medicoFilter, setMedicoFilter] = useState<string>("todos");
  const [ordem, setOrdem] = useState<
    "submitted_desc" | "submitted_asc" | "created_desc" | "created_asc" | "nome_asc" | "nome_desc"
  >("submitted_desc");
  const [campoData, setCampoData] = useState<"submitted" | "created">("submitted");
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");
  const [porPagina, setPorPagina] = useState(20);
  const [pagina, setPagina] = useState(1);
  const [pdfBusy, setPdfBusy] = useState<string | null>(null);
  const [modo, setModo] = useState<"fila" | "cartoes">("fila");
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [filtrosSheetAberto, setFiltrosSheetAberto] = useState(false);
  const [metricasAbertas, setMetricasAbertas] = useState(false);
  const isMobile = useIsMobile();
  const [revisados, setRevisados] = useState<string[]>([]);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [loteAberto, setLoteAberto] = useState(false);
  const [notaLote, setNotaLote] = useState("");
  const [salvandoLote, setSalvandoLote] = useState(false);
  const addNote = useServerFn(addAssessmentNote);

  useEffect(() => {
    setRevisados(loadReviewed());
  }, []);

  const [views, setViews] = useState<SavedView[]>([]);
  const [novoNome, setNovoNome] = useState("");
  const [viewAtiva, setViewAtiva] = useState<string | null>(null);

  const [restaurado, setRestaurado] = useState(false);

  useEffect(() => {
    setViews(loadSavedViews());
    const sessao = loadPainelSession();
    if (sessao) {
      const f = sessao.filters;
      setBusca(f.busca ?? "");
      setRiscoFilter(f.risco ?? "todos");
      setEscalaFilter(f.escala ?? "todas");
      setStatusFilter(f.status ?? "todos");
      setClinicFilter(f.clinica ?? "todas");
      setInformanteFilter(f.informante ?? "todos");
      setOrdem(f.ordem ?? "submitted_desc");
      setPorPagina(f.porPagina ?? 20);
      setCampoData(f.campoData ?? "submitted");
      setDataDe(f.dataDe ?? "");
      setDataAte(f.dataAte ?? "");
      setModo(sessao.modo ?? "fila");
      setFiltrosAbertos(Boolean(sessao.filtrosAbertos));
    } else if (window.innerWidth < 768) {
      // No celular, cartões são a visão padrão — a tabela exigiria rolagem horizontal.
      setModo("cartoes");
    }
    setRestaurado(true);
  }, []);

  useEffect(() => {
    function handleTenantChange(e: Event) {
      const detail = (e as CustomEvent<string>).detail;
      if (detail) {
        setClinicFilter(detail);
      }
    }
    window.addEventListener("tenant-changed", handleTenantChange);
    const saved = localStorage.getItem("triagem_active_clinic_id");
    if (saved) {
      setClinicFilter(saved);
    }
    return () => window.removeEventListener("tenant-changed", handleTenantChange);
  }, []);

  useEffect(() => {
    setPagina(1);
  }, [
    busca,
    riscoFilter,
    escalaFilter,
    statusFilter,
    clinicFilter,
    informanteFilter,
    medicoFilter,
    campoData,
    dataDe,
    dataAte,
  ]);

  const filtrosAtuais: PainelViewFilters = {
    busca,
    risco: riscoFilter,
    escala: escalaFilter,
    status: statusFilter,
    clinica: clinicFilter,
    informante: informanteFilter,
    ordem,
    porPagina,
    campoData,
    dataDe,
    dataAte,
  };

  useEffect(() => {
    if (!restaurado) return;
    persistPainelSession({ filters: filtrosAtuais, modo, filtrosAbertos });
  }, [
    restaurado,
    busca,
    riscoFilter,
    escalaFilter,
    statusFilter,
    clinicFilter,
    informanteFilter,
    ordem,
    porPagina,
    campoData,
    dataDe,
    dataAte,
    modo,
    filtrosAbertos,
  ]);

  function salvarView() {
    const nome = novoNome.trim();
    if (!nome) return;
    const existente = views.find((v) => v.name.toLowerCase() === nome.toLowerCase());
    const view: SavedView = {
      id: existente?.id ?? crypto.randomUUID(),
      name: nome,
      filters: filtrosAtuais,
    };
    const próximas = existente
      ? views.map((v) => (v.id === existente.id ? view : v))
      : [...views, view];
    setViews(próximas);
    persistSavedViews(próximas);
    setViewAtiva(view.id);
    setNovoNome("");
  }

  function aplicarView(v: SavedView) {
    setBusca(v.filters.busca);
    setRiscoFilter(v.filters.risco);
    setEscalaFilter(v.filters.escala);
    setStatusFilter(v.filters.status);
    setClinicFilter(v.filters.clinica);
    setInformanteFilter(v.filters.informante ?? "todos");
    setOrdem(v.filters.ordem);
    setPorPagina(v.filters.porPagina);
    setCampoData(v.filters.campoData ?? "submitted");
    setDataDe(v.filters.dataDe ?? "");
    setDataAte(v.filters.dataAte ?? "");
    setPagina(1);
    setViewAtiva(v.id);
  }

  function removerView(id: string) {
    const próximas = views.filter((v) => v.id !== id);
    setViews(próximas);
    persistSavedViews(próximas);
    if (viewAtiva === id) setViewAtiva(null);
  }

  async function baixarPdf(id: string, tipo: "paciente" | "clinico") {
    setPdfBusy(`${id}:${tipo}`);
    try {
      const full = await fetchOne({ data: { id } });
      if (!full) return;
      const payload = buildPdfPayload(full as never);
      if (tipo === "clinico") downloadClinicianPdf(payload);
      else downloadPatientPdf(payload);
      void logExport({ data: { assessment_id: id, kind: tipo } }).catch(() => {});
    } finally {
      setPdfBusy(null);
    }
  }

  const { data: access, isLoading: loadingAccess } = useQuery({
    queryKey: ["my-access"],
    queryFn: () => fetchAccess(),
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["assessments"],
    queryFn: () => fetchList(),
    enabled: access?.hasAccess === true,
  });

  if (loadingAccess) {
    return (
      <PainelShell title="Triagens recebidas">
        <p className="text-sm text-muted-foreground">Verificando seu acesso…</p>
      </PainelShell>
    );
  }

  if (access && !access.hasAccess) {
    return (
      <PainelShell title="Triagens recebidas">
        <Card className="p-6">
          <h2 className="font-serif text-lg font-semibold text-foreground">
            Acesso ainda não liberado
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sua conta foi criada, mas ainda não está vinculada a nenhuma clínica. Peça a um
            administrador para liberar seu acesso — ele define se você enxerga uma clínica
            específica ou todas.
          </p>
        </Card>
      </PainelShell>
    );
  }

  const multiClinica = (access?.clinics.length ?? 0) > 1;

  const escalasDisponiveis = Array.from(
    new Set((data ?? []).flatMap((a) => a.scales.map((s) => s.scale_code))),
  ).sort();

  const medicosDisponiveis = Array.from(
    new Map(
      (data ?? [])
        .filter((a) => a.doctor_id && a.doctor_name)
        .map((a) => [a.doctor_id as string, a.doctor_name as string]),
    ),
  ).sort((x, y) => x[1].localeCompare(y[1], "pt-BR"));

  const termo = busca.trim().toLowerCase();
  const lista = (data ?? []).filter((a) => {
    if (clinicFilter !== "todas" && a.clinic_id !== clinicFilter) return false;

    const risco = a.risk_flags.length > 0 || a.summary?.risk_pathway === true;
    const atencao = a.scales.some((s) => (s.band_level ?? 0) >= 2);
    if (riscoFilter === "risco" && !risco) return false;
    if (riscoFilter === "atencao" && (risco || !atencao)) return false;
    if (riscoFilter === "sem" && (risco || atencao)) return false;

    if (escalaFilter !== "todas" && !a.scales.some((s) => s.scale_code === escalaFilter))
      return false;

    if (dataDe || dataAte) {
      const bruto = campoData === "created" ? a.created_at : a.submitted_at;
      const dia = new Date(bruto).toLocaleDateString("sv-SE");
      if (dataDe && dia < dataDe) return false;
      if (dataAte && dia > dataAte) return false;
    }

    if (informanteFilter !== "todos" && a.respondent_type !== informanteFilter) return false;

    if (medicoFilter === "nenhum" && a.doctor_id) return false;
    if (medicoFilter !== "todos" && medicoFilter !== "nenhum" && a.doctor_id !== medicoFilter)
      return false;

    const enviado = a.status === "completed";
    if (statusFilter === "enviado" && !enviado) return false;
    if (statusFilter === "pendente" && enviado) return false;

    if (termo) {
      const alvo = [
        a.respondent_name,
        a.respondent_email ?? "",
        a.clinic_name ?? "",
        a.informant_name ?? "",
        a.informant_relation ?? "",
        a.respondent_type === "familiar" ? "familiar responsavel" : "paciente",
        ...a.scales.map((s) => s.scale_code),
      ]
        .join(" ")
        .toLowerCase();
      if (!alvo.includes(termo)) return false;
    }
    return true;
  });

  const listaOrdenada = [...lista].sort((a, b) => {
    switch (ordem) {
      case "submitted_asc":
        return a.submitted_at.localeCompare(b.submitted_at);
      case "created_desc":
        return b.created_at.localeCompare(a.created_at);
      case "created_asc":
        return a.created_at.localeCompare(b.created_at);
      case "nome_asc":
        return a.respondent_name.localeCompare(b.respondent_name, "pt-BR");
      case "nome_desc":
        return b.respondent_name.localeCompare(a.respondent_name, "pt-BR");
      default:
        return b.submitted_at.localeCompare(a.submitted_at);
    }
  });

  const totalPaginas = Math.max(1, Math.ceil(listaOrdenada.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicio = (paginaAtual - 1) * porPagina;
  // No celular a paginação vira "Carregar mais": acumula os itens já carregados.
  const pagina_itens = isMobile
    ? listaOrdenada.slice(0, paginaAtual * porPagina)
    : listaOrdenada.slice(inicio, inicio + porPagina);

  /* ---------- seleção múltipla / revisão em lote ---------- */
  const idsPagina = pagina_itens.map((a) => a.id);
  const selecionadosPagina = selecionados.filter((id) => idsPagina.includes(id));
  const todosSelecionados = idsPagina.length > 0 && selecionadosPagina.length === idsPagina.length;

  function alternarSelecao(id: string) {
    setSelecionados((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id],
    );
  }

  function alternarTodos() {
    setSelecionados((atual) =>
      todosSelecionados
        ? atual.filter((id) => !idsPagina.includes(id))
        : Array.from(new Set([...atual, ...idsPagina])),
    );
  }

  async function confirmarLote() {
    setSalvandoLote(true);
    try {
      const nota = notaLote.trim();
      if (nota.length >= 3) {
        for (const id of selecionados) {
          try {
            await addNote({
              data: { assessment_id: id, body: `[Revisão] ${nota}` },
            });
          } catch {
            /* segue para as demais */
          }
        }
      }
      setRevisados(markReviewedBulk(selecionados));
      setSelecionados([]);
      setNotaLote("");
      setLoteAberto(false);
    } finally {
      setSalvandoLote(false);
    }
  }

  /** Guarda a ordem atual para navegar em lote dentro do detalhe. */
  function enfileirar() {
    saveReviewQueue(
      listaOrdenada.map((a) => a.id),
      describeView(filtrosAtuais),
    );
  }

  const base = (data ?? []).filter((a) => clinicFilter === "todas" || a.clinic_id === clinicFilter);
  const contagem = {
    total: base.length,
    risco: base.filter((a) => a.risk_flags.length > 0 || a.summary?.risk_pathway === true).length,
    atencao: base.filter(
      (a) =>
        !(a.risk_flags.length > 0 || a.summary?.risk_pathway === true) &&
        a.scales.some((s) => (s.band_level ?? 0) >= 2),
    ).length,
    revisados: base.filter((a) => revisados.includes(a.id)).length,
  };
  const impactoFila = computeQueueImpact(
    base.map((a) => ({
      id: a.id,
      submitted_at: a.submitted_at,
      risk: a.risk_flags.length > 0 || a.summary?.risk_pathway === true,
      level: Math.max(0, ...a.scales.map((s) => s.band_level ?? 0)),
    })),
  );
  const atalhos = [
    { key: "todos" as const, label: "Todas", valor: contagem.total },
    { key: "risco" as const, label: "Via de risco", valor: contagem.risco },
    { key: "atencao" as const, label: "Atenção", valor: contagem.atencao },
    {
      key: "sem" as const,
      label: "Sem alteração",
      valor: contagem.total - contagem.risco - contagem.atencao,
    },
  ];

  const filtrosAtivos =
    clinicFilter !== "todas" ||
    riscoFilter !== "todos" ||
    escalaFilter !== "todas" ||
    statusFilter !== "todos" ||
    informanteFilter !== "todos" ||
    medicoFilter !== "todos" ||
    dataDe !== "" ||
    dataAte !== "" ||
    termo.length > 0;

  function limparFiltros() {
    setBusca("");
    setRiscoFilter("todos");
    setEscalaFilter("todas");
    setStatusFilter("todos");
    setClinicFilter("todas");
    setInformanteFilter("todos");
    setMedicoFilter("todos");
    setDataDe("");
    setDataAte("");
    setCampoData("submitted");
    setPagina(1);
  }

  const filtrosProps: PainelFiltrosProps = {
    risco: riscoFilter,
    onRisco: setRiscoFilter,
    escala: escalaFilter,
    onEscala: setEscalaFilter,
    escalasDisponiveis,
    status: statusFilter,
    onStatus: setStatusFilter,
    informante: informanteFilter,
    onInformante: setInformanteFilter,
    medico: medicoFilter,
    onMedico: setMedicoFilter,
    medicosDisponiveis,
    multiClinica,
    clinica: clinicFilter,
    onClinica: setClinicFilter,
    clinics: access?.clinics ?? [],
    campoData,
    onCampoData: setCampoData,
    dataDe,
    onDataDe: setDataDe,
    dataAte,
    onDataAte: setDataAte,
    ordem,
    onOrdem: (v) => {
      setOrdem(v);
      setPagina(1);
    },
    porPagina,
    onPorPagina: (n) => {
      setPorPagina(n);
      setPagina(1);
    },
  };

  const nFiltrosAtivos = [
    clinicFilter !== "todas",
    escalaFilter !== "todas",
    statusFilter !== "todos",
    informanteFilter !== "todos",
    medicoFilter !== "todos",
    dataDe !== "",
    dataAte !== "",
  ].filter(Boolean).length;

  const mostrarTabela = modo === "fila" && !isMobile;

  const chipsAtalhos = atalhos.map((c) => (
    <button
      key={c.key}
      type="button"
      onClick={() => setRiscoFilter(c.key)}
      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        riscoFilter === c.key
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {c.label}
      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
        {c.valor}
      </span>
    </button>
  ));

  return (
    <PainelShell
      title="Triagens recebidas"
      action={
        access && (
          <span className="hidden rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground sm:inline-flex">
            {access.isAdmin ? "Admin" : "Clínico"} ·{" "}
            {access.global
              ? "todas as clínicas"
              : access.clinics.map((c) => c.name).join(", ") || "sem clínica"}
          </span>
        )
      }
    >
      {/* Barra fixa de busca + chips — mobile */}
      {isMobile === true && (
        <div className="sticky top-0 z-20 -mx-4 mb-3 space-y-2 border-b border-border bg-background/95 px-4 py-2 backdrop-blur">
          <div className="flex items-center gap-2">
            <label htmlFor="busca-m" className="sr-only">
              Buscar triagem
            </label>
            <input
              id="busca-m"
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, e-mail ou escala…"
              className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm text-foreground"
            />
            <Button
              variant="outline"
              className="min-h-11 shrink-0 gap-1.5"
              onClick={() => setFiltrosSheetAberto(true)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtros{nFiltrosAtivos > 0 ? ` (${nFiltrosAtivos})` : ""}
            </Button>
          </div>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">{chipsAtalhos}</div>
        </div>
      )}

      {/* Controles completos — desktop */}
      {isMobile === false && (
        <Card className="mb-4 space-y-3 p-4">
          <PainelViews
            views={views}
            viewAtiva={viewAtiva}
            novoNome={novoNome}
            onNovoNome={setNovoNome}
            onSalvar={salvarView}
            onAplicar={aplicarView}
            onRemover={removerView}
          />

          <div>
            <label htmlFor="busca" className="sr-only">
              Buscar triagem
            </label>
            <input
              id="busca"
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, e-mail, clínica ou escala…"
              className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {chipsAtalhos}
            <span className="text-xs text-muted-foreground">
              {contagem.revisados} revisada(s) nesta sessão
            </span>
          </div>

          {impactoFila.graves > 0 ? (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
              <span className="font-medium">Ganho da fila priorizada por risco: </span>
              <span className="text-muted-foreground">{impactSentence(impactoFila)}</span>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex overflow-hidden rounded-md border border-border">
              <button
                type="button"
                onClick={() => setModo("fila")}
                className={`px-3 py-1.5 text-xs font-medium ${
                  modo === "fila"
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Fila de revisão
              </button>
              <button
                type="button"
                onClick={() => setModo("cartoes")}
                className={`border-l border-border px-3 py-1.5 text-xs font-medium ${
                  modo === "cartoes"
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Cartões
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={() => setFiltrosAbertos((v) => !v)}>
              {filtrosAbertos ? "Ocultar filtros" : "Mais filtros"}
              {filtrosAtivos ? " · ativos" : ""}
            </Button>
          </div>

          {filtrosAbertos && <PainelFiltros {...filtrosProps} />}

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {lista.length} de {data?.length ?? 0} triagem(ns) · página {paginaAtual} de{" "}
              {totalPaginas}
            </span>

            {filtrosAtivos && (
              <Button variant="ghost" size="sm" onClick={limparFiltros}>
                Limpar filtros
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Gaveta de filtros — mobile */}
      <Sheet open={filtrosSheetAberto} onOpenChange={setFiltrosSheetAberto}>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] overflow-y-auto rounded-t-2xl pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="pb-2 text-left">
            <SheetTitle className="font-serif">Filtros e visualizações</SheetTitle>
          </SheetHeader>
          <div className="space-y-5">
            <PainelViews
              views={views}
              viewAtiva={viewAtiva}
              novoNome={novoNome}
              onNovoNome={setNovoNome}
              onSalvar={salvarView}
              onAplicar={(v) => {
                aplicarView(v);
                setFiltrosSheetAberto(false);
              }}
              onRemover={removerView}
            />
            <PainelFiltros {...filtrosProps} />
            <div className="flex items-center gap-2">
              {filtrosAtivos && (
                <Button variant="ghost" onClick={limparFiltros}>
                  Limpar
                </Button>
              )}
              <Button className="min-h-11 flex-1" onClick={() => setFiltrosSheetAberto(false)}>
                Mostrar {lista.length} triagem(ns)
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {isMobile === false && <InformanteMetrics itens={lista} campoData={campoData} />}

      {isLoading && (
        <div className="space-y-3" aria-busy="true" aria-label="Carregando triagens">
          <div className="h-16 w-full animate-pulse rounded-xl bg-muted/60" />
          <div className="h-16 w-full animate-pulse rounded-xl bg-muted/40" />
          <div className="h-16 w-full animate-pulse rounded-xl bg-muted/20" />
        </div>
      )}
      {error && isAccessDenied(error) && (
        <AcessoNegado error={error} title="Acesso negado a estas triagens" backToPainel={false} />
      )}
      {error && !isAccessDenied(error) && (
        <Card className="flex flex-col items-center justify-center gap-3 border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-medium text-destructive">
            {error instanceof Error ? error.message : "Erro ao carregar triagens."}
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </Card>
      )}
      {!isLoading && !error && lista && lista.length === 0 && (
        <Card className="flex flex-col items-center justify-center gap-3 p-8 text-center text-sm text-muted-foreground">
          <p>Nenhuma triagem encontrada para os filtros atuais.</p>
          {filtrosAtivos && (
            <Button variant="outline" size="sm" onClick={limparFiltros}>
              Limpar filtros aplicados
            </Button>
          )}
        </Card>
      )}

      {selecionados.length > 0 && (
        <Card className="flex flex-wrap items-center justify-between gap-2 border-primary/40 bg-primary/5 p-3 text-sm">
          <span className="font-medium">{selecionados.length} triagem(ns) selecionada(s)</span>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelecionados([])}>
              Limpar seleção
            </Button>
            <Button size="sm" onClick={() => setLoteAberto(true)}>
              Marcar como revisadas
            </Button>
          </div>
        </Card>
      )}

      <Dialog open={loteAberto} onOpenChange={(v) => !salvandoLote && setLoteAberto(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar triagens como revisadas</DialogTitle>
            <DialogDescription>
              {selecionados.length} triagem(ns) serão marcadas como revisadas. Confirme antes de
              salvar. A observação abaixo é opcional e será registrada no histórico de pareceres de
              cada triagem.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={notaLote}
            onChange={(e) => setNotaLote(e.target.value.slice(0, 5000))}
            rows={4}
            placeholder="Observações da revisão (opcional)"
            disabled={salvandoLote}
          />

          <DialogFooter>
            <Button variant="ghost" onClick={() => setLoteAberto(false)} disabled={salvandoLote}>
              Cancelar
            </Button>
            <Button onClick={() => void confirmarLote()} disabled={salvandoLote}>
              {salvandoLote ? "Salvando…" : `Confirmar ${selecionados.length} revisão(ões)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {mostrarTabela ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">
                    <input
                      type="checkbox"
                      aria-label="Selecionar todas as triagens desta página"
                      checked={todosSelecionados}
                      onChange={alternarTodos}
                      className="h-4 w-4 accent-[hsl(var(--primary))]"
                    />
                  </th>
                  <th className="px-3 py-2 font-medium">Paciente</th>
                  <th className="px-3 py-2 font-medium">Envio</th>
                  <th className="px-3 py-2 font-medium">Quem preencheu</th>
                  <th className="px-3 py-2 font-medium">Escalas e escores</th>
                  <th className="px-3 py-2 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <motion.tbody
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: prefersReduced ? 0 : 0.02 } },
                }}
              >
                {pagina_itens.map((a) => {
                  const risco = a.risk_flags.length > 0 || a.summary?.risk_pathway;
                  const atencao = a.scales.some((s) => (s.band_level ?? 0) >= 2);
                  const feito = revisados.includes(a.id);
                  return (
                    <motion.tr
                      key={a.id}
                      variants={{
                        hidden: { opacity: 0, y: prefersReduced ? 0 : 4 },
                        show: {
                          opacity: 1,
                          y: 0,
                          transition: { duration: prefersReduced ? 0.12 : 0.22 },
                        },
                      }}
                      className={`border-b border-border align-top last:border-0 ${
                        risco ? "bg-destructive/5" : feito ? "opacity-60" : ""
                      }`}
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Selecionar triagem de ${a.respondent_name}`}
                          checked={selecionados.includes(a.id)}
                          onChange={() => alternarSelecao(a.id)}
                          className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-start gap-2">
                          <span
                            aria-hidden
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                              risco
                                ? "bg-destructive"
                                : atencao
                                  ? "bg-warning"
                                  : "bg-muted-foreground/40"
                            }`}
                          />
                          <div className="min-w-0">
                            <Link
                              to="/painel/$id"
                              params={{ id: a.id }}
                              onClick={() => enfileirar()}
                              className="block truncate font-medium text-foreground hover:underline"
                            >
                              {a.respondent_name}
                            </Link>
                            <div className="text-xs text-muted-foreground">
                              {a.respondent_age != null
                                ? `${a.respondent_age} anos`
                                : "idade não informada"}
                              {multiClinica && a.clinic_name ? ` · ${a.clinic_name}` : ""}
                            </div>
                            <span className="mt-1 flex flex-wrap gap-1">
                              {risco && (
                                <span className="inline-flex rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                                  Via de risco
                                </span>
                              )}
                              {a.doctor_name && (
                                <span className="inline-flex rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                                  → {a.doctor_name}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
                        {new Date(a.submitted_at).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {a.respondent_type === "familiar"
                          ? `Familiar/responsável${
                              a.informant_name ? ` — ${a.informant_name}` : ""
                            }${a.informant_relation ? ` (${a.informant_relation})` : ""}`
                          : "O próprio paciente"}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {a.scales.length === 0 && (
                            <span className="text-xs text-muted-foreground">
                              Sem escalas aplicadas
                            </span>
                          )}
                          {a.scales.map((s) => (
                            <BandBadge
                              key={s.scale_code}
                              level={s.band_level ?? 0}
                              label={`${s.scale_code}: ${s.score ?? "—"}${
                                s.band ? ` · ${s.band}` : ""
                              }`}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            variant={feito ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setRevisados(toggleReviewed(a.id))}
                          >
                            {feito ? "Revisado ✓" : "Revisado"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={pdfBusy === `${a.id}:clinico`}
                            onClick={() => baixarPdf(a.id, "clinico")}
                          >
                            {pdfBusy === `${a.id}:clinico` ? "Gerando…" : "PDF"}
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </motion.tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {pagina_itens.map((a) => (
            <MobileTriageCard
              key={a.id}
              a={a}
              multiClinica={multiClinica}
              feito={revisados.includes(a.id)}
              selecionado={selecionados.includes(a.id)}
              pdfBusy={pdfBusy}
              onOpen={() => enfileirar()}
              onToggleSelecao={() => alternarSelecao(a.id)}
              onToggleRevisado={() => setRevisados(toggleReviewed(a.id))}
              onPdf={(tipo) => void baixarPdf(a.id, tipo)}
            />
          ))}
        </div>
      )}

      {listaOrdenada.length > 0 &&
        (isMobile ? (
          /* Mobile: carregar mais acumulando */
          <div className="mt-4">
            {paginaAtual < totalPaginas ? (
              <Button
                variant="outline"
                className="min-h-11 w-full"
                onClick={() => setPagina(paginaAtual + 1)}
              >
                Carregar mais ({listaOrdenada.length - pagina_itens.length} restantes)
              </Button>
            ) : (
              <p className="text-center text-xs text-muted-foreground">
                {listaOrdenada.length} triagem(ns) exibidas
              </p>
            )}
          </div>
        ) : (
          /* Desktop: paginação clássica */
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              Mostrando {inicio + 1}–{Math.min(inicio + porPagina, listaOrdenada.length)} de{" "}
              {listaOrdenada.length}
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={paginaAtual <= 1}
                onClick={() => setPagina(paginaAtual - 1)}
              >
                Anterior
              </Button>
              <span className="text-xs text-muted-foreground">
                Página {paginaAtual} de {totalPaginas}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={paginaAtual >= totalPaginas}
                onClick={() => setPagina(paginaAtual + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        ))}

      {/* Mobile: impacto e métricas abaixo da lista, recolhíveis */}
      {isMobile === true && (
        <div className="mt-4 space-y-3">
          {impactoFila.graves > 0 && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
              <span className="font-medium">Ganho da fila priorizada por risco: </span>
              <span className="text-muted-foreground">{impactSentence(impactoFila)}</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setMetricasAbertas((v) => !v)}
            aria-expanded={metricasAbertas}
            className="flex min-h-11 w-full items-center justify-between rounded-lg border border-border bg-card px-3 text-sm text-muted-foreground"
          >
            Métricas de preenchimento
            <ChevronDown
              className={`h-4 w-4 transition-transform ${metricasAbertas ? "rotate-180" : ""}`}
            />
          </button>
          {metricasAbertas && <InformanteMetrics itens={lista} campoData={campoData} />}
        </div>
      )}
    </PainelShell>
  );
}
