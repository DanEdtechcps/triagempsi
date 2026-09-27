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

type QuizData = { questions?: Array<{ question: string }> };
type FlashData = { cards?: Array<{ front: string }> };

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
            {ASSET_LABEL.quiz} ({quizData.questions.length} perguntas)
          </summary>
          <ol className="list-decimal space-y-1 pl-5 pt-2 text-muted-foreground">
            {quizData.questions.map((q, i) => (
              <li key={i}>{q.question}</li>
            ))}
          </ol>
        </details>
      )}
      {flashData?.cards && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">
            {ASSET_LABEL.flashcards} ({flashData.cards.length})
          </summary>
          <ul className="list-disc space-y-1 pl-5 pt-2 text-muted-foreground">
            {flashData.cards.map((c, i) => (
              <li key={i}>{c.front}</li>
            ))}
          </ul>
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
          <p className="text-sm text-muted-foreground">
            Guia clínico completo (briefing-doc) sobre Terapia Comunitária Integrativa e evidência
            de grupoterapia — tom clínico-acadêmico, citações conferidas contra a fonte. Arquivo
            completo em <code>documentos/conteudo-gerado/terapia-grupo-tci/</code> no repositório
            saraiva-lms.
          </p>
        </Card>

        <Card className="space-y-2 p-4">
          <p className="font-medium">Trilha: Pré-prova (residência/Revalida) — quiz técnico</p>
          <p className="text-sm text-muted-foreground">
            Mesmo material-base de TCI/terapia em grupo, mas em formato de vinheta clínica objetiva,
            dificuldade alta — testa critério e conduta, não decoreba de citação. Arquivo em{" "}
            <code>documentos/conteudo-gerado/pre-prova-tci-grupo/</code>.
          </p>
        </Card>

        <Card className="space-y-2 p-4">
          <p className="font-medium">
            Trilha: Formação gratuita SUS — Médico de Família e Equipe (mhGAP)
          </p>
          <p className="text-sm text-muted-foreground">
            Vídeo explicativo (~8 min) e podcast aprofundado (~25 min) sobre o modelo mhGAP da OMS,
            com foco explícito no papel de cada membro da equipe de atenção primária (agente
            comunitário, enfermagem, médico de família) — não é conteúdo só pro médico sozinho.
            Arquivos em <code>documentos/conteudo-gerado/sus-medico-familia-mhgap/</code>.
          </p>
        </Card>
      </section>
    </div>
  );
}
