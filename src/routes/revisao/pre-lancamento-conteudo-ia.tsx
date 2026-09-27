import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

/**
 * Página de revisão externa (Dr. Saraiva comparando as trilhas geradas por
 * IA — paciente/triagem-medica vs. médico/Corte 800) — link não listado,
 * nunca em navegação nem sitemap. "Segurança" é só obscuridade de URL, de
 * propósito (pedido do usuário 2026-09-27): quem revisa não é
 * necessariamente usuário do sistema.
 *
 * Lista TODOS os jobs em aguardando_aprovacao/aprovado automaticamente
 * (via /api/public/psychoeducation-preview sem job_id) — conforme a
 * esteira produz conteúdo novo, ele aparece aqui sozinho, sem precisar
 * editar este arquivo por peça.
 */
export const Route = createFileRoute("/revisao/pre-lancamento-conteudo-ia")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Prévia de conteúdo — revisão externa" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RevisaoPage,
});

type AssetKind = "video" | "infografico" | "quiz" | "podcast" | "leitura" | "flashcards";
type Asset = {
  kind: AssetKind;
  media_url: string | null;
  data_json: unknown;
  body_md: string | null;
};
type PreviewItem = {
  job_id: string;
  topic: { slug: string; title: string } | null;
  assets: Asset[];
};

const ASSET_LABEL: Record<AssetKind, string> = {
  video: "Vídeo",
  infografico: "Infográfico",
  quiz: "Quiz",
  flashcards: "Flashcards",
  podcast: "Áudio",
  leitura: "Leitura/Relatório",
};

type AnswerOption = { text: string; isCorrect: boolean; rationale: string };
type QuizQuestion = {
  type: string;
  question: string;
  answerOptions?: AnswerOption[];
  bestAnswer?: string;
  acceptableAnswers?: string[];
  rationale?: string;
  grading?: { modelAnswer: string; rationale: string };
  hint?: string;
};
type QuizData = { title?: string; questions?: QuizQuestion[] };
type FlashCard = { front: string; back: string };
type FlashData = { title?: string; cards?: FlashCard[] };

/** Busca e faz cache do conteúdo de um asset JSON (quiz/flashcards) a
 * partir do `media_url` — o backend só grava `media_url` pra todo asset
 * (mesmo os que são JSON, não mídia binária), nunca `data_json`; a página
 * tem que baixar o arquivo pra ler o conteúdo, igual faria pra vídeo/imagem. */
function useJsonAsset<T>(url: string | null | undefined): T | null {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("not ok"))))
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        /* silencioso — a peça só não aparece na prévia */
      });
    return () => {
      cancelled = true;
    };
  }, [url]);
  return data;
}

function useTextAsset(url: string | null | undefined): string | null {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    fetch(url)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error("not ok"))))
      .then((t) => {
        if (!cancelled) setText(t);
      })
      .catch(() => {
        /* silencioso */
      });
    return () => {
      cancelled = true;
    };
  }, [url]);
  return text;
}

