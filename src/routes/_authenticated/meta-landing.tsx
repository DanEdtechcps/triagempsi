import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { PainelShell } from "@/components/painel/PainelShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getLandingSettings } from "@/lib/landing-settings.functions";
import {
  LANDING_URL,
  buildLandingMeta,
  landingMetaHtml,
  landingMetaTags,
  validateLandingMeta,
} from "@/lib/landing-meta";

export const Route = createFileRoute("/_authenticated/meta-landing")({
  head: () => ({
    meta: [
      { title: "Validar metatags da landing | Pré-triagem" },
      {
        name: "description",
        content:
          "Confira as metatags Open Graph e Twitter geradas para a landing antes de republicar o site.",
      },
      { property: "og:title", content: "Validar metatags da landing" },
      {
        property: "og:description",
        content: "Prévia das metatags de compartilhamento da landing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MetaLanding,
});

function MetaLanding() {
  const fetchSettings = useServerFn(getLandingSettings);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["landing-settings"],
    queryFn: () => fetchSettings(),
  });

  const { title, description, image } = buildLandingMeta(data);
  const tags = landingMetaTags(data);
  const issues = validateLandingMeta(data);
  const html = landingMetaHtml(data);

  return (
    <PainelShell title="Metatags da landing">
      <p className="mb-4 text-sm text-muted-foreground">
        Prévia exata do que WhatsApp, LinkedIn, X e Google vão ler quando o site for republicado.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
          {isFetching ? "Atualizando…" : "Atualizar"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void navigator.clipboard.writeText(html)}
        >
          Copiar HTML
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <a href="/admin">Editar textos e imagem</a>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <a href={LANDING_URL} target="_blank" rel="noreferrer">
            Abrir landing publicada
          </a>
        </Button>
      </div>

      {isLoading ? (
        <Card className="p-6 text-sm text-muted-foreground">Carregando metatags…</Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,420px)]">
          <div className="space-y-4">
            <Card className="p-5">
              <h2 className="font-serif text-lg font-semibold">Validação</h2>
              {issues.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Tudo certo: título, descrição e imagem estão dentro do recomendado.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {issues.map((issue, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Badge variant={issue.level === "erro" ? "destructive" : "secondary"}>
                        {issue.level === "erro" ? "Erro" : "Atenção"}
                      </Badge>
                      <span className="text-muted-foreground">{issue.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-5">
              <h2 className="font-serif text-lg font-semibold">Tags geradas</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-4 font-medium">Tag</th>
                      <th className="py-2 font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tags.map((t) => (
                      <tr
                        key={`${t.kind}-${t.key}`}
                        className="border-t border-border/60 align-top"
                      >
                        <td className="whitespace-nowrap py-2 pr-4 font-mono text-xs text-muted-foreground">
                          {t.kind === "title"
                            ? "<title>"
                            : t.kind === "link"
                              ? `link ${t.key}`
                              : t.key}
                        </td>
                        <td className="py-2 break-all">{t.value || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="font-serif text-lg font-semibold">HTML</h2>
              <pre className="mt-3 overflow-x-auto rounded-lg bg-muted p-4 text-xs leading-relaxed">
                <code>{html}</code>
              </pre>
            </Card>
          </div>

          <Card className="h-fit space-y-4 p-5">
            <h2 className="font-serif text-lg font-semibold">Prévia do link</h2>
            <div className="overflow-hidden rounded-xl border border-border">
              {image ? (
                <img
                  src={image}
                  alt="Imagem de compartilhamento configurada para a landing"
                  className="aspect-[1200/630] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[1200/630] items-center justify-center bg-muted text-xs text-muted-foreground">
                  Sem imagem configurada
                </div>
              )}
              <div className="space-y-1 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  triagemmedica.lovable.app
                </p>
                <p className="line-clamp-2 text-sm font-semibold">{title}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{description || "—"}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              O preview real só muda depois de republicar o site — plataformas como WhatsApp e
              LinkedIn guardam o último preview em cache.
            </p>
          </Card>
        </div>
      )}
    </PainelShell>
  );
}
