import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

/**
 * Página de revisão externa (Dr. Saraiva comparando o par
 * paciente/triagem-medica vs. médico/Corte 800 gerado a partir do MESMO
 * material-base) — link não listado, nunca em navegação nem sitemap.
 * "Segurança" é só obscuridade de URL, de propósito (pedido do usuário
 * 2026-09-27): quem revisa não é necessariamente usuário do sistema.
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

const TRIAGEM_JOB_ID = "eaa4fc58-ea27-4aba-9dd7-b5c27882f7a6";

type AssetKind = "video" | "infografico" | "quiz" | "podcast" | "leitura" | "flashcards";
type Asset = {
  kind: AssetKind;
  media_url: string | null;
  data_json: unknown;
  body_md: string | null;
};
type PreviewResponse = { job_id: string; topic: { title: string } | null; assets: Asset[] };

function RevisaoPage() {
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/public/psychoeducation-preview?job_id=${TRIAGEM_JOB_ID}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("not ok"))))
      .then(setPreview)
      .catch(() => setLoadError("Não consegui carregar a prévia do triagem-medica agora."));
  }, []);

  const video = preview?.assets.find((a) => a.kind === "video");
  const infografico = preview?.assets.find((a) => a.kind === "infografico");
  const quiz = preview?.assets.find((a) => a.kind === "quiz");
  const quizData = quiz?.data_json as
    | { title?: string; questions?: Array<{ question: string }> }
    | undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-12">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Revisão externa — não indexado, link não divulgado
        </p>
        <h1 className="text-2xl font-semibold">
          Mesmo material-base, dois públicos: paciente (Saraiva Clínica) vs. médico (Corte 800)
        </h1>
        <p className="text-muted-foreground">
          Conteúdo sobre Terapia em Grupo e Terapia Comunitária Integrativa, gerado por IA
          (NotebookLM) a partir da mesma síntese de evidências — em rascunho, aguardando sua
          aprovação antes de qualquer publicação.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Paciente — Saraiva Clínica de Psiquiatria</h2>

        {loadError && <p className="text-sm text-destructive">{loadError}</p>}

        {video?.media_url && (
          <Card className="space-y-2 p-4">
            <p className="text-sm font-medium">Vídeo-pílula (formato vertical curto)</p>
            <video controls className="w-full max-w-xs rounded-lg" src={video.media_url} />
          </Card>
        )}

        {infografico?.media_url && (
          <Card className="space-y-2 p-4">
            <p className="text-sm font-medium">Infográfico</p>
            <img
              src={infografico.media_url}
              alt="Infográfico gerado sobre grupoterapia"
              className="w-full rounded-lg"
            />
          </Card>
        )}

        {quizData?.questions && (
          <Card className="space-y-2 p-4">
            <p className="text-sm font-medium">
              Quiz ({quizData.questions.length} perguntas) — ⚠️ ver ressalva abaixo
            </p>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              {quizData.questions.map((q, i) => (
                <li key={i}>{q.question}</li>
              ))}
            </ol>
          </Card>
        )}

        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          ⚠️ O quiz acima ainda testa citação acadêmica ("segundo Huntley et al. 2012…") em vez de
          conceito prático em linguagem simples — está sendo corrigido antes da produção dos
          próximos conteúdos. Avalie vídeo e infográfico independentemente disso.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Médico — Corte 800 (formação continuada)</h2>
        <Card className="prose prose-sm max-w-none space-y-3 p-4">
          <h3>
            Guia Clínico: Terapia Comunitária Integrativa (TCI) e Práticas de Grupo na Atenção
            Primária
          </h3>
          <p>
            <strong>1. Fundamentação e Histórico:</strong> A TCI é uma tecnologia de cuidado
            genuinamente brasileira, sistematizada pelo psiquiatra e antropólogo Adalberto de Paula
            Barreto, a partir do trabalho com migrantes no Nordeste. Desde 2010 integra a Política
            Nacional de Práticas Integrativas e Complementares, com mais de 30 mil terapeutas
            comunitários formados no país.
          </p>
          <p>
            <strong>2. Estrutura da roda:</strong> acolhimento (regras de sigilo e escuta) → escolha
            do tema → aprofundamento (identificação do "mote") → problematização (partilha de
            estratégias de superação) → encerramento reflexivo.
          </p>
          <p>
            <strong>3. Evidências citadas</strong> (com autor/ano, nunca inventadas): Huntley, Araya
            & Salisbury (2012); Krishna et al. (2013); Raya-Tena et al. (2021, 2023); Yin, Wan &
            Wang (2025); Mattos et al. (2022); Pawluk, Ward & Niyyati (2026).
          </p>
          <p>
            <strong>4. Aplicabilidade prática:</strong> recomenda ciclos mais curtos e
            over-recruitment diante da baixa adesão em seguimento longo, estratégias ativas pra
            engajar participantes homens, e atenção a barreiras estruturais de agenda/espaço.
          </p>
          <p className="text-xs text-muted-foreground">
            Documento completo gerado disponível em <code>content-pipeline/outputs</code> /
            repositório saraiva-lms — este resumo é só pra comparação rápida de tom nesta página.
          </p>
        </Card>
      </section>
    </div>
  );
}
