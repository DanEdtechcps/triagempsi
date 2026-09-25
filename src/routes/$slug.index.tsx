import { createFileRoute, Link, getRouteApi } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { resolveBranding } from "@/config/branding";

const parentApi = getRouteApi("/$slug");

export const Route = createFileRoute("/$slug/")({
  component: ClinicLanding,
});

function ClinicLanding() {
  const clinic = parentApi.useLoaderData();
  const branding = resolveBranding(clinic);
  const { slug } = Route.useParams();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 sm:flex sm:justify-between sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-center gap-3">
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={branding.clinicName}
                className="h-8 w-8 shrink-0 rounded-md object-cover sm:h-10 sm:w-10"
              />
            ) : null}
            <div className="truncate font-serif text-base font-semibold sm:text-lg">
              {branding.clinicName}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-4 text-sm">
            <Link to="/entrar" className="font-medium text-primary hover:text-primary/80">
              Portal do paciente
            </Link>
            <Link to="/auth" className="text-muted-foreground hover:text-foreground">
              Sou profissional
            </Link>
            <Link
              to="/$slug/triagem"
              params={{ slug }}
              className="text-muted-foreground hover:text-foreground"
            >
              Iniciar
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="landing-grain relative overflow-hidden">
          <div
            className={`mx-auto px-4 py-14 sm:px-6 sm:py-24 ${
              branding.heroImageUrl
                ? "grid max-w-5xl items-center gap-10 sm:grid-cols-[1.1fr_0.9fr] sm:text-left"
                : "max-w-3xl text-center"
            }`}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                {branding.tagline}
              </p>
              <h1 className="mt-5 font-serif text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl">
                {branding.landingHeadline}
              </h1>
              <p
                className={`mt-6 text-base leading-relaxed text-foreground/70 ${
                  branding.heroImageUrl ? "max-w-lg" : "mx-auto max-w-xl"
                }`}
              >
                {clinic.about ?? branding.introCopy}
              </p>
              <div
                className={`mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:flex-wrap ${
                  branding.heroImageUrl ? "items-start" : "items-center justify-center"
                }`}
              >
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link to="/$slug/triagem" params={{ slug }}>
                    Começar minha pré-avaliação
                  </Link>
                </Button>
                <span className="self-center text-sm text-muted-foreground">
                  cerca de 10 minutos
                </span>
              </div>
            </div>

            {branding.heroImageUrl ? (
              <div className="relative overflow-hidden rounded-2xl border border-border shadow-sm">
                <img
                  src={branding.heroImageUrl}
                  alt={branding.clinicName}
                  className="aspect-[4/5] w-full object-cover"
                />
              </div>
            ) : null}
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6 sm:pb-24">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {branding.featureCards.map((c, i) => (
              <div
                key={c.title}
                className={`rounded-lg border border-border bg-card p-5 ${
                  i % 2 === 0 ? "shadow-sm" : "shadow-none"
                }`}
              >
                <div className="font-serif text-lg font-semibold">{c.title}</div>
                <p className="mt-2 text-sm text-muted-foreground">{c.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-4 py-6 text-center text-xs text-muted-foreground sm:px-6">
          {branding.contactEmail ? (
            <div className="mb-1">
              Dúvidas:{" "}
              <a
                href={`mailto:${branding.contactEmail}`}
                className="underline hover:text-foreground"
              >
                {branding.contactEmail}
              </a>
            </div>
          ) : null}
          {branding.disclaimer}
        </div>
      </footer>
    </div>
  );
}