function QuizQuestionView({ q, index }: { q: QuizQuestion; index: number }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const [textAnswer, setTextAnswer] = useState("");

  const isChoice = q.type === "multiple_choice" || q.type === "multiple_select";
  const isFillBlank = q.type === "fill_in_the_blank";
  const isShortAnswer = q.type === "short_answer";

  const toggleOption = (i: number) => {
    if (revealed) return;
    const next = new Set(selected);
    if (q.type === "multiple_choice") {
      next.clear();
      next.add(i);
    } else if (next.has(i)) {
      next.delete(i);
    } else {
      next.add(i);
    }
    setSelected(next);
  };

  const checkFillBlank = () => {
    const norm = (s: string) => s.trim().toLowerCase();
    const ok = (q.acceptableAnswers ?? [q.bestAnswer ?? ""]).some(
      (a) => norm(a) === norm(textAnswer),
    );
    setRevealed(true);
    return ok;
  };

  return (
    <li className="space-y-2 border-b border-border pb-3 last:border-0">
      <p>
        {index + 1}. {q.question}
      </p>

      {isChoice && q.answerOptions && (
        <div className="space-y-1">
          {q.answerOptions.map((opt, i) => {
            const isSelected = selected.has(i);
            const showState = revealed && (isSelected || opt.isCorrect);
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggleOption(i)}
                className={`block w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                  showState
                    ? opt.isCorrect
                      ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                      : "border-red-300 bg-red-50 text-red-900"
                    : isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted"
                }`}
              >
                {opt.text}
                {showState && (
                  <span className="mt-1 block text-xs text-muted-foreground">{opt.rationale}</span>
                )}
              </button>
            );
          })}
          {!revealed && selected.size > 0 && (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="text-xs font-medium text-primary underline"
            >
              Conferir resposta
            </button>
          )}
        </div>
      )}

      {isFillBlank && (
        <div className="space-y-1">
          <input
            type="text"
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            disabled={revealed}
            placeholder="Sua resposta…"
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
          />
          {!revealed ? (
            <button
              type="button"
              onClick={checkFillBlank}
              className="text-xs font-medium text-primary underline"
            >
              Conferir resposta
            </button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Resposta esperada: <strong>{q.bestAnswer}</strong> — {q.rationale}
            </p>
          )}
        </div>
      )}

      {isShortAnswer && (
        <div className="space-y-1">
          <textarea
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            disabled={revealed}
            placeholder="Sua resposta…"
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
            rows={2}
          />
          {!revealed ? (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="text-xs font-medium text-primary underline"
            >
              Ver resposta modelo
            </button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Resposta modelo: {q.grading?.modelAnswer}
            </p>
          )}
        </div>
      )}

      {q.hint && !revealed && (
        <p className="text-xs italic text-muted-foreground">Dica: {q.hint}</p>
      )}
    </li>
  );
}

function FlashcardsView({ cards }: { cards: FlashCard[] }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[index];

  const go = (delta: number) => {
    setIndex((i) => (i + delta + cards.length) % cards.length);
    setFlipped(false);
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="flex min-h-28 w-full items-center justify-center rounded-lg border border-border bg-muted/40 p-4 text-center text-sm"
      >
        {flipped ? card.back : card.front}
      </button>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <button type="button" onClick={() => go(-1)} className="underline">
          ← anterior
        </button>
        <span>
          {index + 1} / {cards.length} — clique no card pra{" "}
          {flipped ? "ver a pergunta" : "ver a resposta"}
        </span>
        <button type="button" onClick={() => go(1)} className="underline">
          próximo →
        </button>
      </div>
    </div>
  );
}

const CORTE800_RELATORIO_URL =
  "/api/public/psychoeducation-asset?path=corte800%2Fterapia-grupo-tci%2Fterapia-grupo-tci_relatorio.md";
const CORTE800_PRE_PROVA_QUIZ_URL =
  "/api/public/psychoeducation-asset?path=corte800%2Fpre-prova-tci-grupo%2Fpre-prova-tci-grupo_quiz.json";

function RelatorioTciView() {
  const md = useTextAsset(CORTE800_RELATORIO_URL);
  if (!md) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-medium">Ler relatório completo</summary>
      <pre className="mt-2 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs">
        {md}
      </pre>
    </details>
  );
}

function PreProvaQuizView() {
  const quizData = useJsonAsset<QuizData>(CORTE800_PRE_PROVA_QUIZ_URL);
  if (!quizData?.questions) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-medium">
        Fazer o quiz ({quizData.questions.length} perguntas)
      </summary>
      <ol className="space-y-3 pt-3">
        {quizData.questions.map((q, i) => (
          <QuizQuestionView key={i} q={q} index={i} />
        ))}
      </ol>
    </details>
  );
}

