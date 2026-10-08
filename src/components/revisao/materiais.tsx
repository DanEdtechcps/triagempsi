import { useState } from "react";
import { CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  contarNos,
  corrigirEscolha,
  driveOpenUrl,
  isDriveUrl,
  parseFlashcards,
  parseMapa,
  parseMidias,
  parseQuiz,
  respostaConfere,
  type MapaNo,
  type MidiaFormato,
  type QuizPergunta,
} from "@/lib/review-material";
import type { JsonValue } from "@/lib/review-studio";

/** Moldura de cada formato de mídia. O padrão (vertical) é o dos vídeos curtos de 9:16. */
const MOLDURA: Record<MidiaFormato, string> = {
  vertical: "aspect-[9/16] w-full max-w-xs",
  horizontal: "aspect-video w-full",
  pagina: "aspect-video w-full",
  imagem: "h-[70vh] w-full",
  logo: "aspect-video w-full",
  audio: "h-40 w-full",
};

const IMAGEM = /\.(png|jpe?g|webp|gif|svg)(\?|#|$)/i;
const AUDIO = /\.(mp3|m4a|wav|ogg)(\?|#|$)/i;

export function Midia({
  url,
  titulo,
  formato = "vertical",
  className,
}: {
  url: string;
  titulo: string;
  formato?: MidiaFormato;
  className?: string;
}) {
  const moldura = `${MOLDURA[formato]} ${className ?? ""}`;
  const abrir = driveOpenUrl(url);
  return (
    <div className="space-y-1">
      {isDriveUrl(url) ? (
        <iframe
          src={url}
          title={`Material: ${titulo}`}
          allow="autoplay"
          // Sem allow-top-navigation: o visualizador do Drive não pode redirecionar a página inteira
          // (um arquivo não compartilhado leva ao login do Google).
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="no-referrer"
          loading="lazy"
          className={`rounded-lg border-0 bg-muted ${moldura}`}
        />
      ) : IMAGEM.test(url) ? (
        <img
          src={url}
          alt={titulo}
          loading="lazy"
          className="max-h-[70vh] w-full rounded-lg border bg-white object-contain"
        />
      ) : AUDIO.test(url) ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption -- áudio de apoio; a transcrição vai no relatório do material
        <audio controls preload="metadata" src={url} className="w-full" />
      ) : (
        // eslint-disable-next-line jsx-a11y/media-has-caption -- o texto falado já aparece na tela (legenda aberta); arquivos de legenda ficam para a fase de acessibilidade
        <video
          controls
          preload="metadata"
          className={`max-h-[480px] rounded-lg bg-black ${formato === "vertical" ? "w-full max-w-xs" : "w-full"}`}
          src={url}
        />
      )}
      {abrir && (
        <a
          href={abrir}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground underline"
        >
          <ExternalLink className="h-3 w-3" aria-hidden="true" /> Abrir em outra aba
        </a>
      )}
    </div>
  );
}

function Recolhivel({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <details className="rounded-lg border p-2 text-sm">
      <summary className="cursor-pointer font-medium">{titulo}</summary>
      <div className="mt-2 space-y-3">{children}</div>
    </details>
  );
}

function PerguntaEscolha({ q, n }: { q: Extract<QuizPergunta, { tipo: "escolha" }>; n: number }) {
  const [marcadas, setMarcadas] = useState<ReadonlySet<number>>(new Set());
  const [conferida, setConferida] = useState(false);
  const resultado = corrigirEscolha(q.opcoes, marcadas);
  const tipo = q.multipla ? "checkbox" : "radio";

  function alternar(i: number) {
    if (conferida) return;
    setMarcadas((atual) => {
      const novo = new Set(q.multipla ? atual : []);
      if (atual.has(i) && q.multipla) novo.delete(i);
      else novo.add(i);
      return novo;
    });
  }

  return (
    <fieldset className="space-y-2">
      <legend className="font-medium">
        {n}. {q.pergunta}
      </legend>
      {q.multipla && <p className="text-xs text-muted-foreground">Marque todas as corretas.</p>}
      {q.dica && !conferida && <p className="text-xs text-muted-foreground">Dica: {q.dica}</p>}
      {q.opcoes.map((o, i) => (
        <label
          key={o.texto}
          className={`block rounded border p-2 ${
            conferida && o.correta
              ? "border-emerald-600 bg-emerald-50"
              : conferida && marcadas.has(i)
                ? "border-red-500 bg-red-50"
                : ""
          }`}
        >
          <input
            type={tipo}
            name={`q${n}-${q.pergunta.slice(0, 20)}`}
            checked={marcadas.has(i)}
            onChange={() => alternar(i)}
            disabled={conferida}
            className="mr-2"
          />
          {o.texto}
          {conferida && (o.correta || marcadas.has(i)) && o.justificativa && (
            <span className="mt-1 block text-xs text-muted-foreground">{o.justificativa}</span>
          )}
        </label>
      ))}
      <div className="flex items-center gap-3">
        {!conferida ? (
          <Button
            type="button"
            size="sm"
            disabled={marcadas.size === 0}
            onClick={() => setConferida(true)}
          >
            Conferir
          </Button>
        ) : (
          <>
            <span className="flex items-center gap-1 text-sm" role="status">
              {resultado === "certo" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" aria-hidden="true" />
              )}
              {resultado === "certo" ? "Certo" : resultado === "parcial" ? "Parcial" : "Errado"}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setMarcadas(new Set());
                setConferida(false);
              }}
            >
              Refazer
            </Button>
          </>
        )}
      </div>
    </fieldset>
  );
}

