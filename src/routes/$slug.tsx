import {
  createFileRoute,
  Outlet,
  notFound,
  Link,
} from "@tanstack/react-router";
import { getClinicBySlug } from "@/lib/clinics.functions";
import { ClinicTheme } from "@/components/ClinicTheme";

export const Route = createFileRoute("/$slug")({
  loader: async ({ params }) => {
    const clinic = await getClinicBySlug({ data: { slug: params.slug } });
    if (!clinic) throw notFound();
    return clinic;
  },
  head: ({ loaderData }) => {
    const name = loaderData?.name ?? "Triagem";
    const desc =
      loaderData?.tagline ?? "Avaliação pré-consulta psiquiátrica";
    return {
      meta: [
        { title: `${name} — Triagem pré-consulta` },
        { name: "description", content: desc },
        { property: "og:title", content: `${name} — Triagem pré-consulta` },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
      ],
    };
  },
  component: SlugLayout,
  notFoundComponent: ClinicNotFound,
});

function SlugLayout() {
  const clinic = Route.useLoaderData();
  return (
    <ClinicTheme clinic={clinic}>
      <Outlet />
    </ClinicTheme>
  );
}

function ClinicNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-3xl font-semibold text-foreground">
          Clínica não encontrada
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Verifique o link recebido ou volte para a página inicial.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Ir para o início
        </Link>
      </div>
    </div>
  );
}
