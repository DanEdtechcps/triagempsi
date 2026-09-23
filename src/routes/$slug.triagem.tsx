import { createFileRoute, useSearch, getRouteApi, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GENDER_OPTIONS, PRONOUN_OPTIONS } from "@/config/gender-options";
import { maskPhoneBR, isValidPhoneBR, isValidEmail } from "@/lib/masks";

import {
  SCALE_BY_CODE,
  skippedItemIds,
  nextItemIndex,
  prevItemIndex,
  applyBranchingSkips,
  visibleProgress,
  groupLabelForItem,
} from "@/lib/scales-data";
import { evaluateAdaptive, completeAdaptiveAnswers } from "@/lib/adaptive";
import {
  scoreScale,
  mergeAuditScore,
  summarize,
  INFORMANT_LABEL,
  type Informant,
  type ScaleResult,
} from "@/lib/scoring";
import { submitAssessment } from "@/lib/assessment.functions";
import { listClinicDoctors, type ClinicDoctor } from "@/lib/doctors.functions";
import { QuestionScreen } from "@/components/triagem/QuestionScreen";
import { StepTransition } from "@/components/motion/primitives";
import { downloadPatientPdf } from "@/lib/pdf-report";
import { resolveBranding } from "@/config/branding";
import { evaluatePsychoeducationTriggers, type PsychoTriggerResult } from "@/lib/psychoeducation";
import { CardsPsicoeducacao } from "@/components/triage/CardsPsicoeducacao";
import {
  SYMPTOM_QUESTION,
  buildTriagePlan,
  applyEscalations,
  isMaleSex,
  isMalePatient,
  AGE_BAND_LABEL,
  calcAge,
  type TriagePlan,
} from "@/lib/clinical-engine";

const parentApi = getRouteApi("/$slug");

const searchSchema = z.object({
  t: z.string().optional(),
  reset: z.string().optional(),
});

export const Route = createFileRoute("/$slug/triagem")({
  validateSearch: searchSchema,
  component: TriagemPage,
});

type Phase = "boas-vindas" | "dados" | "sintomas" | "escalas" | "risco" | "fim" | "erro";

type RespondentData = {
  respondent_type: Informant;
  informant_name: string;
  informant_relation: string;
  respondent_name: string;
  preferred_name: string;
  pronouns: string;
  respondent_email: string;
  respondent_phone: string;
  birth_date: string;
  respondent_sex: string;
  main_complaint: string;
  doctor_id: string | null;
  consent_lgpd: boolean;
  consent_at: string | null;
};

const EMPTY_RESPONDENT: RespondentData = {
  respondent_type: "paciente",
  informant_name: "",
  informant_relation: "",
  respondent_name: "",
  preferred_name: "",
  pronouns: "",
  respondent_email: "",
  respondent_phone: "",
  birth_date: "",
  respondent_sex: "",
  main_complaint: "",
  doctor_id: null,
  consent_lgpd: false,
  consent_at: null,
};

type Saved = {
  phase: Phase;
  respondent: RespondentData;
  symptoms: string[];
  plan: TriagePlan | null;
  scaleIndex: number;
  itemIndex: number;
  answers: Record<string, Record<string, number>>;
  results: ScaleResult[];
};