function PerguntaResposta({ q, n }: { q: Extract<QuizPergunta, { tipo: "resposta" }>; n: number }) {
  const [digitada, setDigitada] = useState("");
  const [vista, setVista] = useState(false);
  const confere = respostaConfere(digitada, q.modelo, q.aceitas);
  return (
    <div className="space-y-2">
      <p className="font-medium">
        {n}. {q.pergunta}
      </p>
      {q.dica && !vista && <p className="text-xs text-muted-foreground">Dica: {q.dica}</p>}
      <input
        value={digitada}
        onChange={(e) => setDigitada(e.target.value)}
        className="w-full rounded border bg-background p-2 text-sm"
        placeholder="Sua resposta (opcional)"
        aria-label={`Resposta da pergunta ${n}`}
        maxLength={400}
      />
      {!vista ? (
        <Button type="button" size="sm" onClick={() => setVista(true)}>
          Ver resposta
        </Button>
      ) : (
        <div className="rounded border bg-muted p-2 text-sm">
          {digitada.trim() && (
            <p className="text-xs" role="status">
              {confere ? "Sua resposta confere." : "Sua resposta é diferente da esperada."}
            </p>
          )}
          <p>
            <span className="font-medium">Esperado:</span> {q.modelo}
          </p>
          {q.justificativa && (
            <p className="mt-1 text-xs text-muted-foreground">{q.justificativa}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function QuizInterativo({ dados }: { dados: JsonValue | undefined }) {
  const quiz = parseQuiz(dados);
  if (!quiz) return null;
  return (
    <Recolhivel titulo={`Quiz: ${quiz.perguntas.length} perguntas`}>
      {quiz.perguntas.map((q, i) =>
        q.tipo === "escolha" ? (
          <PerguntaEscolha key={q.pergunta} q={q} n={i + 1} />
        ) : (
          <PerguntaResposta key={q.pergunta} q={q} n={i + 1} />
        ),
      )}
    </Recolhivel>
  );
}

export function FlashcardsLista({ dados }: { dados: JsonValue | undefined }) {
  const cartoes = parseFlashcards(dados);
  if (cartoes.length === 0) return null;
  return (
    <Recolhivel titulo={`Flashcards: ${cartoes.length} cartões`}>
      <ul className="space-y-1">
        {cartoes.map((c) => (
          <li key={c.frente}>
            <details className="rounded border p-2">
              <summary className="cursor-pointer">{c.frente}</summary>
              <p className="mt-1 text-muted-foreground">{c.verso}</p>
            </details>
          </li>
        ))}
      </ul>
    </Recolhivel>
  );
}

function NoMapa({ no, nivel }: { no: MapaNo; nivel: number }) {
  return (
    <li>
      <span className={nivel === 0 ? "font-semibold" : nivel === 1 ? "font-medium" : ""}>
        {no.nome}
      </span>
      {no.filhos.length > 0 && (
        <ul className="ml-4 list-disc space-y-0.5">
          {no.filhos.map((f) => (
            <NoMapa key={f.nome} no={f} nivel={nivel + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function MapaMental({ dados }: { dados: JsonValue | undefined }) {
  const mapa = parseMapa(dados);
  if (!mapa) return null;
  return (
    <Recolhivel titulo={`Mapa mental: ${contarNos(mapa)} tópicos`}>
      <ul className="space-y-0.5">
        <NoMapa no={mapa} nivel={0} />
      </ul>
    </Recolhivel>
  );
}

/** Tudo que uma opção (ou o próprio item) pode trazer: mídias, quiz, flashcards e mapa mental. */
export function MateriaisDoItem({ fonte }: { fonte: { [key: string]: JsonValue } }) {
  const midias = parseMidias(fonte.midias);
  return (
    <div className="space-y-3">
      {midias.map((m) => (
        <div key={m.url} className="space-y-1">
          <p className="text-xs font-medium">{m.titulo}</p>
          <Midia url={m.url} titulo={m.titulo} formato={m.formato} />
        </div>
      ))}
      <QuizInterativo dados={fonte.quiz} />
      <FlashcardsLista dados={fonte.flashcards} />
      <MapaMental dados={fonte.mapa} />
    </div>
  );
}
