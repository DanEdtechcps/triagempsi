import { createFileRoute } from "@tanstack/react-router";

import { LandingPage } from "@/components/landing/LandingPage";
import { getLandingSettings } from "@/lib/landing-settings.functions";
import { buildLandingMeta } from "@/lib/landing-meta";

export const Route = createFileRoute("/")({
  loader: async () => await getLandingSettings(),
  head: ({ loaderData }) => {
    const { meta, links } = buildLandingMeta(loaderData);
    return { meta, links };
  },

  component: LandingRoute,
});

function LandingRoute() {
  const settings = Route.useLoaderData();
  return <LandingPage settings={settings} />;
}
