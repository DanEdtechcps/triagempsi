import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PainelShell } from "@/components/painel/PainelShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MANUAL_SECTIONS,
  MANUAL_VERSION,
  type ManualBlock,
} from "@/config/manual";
import { downloadManualPdf } from "@/lib/pdf-manual";

export const Route = createFileRoute("/_authenticated/ajuda")({
  head: () => ({
    meta: [
      { title: "Ajuda — Manual do profissional" },
      {
        name: "description",
        content:
          "Manual de uso do painel de pré-triagem em saúde mental, disponível online e em PDF.",
      },
      { property: "og:title", content: "Ajuda — Manual do profissional" },
      {
        property: "og:description",
        content: "Guia clínico e operacional da pré-triagem.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Ajuda,
});

function Bloco({ block }: { block: ManualBlock }) {
  if (block.kind === "p")
    return <p className="text-sm text-muted-foreground">{block.text}</p>;

  if (block.kind === "list")
    return (
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {block.items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    );

  if (block.kind === "steps")
    return (
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        {block.items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ol>
    );

  if (block.kind === "alert")
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {block.text}
      </p>
    );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            {block.head.map((h) => (
              <th key={h} className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row) => (
            <tr key={row.join("|")} className="border-b border-border last:border-0">
              {row.map((cell, i) => (
                <td
                  key={i}
                  className={`px-3 py-2 align-top ${
                    i === 0 ? "font-medium text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Ajuda() {
  const [busca, setBusca] = useState("");

  const secoes = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return MANUAL_SECTIONS;
    return MANUAL_SECTIONS.filter((s) =>
      JSON.stringify(s).toLowerCase().includes(termo),
    );
  }, [busca]);

  return (
    <PainelShell
      title="Ajuda"
      action={
        <Button size="sm" onClick={() => downloadManualPdf()}>
          Baixar manual em PDF
        </Button>
      }
    >
      <div className="space-y-6">
        <Card className="space-y-3 p-4 sm:p-6">
          <div>
            <h1 className="font-serif text-xl font-semibold sm:text-2xl">
              Manual do profissional
            </h1>
            <p className="text-sm text-muted-foreground">
              Versão {MANUAL_VERSION}. Mesmo conteúdo disponível online e em PDF
              para distribuição interna.
            </p>
          </div>
          <label htmlFor="busca-ajuda" className="sr-only">
            Buscar no manual
          </label>
          <input
            id="busca-ajuda"
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar no manual (ex.: risco, PHQ-9, WhatsApp)…"
            className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
          />
          <nav className="flex flex-wrap gap-2">
            {secoes.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {s.title}
              </a>
            ))}
          </nav>
        </Card>

        {secoes.length === 0 && (
          <Card className="p-6 text-sm text-muted-foreground">
            Nenhum trecho do manual corresponde à busca.
          </Card>
        )}

        {secoes.map((s) => (
          <Card key={s.id} id={s.id} className="space-y-3 scroll-mt-24 p-4 sm:p-6">
            <div>
              <h2 className="font-serif text-lg font-semibold">{s.title}</h2>
              <p className="text-xs text-muted-foreground">{s.summary}</p>
            </div>
            {s.blocks.map((b, i) => (
              <Bloco key={i} block={b} />
            ))}
          </Card>
        ))}
      </div>
    </PainelShell>
  );
}
