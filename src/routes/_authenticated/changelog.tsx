import { createFileRoute } from "@tanstack/react-router";
import { PainelShell } from "@/components/painel/PainelShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CHANGELOG,
  CURRENT_VERSION,
  formatDeliveryDate,
  UNVERSIONED,
} from "@/config/deliveries";
import { downloadRoadmapPdf } from "@/lib/pdf-manual";

export const Route = createFileRoute("/_authenticated/changelog")({
  head: () => ({
    meta: [
      { title: "Changelog por versão | Pré-triagem" },
      {
        name: "description",
        content:
          "Histórico de versões da plataforma de pré-triagem: o que foi entregue, o impacto para o consultório e links de apoio.",
      },
      { property: "og:title", content: "Changelog por versão" },
      {
        property: "og:description",
        content: "O que mudou em cada versão da plataforma de pré-triagem.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Changelog,
});

function Changelog() {
  const total = CHANGELOG.reduce((n, v) => n + v.items.length, 0);

  return (
    <PainelShell
      title="Changelog"
      action={
        <Button size="sm" variant="outline" onClick={() => downloadRoadmapPdf()}>
          Baixar roadmap em PDF
        </Button>
      }
    >
      <div className="space-y-6">
        <Card className="space-y-2 p-4 sm:p-6">
          <h1 className="font-serif text-xl font-semibold sm:text-2xl">
            O que mudou em cada versão
          </h1>
          <p className="text-sm text-muted-foreground">
            {total} entrega{total === 1 ? "" : "s"} registrada
            {total === 1 ? "" : "s"} em {CHANGELOG.length} versõe
            {CHANGELOG.length === 1 ? "m" : "s"}. Versão atual:{" "}
            <span className="font-medium text-foreground">
              {CURRENT_VERSION === UNVERSIONED
                ? UNVERSIONED
                : `v${CURRENT_VERSION}`}
            </span>
            .
          </p>
        </Card>

        {CHANGELOG.map((v) => (
          <Card key={v.version} className="space-y-4 p-4 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-serif text-lg font-semibold">
                {v.version === UNVERSIONED ? UNVERSIONED : `Versão ${v.version}`}
              </h2>
              {v.date && (
                <span className="text-xs text-muted-foreground">
                  {formatDeliveryDate(v.date)}
                </span>
              )}
              {v.version === CURRENT_VERSION && v.version !== UNVERSIONED && (
                <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium">
                  Atual
                </span>
              )}
              {v.areas.map((a) => (
                <span
                  key={a}
                  className="inline-flex rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  {a}
                </span>
              ))}
            </div>

            <ul className="space-y-3">
              {v.items.map((item) => (
                <li
                  key={`${item.date}-${item.title}`}
                  className="rounded-md border border-border p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">
                      {item.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDeliveryDate(item.date)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.detail}
                  </p>
                  {item.impact && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        Impacto:
                      </span>{" "}
                      {item.impact}
                    </p>
                  )}
                  {item.links && item.links.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-3">
                      {item.links.map((l) => (
                        <a
                          key={l.url}
                          href={l.url}
                          className="text-xs font-medium text-primary underline underline-offset-4"
                        >
                          {l.label}
                        </a>
                      ))}
                    </div>
                  )}
                  {item.images && item.images.length > 0 && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {item.images.map((img) => (
                        <figure key={img.url} className="space-y-1">
                          <img
                            src={img.url}
                            alt={img.caption ?? `Print da entrega ${item.title}`}
                            loading="lazy"
                            className="w-full rounded-md border border-border"
                          />
                          {img.caption && (
                            <figcaption className="text-[11px] text-muted-foreground">
                              {img.caption}
                            </figcaption>
                          )}
                        </figure>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </PainelShell>
  );
}