function TriagemPage() {
  const clinic = parentApi.useLoaderData();
  const branding = resolveBranding(clinic);
  const { slug } = Route.useParams();
  const search = useSearch({ from: "/$slug/triagem" });
  const storageKey = `pretriagem:${slug}`;

  const [phase, setPhase] = useState<Phase>("boas-vindas");
  const [respondent, setRespondent] = useState<RespondentData>(EMPTY_RESPONDENT);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [plan, setPlan] = useState<TriagePlan | null>(null);
  const [scaleIndex, setScaleIndex] = useState(0);
  const [itemIndex, setItemIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Record<string, number>>>({});
  const [results, setResults] = useState<ScaleResult[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  const submit = useServerFn(submitAssessment);
  const fetchDoctors = useServerFn(listClinicDoctors);
  const clinicId = clinic?.id ?? null;
  const { data: doctorsData } = useQuery({
    queryKey: ["clinic-doctors", clinicId],
    queryFn: () => fetchDoctors({ data: { clinic_id: clinicId as string } }),
    enabled: !!clinicId,
    staleTime: 5 * 60 * 1000,
  });
  const doctors = doctorsData ?? [];
  const age = calcAge(respondent.birth_date);

  const isMale = isMalePatient(respondent);

  function handleReset() {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignora erro de storage */
    }
    setPhase("boas-vindas");
    setRespondent(EMPTY_RESPONDENT);
    setSymptoms([]);
    setPlan(null);
    setScaleIndex(0);
    setItemIndex(0);
    setAnswers({});
    setResults([]);
    setErrorMsg(null);
  }

  // Retomada automática da sessão
  useEffect(() => {
    try {
      if (search.reset === "1" || search.reset === "true") {
        localStorage.removeItem(storageKey);
        setRestored(true);
        return;
      }
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const s = JSON.parse(raw) as Saved;
        if (s && s.phase && s.phase !== "fim") {
          const resp = { ...EMPTY_RESPONDENT, ...s.respondent };
          const patientIsMale = isMalePatient(resp);

          let cleanedSymptoms = s.symptoms ?? [];
          let cleanedPlan = s.plan ?? null;
          let cleanedAnswers = s.answers ?? {};
          let cleanedResults = s.results ?? [];

          // Purga rigorosa de resíduos perinatais / EPDS para homens em cache
          if (patientIsMale) {
            cleanedSymptoms = cleanedSymptoms.filter((sym) => sym !== "perinatal");
            if (cleanedPlan) {
              cleanedPlan = {
                ...cleanedPlan,
                flow: cleanedPlan.flow.filter((code) => code !== "EPDS"),
                indicated: cleanedPlan.indicated.filter((i) => i.code !== "EPDS"),
              };
            }
            if (cleanedAnswers["EPDS"]) {
              delete cleanedAnswers["EPDS"];
            }
            cleanedResults = cleanedResults.filter((r) => r.scale_code !== "EPDS");
          }

          let nextScaleIdx = s.scaleIndex ?? 0;
          if (cleanedPlan && nextScaleIdx >= cleanedPlan.flow.length) {
            nextScaleIdx = Math.max(0, cleanedPlan.flow.length - 1);
          }

          setPhase(s.phase);
          setRespondent(resp);
          setSymptoms(cleanedSymptoms);
          setPlan(cleanedPlan);
          setScaleIndex(nextScaleIdx);
          setItemIndex(s.itemIndex ?? 0);
          setAnswers(cleanedAnswers);
          setResults(cleanedResults);
        }
      }
    } catch {
      /* sessão local inválida — recomeça */
    }
    setRestored(true);
  }, [storageKey, search.reset]);

  // Salvamento automático
  useEffect(() => {
    if (!restored) return;
    // Limpa em toda fase terminal — não só "fim". Sessões de crise ou erro
    // não podem sobreviver no localStorage: são justamente as que carregam
    // dado identificado de maior sensibilidade (nome, contato, risk_flags),
    // e retomar a sessão do paciente anterior num navegador compartilhado
    // é um vazamento de PHI entre pacientes.
    if (phase === "fim" || phase === "risco" || phase === "erro") {
      localStorage.removeItem(storageKey);
      return;
    }
    const payload: Saved = {
      phase,
      respondent,
      symptoms,
      plan,
      scaleIndex,
      itemIndex,
      answers,
      results,
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      /* armazenamento indisponível */
    }
  }, [
    restored,
    storageKey,
    phase,
    respondent,
    symptoms,
    plan,
    scaleIndex,
    itemIndex,
    answers,
    results,
  ]);

  const todayISO = useMemo(() => new Date().toISOString().split("T")[0], []);
  const isFutureBirth = Boolean(respondent.birth_date && respondent.birth_date > todayISO);

  const dadosValidos = useMemo(
    () =>
      respondent.respondent_name.trim().length >= 2 &&
      isValidEmail(respondent.respondent_email) &&
      Boolean(respondent.respondent_sex && respondent.respondent_sex.trim().length > 0) &&
      age != null &&
      age >= 5 &&
      age <= 125 &&
      !isFutureBirth &&
      isValidPhoneBR(respondent.respondent_phone, false) &&
      (respondent.respondent_type === "paciente" || respondent.informant_name.trim().length >= 2),
    [respondent, age, isFutureBirth],
  );

  const currentScale = plan?.flow[scaleIndex] ? SCALE_BY_CODE[plan.flow[scaleIndex]] : null;

  // Se o item atual ficou pulado pela ramificação (sessão restaurada ou
  // pergunta-porta alterada no caminho de volta), ajusta para um item visível.
  useEffect(() => {
    if (phase !== "escalas" || !currentScale) return;
    const item = currentScale.items[itemIndex];
    if (!item) return;
    const a = answers[currentScale.code] ?? {};
    if (skippedItemIds(currentScale, a).has(item.id)) {
      const next = nextItemIndex(currentScale, itemIndex, a);
      const prev = prevItemIndex(currentScale, itemIndex, a);
      setItemIndex(next !== -1 ? next : Math.max(prev, 0));
    }
  }, [phase, currentScale, itemIndex, answers]);

  const totalQuestions = useMemo(
    () =>
      (plan?.flow ?? []).reduce((acc, code) => {
        const scale = SCALE_BY_CODE[code];
        if (!scale) return acc;
        // ramificação: itens já descartados pela pergunta-porta não contam
        const skipped = skippedItemIds(scale, answers[code] ?? {}).size;
        return acc + scale.items.length - skipped;
      }, 0),
    [plan, answers],
  );
  const answeredQuestions = useMemo(
    () => Object.values(answers).reduce((acc, a) => acc + Object.keys(a).length, 0),
    [answers],
  );
  const progress = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  function startFlow(selected: string[]) {
    const cleanedSelected = isMale ? selected.filter((s) => s !== "perinatal") : selected;
    const p = buildTriagePlan(cleanedSelected, age, respondent.respondent_sex);
    setPlan(p);
    setSymptoms(cleanedSelected);
    setScaleIndex(0);
    setItemIndex(0);
    setAnswers({});
    setResults([]);
    if (p.flow.length === 0) {
      void finalize([], p, cleanedSelected);
    } else {
      setPhase("escalas");
    }
  }

  async function finalize(allResults: ScaleResult[], usedPlan: TriagePlan, usedSymptoms: string[]) {
    // Impede gravação duplicada por clique repetido / reentrada.
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setErrorMsg(null);

    // AUDIT-C + AUDIT são administrados em duas etapas mas a interpretação
    // oficial usa o escore somado dos 10 itens — sem isso um consumo pesado
    // pego só no AUDIT-C sai classificado como "baixo risco".
    const mergedResults = mergeAuditScore(allResults);
    setResults(mergedResults);

    const riskPathway = usedPlan.riskPathway || mergedResults.some((r) => r.risk);

    // Regra de segurança inviolável: a tela de crise (CVV 188 / SAMU 192)
    // não pode depender do envio ao servidor ter dado certo. O risco já é
    // conhecido aqui, então mostramos o plano de segurança imediatamente —
    // uma falha de rede depois disso só afeta a persistência, nunca a
    // visibilidade dos recursos de emergência.
    if (riskPathway) {
      setPhase("risco");
    }

    try {
      const baseSummary = summarize(mergedResults, {
        symptoms: usedSymptoms,
        indicated: usedPlan.indicated,
        decisions: usedPlan.decisions,
        ageBand: AGE_BAND_LABEL[usedPlan.band],
        informant: respondent.respondent_type,
        riskPathway,
      });

      const summary = {
        ...baseSummary,
        preferred_name: respondent.preferred_name?.trim() || null,
        pronouns: respondent.pronouns?.trim() || null,
      };

      await submit({
        data: {
          clinic_slug: slug,
          respondent_name: respondent.respondent_name.trim(),
          respondent_email: respondent.respondent_email.trim(),
          respondent_phone: respondent.respondent_phone.trim() || null,
          respondent_age: age,
          birth_date: respondent.birth_date || null,
          respondent_sex: respondent.respondent_sex || null,
          respondent_type: respondent.respondent_type,
          informant_name: respondent.informant_name.trim() || null,
          informant_relation: respondent.informant_relation.trim() || null,
          main_complaint: respondent.main_complaint.trim() || null,
          consent_lgpd: true,
          consent_at: respondent.consent_at ?? new Date().toISOString(),
          invitation_token: search.t ?? null,
          doctor_id: respondent.doctor_id,
          symptom_path: usedSymptoms,
          results: mergedResults,
          summary,
        },
      });
      if (!riskPathway) {
        setPhase("fim");
      }
    } catch (e) {
      console.error(e);
      if (riskPathway) {
        // A tela de risco já está visível (setada acima) e continua —
        // uma falha de envio aqui não deve nunca esconder o plano de
        // segurança do paciente. Só registramos a falha de persistência.
        console.error(
          "Falha ao persistir triagem de risco no servidor; tela de segurança mantida.",
        );
      } else {
        setErrorMsg(
          e instanceof Error ? e.message : "Não foi possível enviar sua triagem. Tente novamente.",
        );
        setPhase("erro");
      }
      submittingRef.current = false;
    } finally {
      setSubmitting(false);
    }
  }

  const psychoRecommendations = useMemo(() => {
    return evaluatePsychoeducationTriggers(results, {
      riskPathway: Boolean(plan?.riskPathway) || results.some((r) => r.risk),
    });
  }, [results, plan]);

  function handleDownloadPdf() {
    downloadPatientPdf(
      {
        respondent_name: respondent.respondent_name.trim() || "Paciente",
        preferred_name: respondent.preferred_name?.trim() || null,
        pronouns: respondent.pronouns?.trim() || null,
        respondent_age: age,
        birth_date: respondent.birth_date || null,
        respondent_sex: respondent.respondent_sex || null,
        respondent_email: respondent.respondent_email || null,
        respondent_phone: respondent.respondent_phone || null,
        respondent_type: respondent.respondent_type,
        informant_name: respondent.informant_name.trim() || null,
        informant_relation: respondent.informant_relation.trim() || null,
        submitted_at: new Date().toISOString(),
        symptoms,
        scales: results.map((r) => ({
          scale_code: r.scale_code,
          scale_name: r.scale_name,
          score: r.score,
          band: r.band,
          band_level: r.band_level,
          risk: r.risk,
        })),
        riskPathway: Boolean(plan?.riskPathway) || results.some((r) => r.risk),
        riskFlags: results.filter((r) => r.risk).map((r) => r.scale_code),
        decisions: plan?.decisions ?? [],
        indicated: plan?.indicated ?? [],
        ageBand: plan?.band ?? null,
        psychoeducation: psychoRecommendations.map((rec) => ({
          title: rec.topic.title,
          summary: rec.topic.summary_pdf,
        })),
      },
      branding,
    );
  }

  function handleAnswer(value: number) {
    if (!currentScale || !plan) return;
    if (submitting || submittingRef.current) return;
    const code = currentScale.code;
    const item = currentScale.items[itemIndex];
    const scaleAnswers = { ...(answers[code] ?? {}), [item.id]: value };
    const nextAnswers = { ...answers, [code]: scaleAnswers };
    setAnswers(nextAnswers);

    // Administração adaptativa: se a faixa da escala já está definida e nenhum
    // item de risco ficou pendente, o restante dos itens não muda a conclusão.
    const adaptive = evaluateAdaptive(code, scaleAnswers);
    // Ramificação: a resposta pode pular itens (ex.: pergunta-porta "Não" no
    // ASSIST-Lite encerra o bloco daquela substância).
    const nextIdx = nextItemIndex(currentScale, itemIndex, scaleAnswers);

    if (nextIdx !== -1 && !adaptive.stop) {
      setItemIndex(nextIdx);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Escala concluída (integralmente, por ramificação ou parada adaptativa):
    // itens pulados são gravados com 0 — "não se aplica" no escore. Itens
    // completados pela parada adaptativa (valor estimado, não respondido de
    // verdade) ficam marcados em estimatedItemIds — sem isso o escore fica
    // indistinguível de um respondido item a item no painel/PDF/RCI.
    let estimatedItemIds: string[] = [];
    const finalAnswers = adaptive.stop
      ? (() => {
          const completed = completeAdaptiveAnswers(code, scaleAnswers);
          estimatedItemIds = completed.estimated;
          return completed.answers;
        })()
      : applyBranchingSkips(currentScale, scaleAnswers);
    setAnswers({ ...answers, [code]: finalAnswers });

    const result: ScaleResult = {
      ...scoreScale(code, finalAnswers, respondent.respondent_type),
      ...(estimatedItemIds.length ? { estimated_items: estimatedItemIds } : {}),
    };
    const nextResults = [...results.filter((r) => r.scale_code !== code), result];
    setResults(nextResults);

    // Encaminhamento condicional: o resultado decide as próximas escalas.
    let nextPlan = applyEscalations(
      plan,
      result,
      age,
      nextResults.map((r) => r.scale_code),
      scaleIndex,
      respondent.respondent_sex,
    );
    if (adaptive.stop && adaptive.reason) {
      nextPlan = {
        ...nextPlan,
        decisions: [
          ...nextPlan.decisions,
          { step: `${code} (adaptativo)`, reason: adaptive.reason },
        ],
      };
    }
    if (nextPlan !== plan) setPlan(nextPlan);
    const nextFlow = nextPlan.flow;

    if (scaleIndex + 1 >= nextFlow.length) {
      void finalize(nextResults, nextPlan, symptoms);
    } else {
      setScaleIndex(scaleIndex + 1);
      setItemIndex(0);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleBack() {
    // Volta para o item visível anterior (itens pulados pela ramificação
    // não aparecem no caminho de volta).
    if (currentScale && itemIndex > 0) {
      const prev = prevItemIndex(currentScale, itemIndex, answers[currentScale.code] ?? {});
      if (prev !== -1) {
        setItemIndex(prev);
        return;
      }
    }
    if (scaleIndex > 0) {
      const prevCode = plan!.flow[scaleIndex - 1];
      const prevScale = SCALE_BY_CODE[prevCode];
      let last = Math.max((prevScale?.items.length ?? 1) - 1, 0);
      if (prevScale) {
        const prevVisible = prevItemIndex(
          prevScale,
          prevScale.items.length,
          answers[prevCode] ?? {},
        );
        if (prevVisible !== -1) last = prevVisible;
      }
      setScaleIndex(scaleIndex - 1);
      setItemIndex(last);
    } else {
      setPhase("sintomas");
    }
  }

  // Direção da transição: avança para a direita, volta para a esquerda.
  const PHASE_ORDER = ["boas-vindas", "dados", "sintomas", "escalas", "risco", "fim", "erro"];
  const stepPosition = PHASE_ORDER.indexOf(phase) * 1000 + itemIndex;
  const prevStepRef = useRef(stepPosition);
  const stepDirection: "forward" | "backward" =
    stepPosition < prevStepRef.current ? "backward" : "forward";
  prevStepRef.current = stepPosition;
  const stepKey = phase === "escalas" ? `escalas:${currentScale?.code}:${itemIndex}` : phase;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto grid max-w-2xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-2">
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt=""
                className="h-7 w-7 shrink-0 rounded-md object-cover"
              />
            ) : null}
            <div className="truncate font-serif text-base font-semibold sm:text-lg">
              {branding.clinicName}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {phase !== "boas-vindas" && phase !== "fim" && (
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                title="Reiniciar pré-avaliação do zero"
              >
                Recomeçar
              </button>
            )}
            <Link
              to="/$slug"
              params={{ slug }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Início
            </Link>
          </div>
        </div>
        {phase === "escalas" && <Progress value={progress} className="h-1 rounded-none" />}
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <StepTransition stepKey={stepKey} direction={stepDirection}>
          {phase === "boas-vindas" && (
            <BoasVindas
              branding={branding}
              respondent={respondent}
              onChange={setRespondent}
              onStart={() => setPhase("dados")}
            />
          )}

          {phase === "dados" && (
            <DadosBasicos
              data={respondent}
              age={age}
              doctors={doctors}
              onChange={setRespondent}
              valid={dadosValidos}
              onNext={() => setPhase("sintomas")}
              onBack={() => setPhase("boas-vindas")}
            />
          )}

          {phase === "sintomas" && (
            <Sintomas
              selected={symptoms}
              onChange={setSymptoms}
              onNext={() => startFlow(symptoms)}
              onBack={() => setPhase("dados")}
              submitting={submitting}
              isMale={isMale}
            />
          )}

          {phase === "escalas" && currentScale && (
            <Card className="border-border bg-card p-5 sm:p-8">
              <QuestionScreen
                scale={currentScale}
                itemIndex={itemIndex}
                position={
                  visibleProgress(currentScale, itemIndex, answers[currentScale.code] ?? {})
                    .position
                }
                total={
                  visibleProgress(currentScale, itemIndex, answers[currentScale.code] ?? {}).total
                }
                groupLabel={
                  groupLabelForItem(currentScale, currentScale.items[itemIndex]?.id ?? "") ??
                  undefined
                }
                value={answers[currentScale.code]?.[currentScale.items[itemIndex].id]}
                onAnswer={handleAnswer}
                onBack={handleBack}
              />
              {submitting && (
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Enviando suas respostas…
                </p>
              )}
            </Card>
          )}

          {phase === "risco" && (
            <TelaRisco
              branding={branding}
              recommendations={psychoRecommendations}
              onDownload={handleDownloadPdf}
            />
          )}

          {phase === "fim" && (
            <TelaFinal
              branding={branding}
              email={respondent.respondent_email}
              recommendations={psychoRecommendations}
              onDownload={handleDownloadPdf}
            />
          )}

          {phase === "erro" && (
            <Card className="p-6 text-center sm:p-8">
              <h2 className="text-xl font-semibold text-destructive">Não foi possível enviar</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {errorMsg ?? "Não foi possível salvar sua triagem. Tente novamente."}
              </p>
              <Button className="mt-4" onClick={() => setPhase("escalas")}>
                Tentar novamente
              </Button>
            </Card>
          )}
        </StepTransition>
      </main>

      <footer className="mx-auto max-w-2xl px-4 py-8 text-center text-xs text-muted-foreground sm:px-6">
        {branding.disclaimer}
      </footer>
    </div>
  );
}

type BrandingType = ReturnType<typeof resolveBranding>;

function BoasVindas({
  branding,
  respondent,
  onChange,
  onStart,
}: {
  branding: BrandingType;
  respondent: RespondentData;
  onChange: (d: RespondentData) => void;
  onStart: () => void;
}) {
  return (
    <Card className="border-border bg-card p-6 sm:p-10">
      <h1 className="font-serif text-2xl font-semibold text-foreground sm:text-3xl">
        Pré-avaliação clínica
      </h1>
      <p className="mt-4 text-base leading-relaxed text-foreground/80">{branding.introCopy}</p>
      <ul className="mt-6 space-y-2 text-sm text-foreground/80">
        <li>• Tempo estimado: Leve cerca de 10 minutos e pode ser feito pelo celular.</li>
        <li>• Salvamento automático: Se você fechar a página, retomamos de onde parou.</li>
        <li>
          • Confidencialidade: Suas respostas são confidenciais e vistas só pela equipe clínica.
        </li>
      </ul>
      <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4 text-sm text-foreground/80">
        Esta pré-avaliação organiza seus sintomas e direciona a conversa médica inicial, mas não
        constitui diagnóstico clínico nem prescrição de tratamento.
      </div>

      <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 text-sm">
        <Checkbox
          checked={respondent.consent_lgpd}
          onCheckedChange={(v) =>
            onChange({
              ...respondent,
              consent_lgpd: Boolean(v),
              consent_at: v ? new Date().toISOString() : null,
            })
          }
          className="mt-0.5"
        />
        <span className="text-foreground/80">{branding.consentCopy}</span>
      </label>

      <Button
        size="lg"
        onClick={onStart}
        disabled={!respondent.consent_lgpd}
        className="mt-6 w-full sm:w-auto"
      >
        Começar
      </Button>
    </Card>
  );
}

function DadosBasicos({
  data,
  age,
  doctors,
  onChange,
  valid,
  onNext,
  onBack,
}: {
  data: RespondentData;
  age: number | null;
  doctors: ClinicDoctor[];
  onChange: (d: RespondentData) => void;
  valid: boolean;
  onNext: () => void;
  onBack: () => void;
}) {
  const set = <K extends keyof RespondentData>(k: K, v: RespondentData[K]) =>
    onChange({ ...data, [k]: v });

  const currentSex = data.respondent_sex || "";
  const knownMatch = GENDER_OPTIONS.find((o) => o.value === currentSex);
  const isOtherPrefix =
    currentSex.startsWith("Outra:") ||
    currentSex === "Outra identidade" ||
    (!knownMatch && currentSex !== "");
  const genderSelectValue = knownMatch
    ? knownMatch.value
    : isOtherPrefix
      ? "Outra identidade"
      : undefined;
  const customGenderText = currentSex.startsWith("Outra: ")
    ? currentSex.slice(7)
    : !knownMatch && currentSex !== "Outra identidade"
      ? currentSex
      : "";

  const todayISO = useMemo(() => new Date().toISOString().split("T")[0], []);
  const isFutureBirth = Boolean(data.birth_date && data.birth_date > todayISO);
  const birthError = isFutureBirth
    ? "A data de nascimento não pode estar no futuro."
    : data.birth_date && age != null && age < 5
      ? "A idade mínima para esta pré-avaliação é de 5 anos."
      : null;

  const emailTouched = Boolean(data.respondent_email);
  const emailInvalid = emailTouched && !isValidEmail(data.respondent_email);
  const emailError = emailInvalid ? "Digite um e-mail válido (ex.: nome@exemplo.com)." : null;

  const phoneTouched = Boolean(data.respondent_phone);
  const phoneInvalid = phoneTouched && !isValidPhoneBR(data.respondent_phone, false);
  const phoneError = phoneInvalid
    ? "Telefone incompleto (informe DDD + número de 10 ou 11 dígitos)."
    : null;

  const nameTouched = Boolean(data.respondent_name);
  const nameError =
    nameTouched && data.respondent_name.trim().length < 2
      ? "Informe o nome completo do paciente."
      : null;

  return (
    <Card className="border-border bg-card p-6 sm:p-8">
      <h1 className="font-serif text-xl font-semibold sm:text-2xl">Seus dados</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Usamos apenas para associar sua pré-avaliação à sua consulta.
      </p>

      {/* Escolha do profissional (opcional) */}
      <fieldset className="mt-6">
        <legend className="text-sm font-medium leading-none">
          Com qual profissional você quer consultar? (opcional)
        </legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Profissional">
          {(doctors.length > 0
            ? doctors
            : [
                {
                  id: "saraiva-titular",
                  display_name: "Dr. José Ribamar Fernandes Saraiva Junior",
                  specialty: "Psiquiatria Clínica · RQE 30038",
                },
              ]
          ).map((d) => {
            const isSelected =
              data.doctor_id === d.id || (d.id === "saraiva-titular" && data.doctor_id === null);
            return (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => set("doctor_id", d.id === "saraiva-titular" ? null : d.id)}
                className={`min-h-12 rounded-xl border px-4 py-3 text-left transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background hover:border-primary/50"
                }`}
              >
                <span className="block text-base font-medium text-foreground">{d.display_name}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {d.specialty || "Psiquiatria Clínica · RQE 30038"}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            role="radio"
            aria-checked={data.doctor_id === null}
            onClick={() => set("doctor_id", null)}
            className={`min-h-12 rounded-xl border px-4 py-3 text-left text-base transition-colors ${
              data.doctor_id === null
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-background text-muted-foreground hover:border-primary/50"
            }`}
          >
            Sem preferência — a equipe direciona
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Sua pré-avaliação fica destacada para o profissional escolhido, e toda a equipe do
          consultório pode acompanhar.
        </p>
      </fieldset>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <fieldset className="sm:col-span-2">
          <legend className="text-sm font-medium leading-none">
            Quem está preenchendo este questionário? *
          </legend>
          <div
            className="mt-2 grid gap-2 sm:grid-cols-2"
            role="radiogroup"
            aria-label="Quem está preenchendo este questionário"
          >
            {(["paciente", "familiar"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                role="radio"
                aria-checked={data.respondent_type === opt}
                onClick={() => set("respondent_type", opt)}
                className={`min-h-12 rounded-xl border px-4 py-3 text-left text-base transition-colors ${
                  data.respondent_type === opt
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background hover:border-primary/50"
                }`}
              >
                {INFORMANT_LABEL[opt]}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Os nomes e a data de nascimento pedidos abaixo são sempre os do paciente. Essa
            informação muda a forma como o médico interpreta os resultados.
          </p>
        </fieldset>

        {data.respondent_type === "familiar" && (
          <>
            <div>
              <Label htmlFor="informant-name">Seu nome (quem responde) *</Label>
              <Input
                id="informant-name"
                value={data.informant_name}
                onChange={(e) => set("informant_name", e.target.value)}
                maxLength={120}
                className="h-12 text-base"
              />
            </div>
            <div>
              <Label htmlFor="informant-relation">Grau de parentesco</Label>
              <Input
                id="informant-relation"
                value={data.informant_relation}
                onChange={(e) => set("informant_relation", e.target.value)}
                maxLength={80}
                placeholder="mãe, cônjuge, cuidador(a)…"
                className="h-12 text-base"
              />
            </div>
          </>
        )}

        <div className="sm:col-span-2">
          <Label htmlFor="name">Nome completo do paciente *</Label>
          <Input
            id="name"
            value={data.respondent_name}
            onChange={(e) => set("respondent_name", e.target.value)}
            maxLength={120}
            placeholder="Nome e sobrenome"
            className="h-12 text-base"
          />
          {nameError && <p className="mt-1 text-xs text-destructive">{nameError}</p>}
        </div>

        <div>
          <Label htmlFor="preferred-name">
            Nome social / Como prefere ser chamado(a){" "}
            <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Input
            id="preferred-name"
            value={data.preferred_name}
            onChange={(e) => set("preferred_name", e.target.value)}
            maxLength={120}
            placeholder="Ex.: Alex, Bia, Dani…"
            className="h-12 text-base"
          />
        </div>

        <div>
          <Label htmlFor="pronouns">
            Pronomes de tratamento{" "}
            <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Select value={data.pronouns || undefined} onValueChange={(val) => set("pronouns", val)}>
            <SelectTrigger id="pronouns" className="h-12 text-base bg-background">
              <SelectValue placeholder="Selecione seus pronomes" />
            </SelectTrigger>
            <SelectContent>
              {PRONOUN_OPTIONS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="birth">Data de nascimento *</Label>
          <Input
            id="birth"
            type="date"
            max={todayISO}
            min="1900-01-01"
            value={data.birth_date}
            onChange={(e) => set("birth_date", e.target.value)}
            className="h-12 text-base"
          />
          {birthError ? (
            <p className="mt-1 text-xs text-destructive">{birthError}</p>
          ) : age != null ? (
            <p className="mt-1 text-xs text-muted-foreground">{age} anos</p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="sex">Sexo biológico / Identidade de gênero *</Label>
          <Select
            value={genderSelectValue}
            onValueChange={(val) => {
              if (val === "Outra identidade") {
                set("respondent_sex", "Outra identidade");
              } else {
                set("respondent_sex", val);
              }
            }}
          >
            <SelectTrigger id="sex" className="h-12 text-base bg-background">
              <SelectValue placeholder="Selecione como você se identifica" />
            </SelectTrigger>
            <SelectContent>
              {GENDER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isOtherPrefix && (
            <div className="mt-2">
              <Input
                placeholder="Como prefere se identificar? (opcional)"
                value={customGenderText}
                onChange={(e) => {
                  const text = e.target.value;
                  set("respondent_sex", text ? `Outra: ${text}` : "Outra identidade");
                }}
                maxLength={60}
                className="h-11 text-sm"
              />
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="email">E-mail *</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            value={data.respondent_email}
            onChange={(e) => set("respondent_email", e.target.value.trim().toLowerCase())}
            maxLength={200}
            placeholder="seu.email@exemplo.com"
            className="h-12 text-base"
          />
          {emailError && <p className="mt-1 text-xs text-destructive">{emailError}</p>}
        </div>

        <div>
          <Label htmlFor="phone">
            Telefone / WhatsApp{" "}
            <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={data.respondent_phone}
            onChange={(e) => set("respondent_phone", maskPhoneBR(e.target.value))}
            maxLength={16}
            placeholder="(11) 99999-9999"
            className="h-12 text-base"
          />
          {phoneError ? (
            <p className="mt-1 text-xs text-destructive">{phoneError}</p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Para contato e orientações do consultório.
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="complaint">O que motiva sua busca por atendimento? (opcional)</Label>
          <Textarea
            id="complaint"
            rows={4}
            value={data.main_complaint}
            onChange={(e) => set("main_complaint", e.target.value)}
            maxLength={2000}
            className="text-base"
          />
        </div>
      </div>

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={onBack} className="w-full sm:w-auto">
          Voltar
        </Button>
        <Button disabled={!valid} onClick={onNext} className="w-full sm:w-auto">
          Continuar
        </Button>
      </div>
    </Card>
  );
}

function Sintomas({
  selected,
  onChange,
  onNext,
  onBack,
  submitting,
  isMale,
}: {
  selected: string[];
  onChange: (s: string[]) => void;
  onNext: () => void;
  onBack: () => void;
  submitting: boolean;
  isMale?: boolean;
}) {
  const visibleOptions = useMemo(() => {
    if (!isMale) return SYMPTOM_QUESTION.options;
    return SYMPTOM_QUESTION.options.filter((opt) => opt.id !== "perinatal");
  }, [isMale]);

  // Se por qualquer razão 'perinatal' estiver presente no array para paciente masculino, purga imediatamente
  useEffect(() => {
    if (isMale && selected.includes("perinatal")) {
      onChange(selected.filter((id) => id !== "perinatal"));
    }
  }, [isMale, selected, onChange]);

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  return (
    <Card className="border-border bg-card p-6 sm:p-8">
      <h1 className="font-serif text-xl font-semibold sm:text-2xl">{SYMPTOM_QUESTION.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{SYMPTOM_QUESTION.subtitle}</p>
      <div className="mt-6 grid gap-3">
        {visibleOptions.map((opt) => {
          const on = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggle(opt.id)}
              className={`min-h-14 rounded-xl border px-4 py-3 text-left text-base transition-colors ${
                on
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background hover:border-primary/50"
              }`}
            >
              <span className="font-medium">{opt.label}</span>
              {opt.hint && (
                <span className="mt-1 block text-xs text-muted-foreground">{opt.hint}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={onBack} className="w-full sm:w-auto">
          Voltar
        </Button>
        <Button onClick={onNext} disabled={submitting} className="w-full sm:w-auto">
          {submitting ? "Enviando…" : "Continuar"}
        </Button>
      </div>
    </Card>
  );
}

function TelaRisco({
  branding,
  recommendations,
  onDownload,
}: {
  branding: BrandingType;
  recommendations: PsychoTriggerResult[];
  onDownload: () => void;
}) {
  return (
    <div className="space-y-4">
      <Card className="border-destructive/50 bg-destructive/5 p-6 sm:p-8">
        <h1 className="font-serif text-2xl font-semibold text-destructive">
          Você não precisa passar por isso sozinho(a)
        </h1>
        <p className="mt-3 text-base leading-relaxed text-foreground/85">
          {branding.emergency.message}
        </p>
        <div className="mt-6 space-y-3">
          <a
            href={`tel:${branding.emergency.cvvPhone}`}
            className="flex min-h-14 items-center justify-between rounded-xl border border-destructive/40 bg-background px-4 py-3"
          >
            <span className="text-sm font-medium">{branding.emergency.cvvLabel}</span>
            <span className="text-lg font-semibold text-destructive">
              {branding.emergency.cvvPhone}
            </span>
          </a>
          <a
            href={`tel:${branding.emergency.samuPhone}`}
            className="flex min-h-14 items-center justify-between rounded-xl border border-border bg-background px-4 py-3"
          >
            <span className="text-sm font-medium">SAMU — emergência médica</span>
            <span className="text-lg font-semibold">{branding.emergency.samuPhone}</span>
          </a>
        </div>
        <p className="mt-6 text-sm text-foreground/80">
          Procure atendimento imediato em um pronto-socorro ou CAPS mais próximo se o sofrimento
          estiver intenso agora.
        </p>
      </Card>

      <Card className="p-6">
        <p className="text-sm text-foreground/80">
          Suas respostas foram enviadas e a equipe clínica será avisada com prioridade.
        </p>
        <Button variant="outline" onClick={onDownload} className="mt-4 w-full sm:w-auto">
          Baixar meu resumo em PDF
        </Button>
      </Card>

      <CardsPsicoeducacao items={recommendations} />
    </div>
  );
}

function TelaFinal({
  branding,
  email,
  recommendations,
  onDownload,
}: {
  branding: BrandingType;
  email: string;
  recommendations: PsychoTriggerResult[];
  onDownload: () => void;
}) {
  return (
    <div className="space-y-6">
      <Card className="border-border bg-card p-8 text-center sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="mt-5 font-serif text-2xl font-semibold">Pré-avaliação concluída</h1>
        <p className="mt-3 text-sm text-muted-foreground">{branding.doneCopy}</p>
        {email && (
          <p className="mt-2 text-sm text-muted-foreground">
            Uma confirmação será enviada para <strong>{email}</strong>.
          </p>
        )}
        <Button variant="outline" onClick={onDownload} className="mt-6 w-full sm:w-auto">
          Baixar meu resumo em PDF
        </Button>
        <p className="mt-5 text-sm text-muted-foreground">
          Quer rever este resumo depois?{" "}
          <Link
            to="/primeiro-acesso"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Crie seu acesso no Portal do Paciente
          </Link>{" "}
          com o mesmo e-mail informado aqui.
        </p>
        <p className="mt-6 text-xs text-muted-foreground">{branding.disclaimer}</p>
      </Card>

      <CardsPsicoeducacao items={recommendations} />
    </div>
  );
}
