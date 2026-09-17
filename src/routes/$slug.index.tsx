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
            <Link
              to="/entrar"
              className="font-medium text-primary hover:text-primary/80"
            >
              Portal do paciente
            </Link>
            <Link
              to="/auth"
              className="text-muted-foreground hover:text-foreground"
            >
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
        <section className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 sm:py-20">
          <p className="text-xs uppercase tracking-widest text-primary">
            {branding.tagline}
          </p>
          <h1 className="mt-4 font-serif text-3xl font-semibold leading-tight text-foreground sm:text-4xl md:text-5xl">
            Uma primeira consulta mais produtiva começa aqui.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-foreground/70">
            {clinic.about ?? branding.introCopy}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row sm:flex-wrap">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to="/$slug/triagem" params={{ slug }}>
                Começar minha pré-avaliação
              </Link>
            </Button>
            <span className="text-sm text-muted-foreground">
              cerca de 10 minutos
            </span>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6 sm:pb-24">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                t: "Confidencial",
                d: "Suas respostas ficam disponíveis apenas para a equipe clínica responsável.",
              },
              {
                t: "Instrumentos validados",
                d: "Escalas de rastreio reconhecidas, abertas conforme o que você relatar.",
              },
              {
                t: "No seu tempo",
                d: "Responda pelo celular, no seu ritmo. Se parar, retomamos de onde ficou.",
              },
            ].map((c) => (
              <div
                key={c.t}
                className="rounded-lg border border-border bg-card p-5"
              >
                <div className="font-serif text-lg font-semibold">{c.t}</div>
                <p className="mt-2 text-sm text-muted-foreground">{c.d}</p>
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
