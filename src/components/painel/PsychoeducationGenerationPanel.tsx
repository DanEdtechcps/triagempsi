import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Upload,
  RotateCcw,
} from "lucide-react";
import {
  requestPsychoeducationGeneration,
  listPsychoeducationGenerationJobs,
  listPsychoeducationGeneratedAssets,
  listPsychoeducationTopicsAdmin,
  approvePsychoeducationGenerationJob,
  rejectPsychoeducationGenerationJob,
  retryPsychoeducationGenerationJob,
  humanizeServerFnError,
  TEXT_FORMATS,
  MEDIA_FORMATS,
  type TextFormat,
  type MediaFormat,
  type PsychoeducationGeneratedAsset,
} from "@/lib/psychoeducation-generation.functions";

const FORMAT_LABEL: Record<TextFormat | MediaFormat, string> = {
  leitura: "Leitura",
  quiz: "Quiz",
  flashcards: "Flashcards",
  podcast: "Podcast (Fase 2 — ainda não gera sozinho)",
  infografico: "Infográfico (Fase 2 — ainda não gera sozinho)",
  video: "Vídeo (Fase 2 — ainda não gera sozinho)",
};

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  gerando: "Gerando…",
  aguardando_aprovacao: "Aguardando aprovação",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
  erro: "Erro",
};