function TriagemItem({ item }: { item: PreviewItem }) {
  const video = item.assets.find((a) => a.kind === "video");
  const infografico = item.assets.find((a) => a.kind === "infografico");
  const quiz = item.assets.find((a) => a.kind === "quiz");
  const flashcards = item.assets.find((a) => a.kind === "flashcards");
  const quizData = useJsonAsset<QuizData>(quiz?.media_url);
  const flashData = useJsonAsset<FlashData>(flashcards?.media_url);

  return (
    <Card className="space-y-3 p-4">
      <p className="font-medium">{item.topic?.title ?? "(tópico sem título)"}</p>
      {video?.media_url && (
        <video controls className="w-full max-w-xs rounded-lg" src={video.media_url} />
      )}
      {infografico?.media_url && (
        <img src={infografico.media_url} alt="" className="w-full max-w-sm rounded-lg" />
      )}
      {quizData?.questions && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">
            {ASSET_LABEL.quiz} ({quizData.questions.length} perguntas) — clique numa alternativa pra
            responder
          </summary>
          <ol className="space-y-3 pt-3">
            {quizData.questions.map((q, i) => (
              <QuizQuestionView key={i} q={q} index={i} />
            ))}
          </ol>
        </details>
      )}
      {flashData?.cards && flashData.cards.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">
            {ASSET_LABEL.flashcards} ({flashData.cards.length}) — clique no card pra virar
          </summary>
          <div className="pt-3">
            <FlashcardsView cards={flashData.cards} />
          </div>
        </details>
      )}
    </Card>
  );
}

function RevisaoPage() {
  const [items, setItems] = useState<PreviewItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/public/psychoeducation-preview")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("not ok"))))
      .then((d) => setItems(d.items ?? []))
      .catch(() => setLoadError("Não consegui carregar a prévia do triagem-medica agora."));
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-12">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Revisão externa — não indexado, link não divulgado
        </p>
        <h1 className="text-2xl font-semibold">
          Conteúdo gerado por IA (NotebookLM) — todas as trilhas em rascunho
        </h1>
        <p className="text-muted-foreground">
          Mesmo material-base pode virar registros diferentes conforme o público: pílula pro
          paciente (triagem-medica), formação continuada, pré-prova de residência, ou formação
          gratuita pra equipes do SUS (Corte 800). Nada aqui está publicado — tudo aguarda sua
          aprovação.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          Paciente — Saraiva Clínica de Psiquiatria (pílulas semanais)
        </h2>
        {loadError && <p className="text-sm text-destructive">{loadError}</p>}
        {items === null && !loadError && (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        )}
        {items?.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum item aguardando aprovação ainda.</p>
        )}
        {items?.map((item) => (
          <TriagemItem key={item.job_id} item={item} />
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Médico — Corte 800</h2>

        <Card className="space-y-2 p-4">
          <p className="font-medium">
            Trilha: Formação continuada — Terapia em Grupo e TCI (relatório)
          </p>
          <RelatorioTciView />
        </Card>

        <Card className="space-y-2 p-4">
          <p className="font-medium">Trilha: Pré-prova (residência/Revalida) — quiz técnico</p>
          <p className="text-sm text-muted-foreground">
            Mesmo material-base de TCI/terapia em grupo, formato de vinheta clínica objetiva,
            dificuldade alta — testa critério e conduta, não decoreba de citação.
          </p>
          <PreProvaQuizView />
        </Card>

        <Card className="space-y-3 p-4">
          <p className="font-medium">
            Trilha: Formação gratuita SUS — Médico de Família e Equipe (mhGAP)
          </p>
          <p className="text-sm text-muted-foreground">
            Foco explícito no papel de cada membro da equipe de atenção primária (agente
            comunitário, enfermagem, médico de família) — não é conteúdo só pro médico sozinho.
            Todas as peças geradas nativamente pelo NotebookLM (sem custo adicional, dentro da cota
            da conta).
          </p>
          <video
            controls
            className="w-full max-w-md rounded-lg"
            src="/api/public/psychoeducation-asset?path=corte800%2Fsus-medico-familia-mhgap%2Fsus-medico-familia-mhgap_video.mp4"
          />
          <audio
            controls
            className="w-full"
            src="/api/public/psychoeducation-asset?path=corte800%2Fsus-medico-familia-mhgap%2Fsus-medico-familia-mhgap_podcast.mp3"
          />
          <a
            href="/api/public/psychoeducation-asset?path=corte800%2Fsus-medico-familia-mhgap%2Fsus-medico-familia-mhgap_slide_deck.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary underline"
          >
            Abrir slide-deck (PDF, 20 slides) ↗
          </a>
        </Card>
      </section>
    </div>
  );
}