export function PsychoeducationGenerationPanel() {
  const queryClient = useQueryClient();
  const fetchTopics = useServerFn(listPsychoeducationTopicsAdmin);
  const fetchJobs = useServerFn(listPsychoeducationGenerationJobs);
  const fetchAssets = useServerFn(listPsychoeducationGeneratedAssets);
  const requestGeneration = useServerFn(requestPsychoeducationGeneration);
  const approveJob = useServerFn(approvePsychoeducationGenerationJob);
  const rejectJob = useServerFn(rejectPsychoeducationGenerationJob);
  const retryJob = useServerFn(retryPsychoeducationGenerationJob);

  const [topicMode, setTopicMode] = useState<"existing" | "new">("new");
  const [topicId, setTopicId] = useState("");
  const [topicTitleDraft, setTopicTitleDraft] = useState("");
  const [sourceMaterial, setSourceMaterial] = useState("");
  const [confirmedNoPatientData, setConfirmedNoPatientData] = useState(false);
  const [isCrisisTopic, setIsCrisisTopic] = useState(false);
  const [selectedFormats, setSelectedFormats] = useState<Set<string>>(new Set(["leitura"]));
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const { data: topics } = useQuery({
    queryKey: ["psychoeducation-topics-admin"],
    queryFn: () => fetchTopics(),
  });
  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ["psychoeducation-generation-jobs"],
    queryFn: () => fetchJobs({ data: {} }),
    refetchInterval: 5000,
  });
  const { data: expandedAssets } = useQuery({
    queryKey: ["psychoeducation-generated-assets", expandedJobId],
    queryFn: () => fetchAssets({ data: { job_id: expandedJobId! } }),
    enabled: Boolean(expandedJobId),
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      await requestGeneration({
        data: {
          clinic_id: null,
          topic_id: topicMode === "existing" ? topicId || null : null,
          topic_title_draft: topicMode === "new" ? topicTitleDraft || null : null,
          source_material: sourceMaterial,
          confirmed_no_patient_data: confirmedNoPatientData,
          requested_formats: Array.from(selectedFormats) as (TextFormat | MediaFormat)[],
          is_crisis_topic: isCrisisTopic,
        },
      });
    },
    onSuccess: () => {
      setSourceMaterial("");
      setTopicTitleDraft("");
      setConfirmedNoPatientData(false);
      setMsg("Job(s) de geração criado(s). Acompanhe o status na lista abaixo.");
      queryClient.invalidateQueries({ queryKey: ["psychoeducation-generation-jobs"] });
    },
    onError: (err) => {
      setMsg(humanizeServerFnError(err));
    },
  });

  const approveMutation = useMutation({
    mutationFn: (jobId: string) => approveJob({ data: { job_id: jobId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["psychoeducation-generation-jobs"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (jobId: string) =>
      rejectJob({ data: { job_id: jobId, reason: "Rejeitado pelo painel" } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["psychoeducation-generation-jobs"] });
    },
  });

  const retryMutation = useMutation({
    mutationFn: (jobId: string) => retryJob({ data: { job_id: jobId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["psychoeducation-generation-jobs"] });
    },
    onError: (err) => {
      setMsg(humanizeServerFnError(err));
    },
  });

  function toggleFormat(format: string) {
    setSelectedFormats((prev) => {
      const next = new Set(prev);
      if (next.has(format)) next.delete(format);
      else next.add(format);
      return next;
    });
  }

  const canSubmit =
    sourceMaterial.trim().length >= 50 &&
    confirmedNoPatientData &&
    selectedFormats.size > 0 &&
    (topicMode === "existing" ? Boolean(topicId) : topicTitleDraft.trim().length >= 3);

  return (
    <Card className="p-4 sm:p-5 space-y-5">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Sparkles className="h-5 w-5 text-primary" />
        <div>
          <h2 className="font-serif text-lg font-semibold text-foreground">
            Gerar Conteúdo de Psicoeducação (IA)
          </h2>
          <p className="text-xs text-muted-foreground">
            Leitura/quiz/flashcards geram na hora (Cloudflare Workers AI). Podcast/infográfico/vídeo
            entram numa fila de Fase 2, ainda não implementada. Nada publica sem aprovação abaixo.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-4 text-xs">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              checked={topicMode === "new"}
              onChange={() => setTopicMode("new")}
            />
            Tópico novo
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              checked={topicMode === "existing"}
              onChange={() => setTopicMode("existing")}
            />
            Tópico existente
          </label>
        </div>

        {topicMode === "new" ? (
          <div>
            <Label className="text-xs">Título do tópico novo</Label>
            <Input
              value={topicTitleDraft}
              onChange={(e) => setTopicTitleDraft(e.target.value)}
              placeholder="Ex.: Desmame de benzodiazepínicos"
              className="mt-1"
            />
          </div>
        ) : (
          <div>
            <Label className="text-xs">Tópico existente</Label>
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
            >
              <option value="">Selecione…</option>
              {(topics ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs">Material bruto (diretriz clínica genérica)</Label>
            <label className="inline-flex cursor-pointer items-center gap-1 text-[11px] text-primary hover:underline">
              <Upload className="h-3 w-3" />
              Carregar arquivo (.txt/.md)
              <input
                type="file"
                accept=".txt,.md,text/plain,text/markdown"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const text = typeof reader.result === "string" ? reader.result : "";
                    setSourceMaterial((prev) => (prev ? `${prev}\n\n${text}` : text));
                  };
                  reader.readAsText(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <Textarea
            value={sourceMaterial}
            onChange={(e) => setSourceMaterial(e.target.value)}
            rows={6}
            placeholder="Cole aqui o texto da diretriz clínica que servirá de base para a geração, ou carregue um arquivo .txt/.md acima…"
            className="mt-1"
          />
          <p className="mt-1 text-[10px] text-muted-foreground">
            {sourceMaterial.trim().length.toLocaleString("pt-BR")} caracteres. Sem limite de tamanho
            — material muito grande pode estourar o contexto do modelo e o job termina como "erro"
            (a peça é regenerável depois de ajustar o texto).
          </p>
        </div>

        <div>
          <Label className="text-xs">Formatos a gerar</Label>
          <div className="mt-1.5 flex flex-wrap gap-3">
            {[...TEXT_FORMATS, ...MEDIA_FORMATS].map((format) => (
              <label key={format} className="flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={selectedFormats.has(format)}
                  onChange={() => toggleFormat(format)}
                />
                {FORMAT_LABEL[format]}
              </label>
            ))}
          </div>
        </div>

        <label className="flex items-start gap-2 text-xs">
          <input
            type="checkbox"
            checked={isCrisisTopic}
            onChange={(e) => setIsCrisisTopic(e.target.checked)}
            className="mt-0.5"
          />
          Este tópico é sobre crise/risco (exige CVV 188 e SAMU 192 no texto)
        </label>

        <label className="flex items-start gap-2 text-xs font-medium text-foreground">
          <input
            type="checkbox"
            checked={confirmedNoPatientData}
            onChange={(e) => setConfirmedNoPatientData(e.target.checked)}
            className="mt-0.5"
          />
          Confirmo que o material acima é uma diretriz clínica genérica e NÃO contém prontuário ou
          dado de nenhum paciente.
        </label>

        <Button
          size="sm"
          disabled={!canSubmit || submitMutation.isPending}
          onClick={() => submitMutation.mutate()}
          className="gap-1.5"
        >
          {submitMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {submitMutation.isPending ? "Gerando…" : "Gerar conteúdo"}
        </Button>

        {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
      </div>

      <div className="border-t border-border pt-4">
        <h3 className="text-sm font-semibold text-foreground">Jobs de geração</h3>
        {jobsLoading && <p className="mt-2 text-xs text-muted-foreground">Carregando…</p>}
        {!jobsLoading && (jobs ?? []).length === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">Nenhum job de geração ainda.</p>
        )}
        <div className="mt-2 space-y-2">
          {(jobs ?? []).map((job) => (
            <div key={job.id} className="rounded-lg border border-border p-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-medium text-foreground">
                    {job.topic_title_draft ?? job.topic_id}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    · {job.requested_formats.join(", ")} · motor: {job.engine}
                  </span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                    job.status === "erro"
                      ? "bg-destructive/15 text-destructive"
                      : job.status === "aprovado"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : job.status === "rejeitado"
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary/15 text-primary"
                  }`}
                >
                  {STATUS_LABEL[job.status] ?? job.status}
                </span>
              </div>

              {job.qc_notes && job.qc_notes.length > 0 && (
                <div className="mt-2 rounded border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-amber-800 dark:text-amber-300">
                  <div className="flex items-center gap-1 font-semibold">
                    <AlertTriangle className="h-3 w-3" /> Observações de QC:
                  </div>
                  <ul className="mt-1 list-disc pl-4">
                    {job.qc_notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </div>
              )}

              {job.error_message && (
                <p className="mt-1 text-[11px] text-destructive">{job.error_message}</p>
              )}

              {job.status === "erro" && job.engine === "workers_ai" && (
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 text-[11px]"
                    disabled={retryMutation.isPending}
                    onClick={() => retryMutation.mutate(job.id)}
                  >
                    {retryMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5" />
                    )}
                    Tentar novamente
                  </Button>
                </div>
              )}

              {job.status === "aguardando_aprovacao" && (
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 text-[11px]"
                    onClick={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
                  >
                    {expandedJobId === job.id ? "Ocultar materiais" : "Ver materiais"}
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 gap-1 text-[11px]"
                    disabled={approveMutation.isPending}
                    onClick={() => approveMutation.mutate(job.id)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-7 gap-1 text-[11px]"
                    disabled={rejectMutation.isPending}
                    onClick={() => rejectMutation.mutate(job.id)}
                  >
                    <XCircle className="h-3.5 w-3.5" /> Rejeitar
                  </Button>
                </div>
              )}

              {expandedJobId === job.id && expandedAssets && (
                <div className="mt-2 space-y-3 border-t border-border pt-3">
                  {expandedAssets.map((asset) => (
                    <AssetPreview key={asset.id} asset={asset} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

type QuizItem = {
  question: string;
  options: string[];
  correct_index: number;
  explanation?: string;
};
type FlashcardItem = { front: string; back: string };

function isQuizItem(v: unknown): v is QuizItem {
  return (
    Boolean(v) &&
    typeof v === "object" &&
    "question" in (v as object) &&
    "options" in (v as object)
  );
}
function isFlashcardItem(v: unknown): v is FlashcardItem {
  return Boolean(v) && typeof v === "object" && "front" in (v as object) && "back" in (v as object);
}

/**
 * Prévia de um asset gerado, no formato mais próximo do que o paciente veria
 * — não o JSON cru. "leitura" já é exatamente o texto que vai pro paciente
 * (vira psychoeducation_contents.body_md na aprovação); quiz/flashcards
 * ainda NÃO têm tela própria no portal do paciente (só a leitura é
 * publicada hoje), então esta prévia é um adiantamento de como ficariam,
 * não uma garantia de como aparecerão — ver nota abaixo do card.
 */
function AssetPreview({ asset }: { asset: PsychoeducationGeneratedAsset }) {
  const kindLabel = FORMAT_LABEL[asset.kind as TextFormat | MediaFormat] ?? asset.kind;

  if (asset.kind === "leitura" && asset.body_md) {
    return (
      <div className="rounded-xl border border-border bg-card/60 p-4">
        <PreviewLabel text={`Prévia — ${kindLabel} (como o paciente vai ler)`} />
        <div className="prose prose-sm dark:prose-invert mt-2 max-w-none whitespace-pre-line text-sm text-foreground/90">
          {asset.body_md}
        </div>
      </div>
    );
  }

  if (asset.kind === "quiz" && Array.isArray(asset.data_json)) {
    const items = asset.data_json.filter(isQuizItem);
    if (items.length > 0) {
      return (
        <div className="space-y-2 rounded-xl border border-border bg-card/60 p-4">
          <PreviewLabel
            text={`Prévia — Quiz (${items.length} pergunta${items.length === 1 ? "" : "s"})`}
          />
          {items.map((q, i) => (
            <div key={i} className="rounded-lg border border-border/60 bg-background/60 p-3">
              <p className="text-xs font-medium text-foreground">
                {i + 1}. {q.question}
              </p>
              <ul className="mt-1.5 space-y-1">
                {(q.options ?? []).map((opt, oi) => (
                  <li
                    key={oi}
                    className={`rounded px-2 py-1 text-[11px] ${
                      oi === q.correct_index
                        ? "bg-emerald-500/15 font-semibold text-emerald-700 dark:text-emerald-300"
                        : "text-foreground/80"
                    }`}
                  >
                    {oi === q.correct_index ? "✓ " : ""}
                    {opt}
                  </li>
                ))}
              </ul>
              {q.explanation && (
                <p className="mt-1.5 text-[10px] italic text-muted-foreground">{q.explanation}</p>
              )}
            </div>
          ))}
        </div>
      );
    }
  }

  if (asset.kind === "flashcards" && Array.isArray(asset.data_json)) {
    const items = asset.data_json.filter(isFlashcardItem);
    if (items.length > 0) {
      return (
        <div className="rounded-xl border border-border bg-card/60 p-4">
          <PreviewLabel text={`Prévia — Flashcards (${items.length})`} />
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {items.map((c, i) => (
              <div key={i} className="rounded-lg border border-border/60 bg-background/60 p-3">
                <p className="text-xs font-semibold text-primary">{c.front}</p>
                <div className="my-1.5 border-t border-dashed border-border" />
                <p className="text-xs text-foreground/80">{c.back}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }
  }

  // Fallback: formato inesperado (a IA não seguiu o schema pedido) — mostra
  // o JSON cru pra não esconder o problema, mas sinaliza que precisa de
  // revisão manual em vez de fingir que está tudo certo.
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
      <PreviewLabel text={`${kindLabel} — formato inesperado, revisar manualmente`} />
      {asset.media_url && (
        <p className="mt-1 text-[11px] text-muted-foreground">Mídia: {asset.media_url}</p>
      )}
      {asset.data_json != null && (
        <pre className="mt-1 max-h-40 overflow-auto text-[10px] text-foreground/80">
          {JSON.stringify(asset.data_json, null, 2)}
        </pre>
      )}
    </div>
  );
}

function PreviewLabel({ text }: { text: string }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      {text}
    </p>
  );
}
