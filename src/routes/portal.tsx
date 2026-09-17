import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  getMyPortalAssessments,
  type PortalAssessment,
} from "@/lib/portal.functions";
import { portalGuidance } from "@/lib/portal-guidance";
import { useStaffRole } from "@/lib/staff";
import { MailWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/portal")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Portal do Paciente — resumo das suas pré-avaliações" },
      {
        name: "description",
        content:
          "Acompanhe o resumo básico das pré-avaliações que você respondeu, com o mesmo e-mail informado na triagem.",
      },
      { property: "og:title", content: "Portal do Paciente" },
      {
        property: "og:description",
        content: "Resumo básico das suas pré-avaliações.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PortalPage,
});

function PortalPage() {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(Boolean(data.session));
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setLoggedIn(Boolean(session));
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        {!ready && (
          <p className="text-center text-sm text-muted-foreground">
            Carregando…
          </p>
        )}
        {ready && !loggedIn && <Navigate to="/entrar" replace />}
        {ready && loggedIn && <PortalDashboard />}
      </div>
    </div>
  );
}


/* -------------------------------- dashboard -------------------------------- */

function PortalDashboard() {
  const queryClient = useQueryClient();
  const fetchAssessments = useServerFn(getMyPortalAssessments);

  const { data, isLoading, error } = useQuery({
    queryKey: ["portal-assessments"],
    queryFn: () => fetchAssessments({}),
    retry: false,
  });

  // Equipe é encaminhada ao painel, mas a verificação é consultiva: o
  // conteúdo do paciente é o padrão e nunca espera por ela.
  const { isStaff } = useStaffRole();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
  }

  if (isStaff) {
    return (
      <Card className="mx-auto w-full max-w-md border-border bg-card p-6 text-center sm:p-8">
        <h1 className="font-serif text-xl font-semibold text-foreground">
          Você faz parte da equipe clínica
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sua conta é de profissional. As pré-avaliações dos pacientes estão no
          painel da clínica.
        </p>
        <Link to="/painel" className="mt-5 block">
          <Button className="w-full">Ir para o painel</Button>
        </Link>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="mt-3 text-sm text-muted-foreground hover:text-foreground"
        >
          Sair desta conta
        </button>
      </Card>
    );
  }

  const assessments = (data ?? []) as PortalAssessment[];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Portal do Paciente
          </p>
          <h1 className="mt-1 font-serif text-2xl font-semibold text-foreground">
            Suas pré-avaliações
          </h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => void handleSignOut()}>
          Sair
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-muted/40 p-4">
        <p className="text-sm font-medium text-foreground">
          Em caso de crise ou pensamentos de morte
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ligue <strong className="text-foreground">188</strong> (CVV — Centro
          de Valorização da Vida, 24h, gratuito) ou procure a emergência mais
          próxima. Não aguarde a consulta.
        </p>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">
          Carregando suas pré-avaliações…
        </p>
      )}
      {error && (
        <p className="text-sm text-destructive">
          {error instanceof Error
            ? error.message
            : "Não foi possível carregar agora."}
        </p>
      )}

      {!isLoading && !error && assessments.length === 0 && (
        <Card className="border-border bg-card p-6 text-center sm:p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <MailWarning className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <h2 className="mt-4 font-serif text-xl font-semibold text-foreground">
            Nenhuma pré-avaliação encontrada para este e-mail
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            O portal encontra seus resultados <strong className="text-foreground">pelo e-mail</strong>.
            Ele só consegue mostrar suas pré-avaliações se você entrar com o{" "}
            <strong className="text-foreground">mesmo e-mail</strong> que informou
            ao responder a triagem.
          </p>

          <div className="mt-5 space-y-2 rounded-xl border border-border bg-muted/40 p-4 text-left">
            <p className="text-sm font-medium text-foreground">O que fazer agora:</p>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">Confira o e-mail:</strong> é o
                mesmo que você digitou na triagem? Vale checar a confirmação de
                resultados que chegou na sua caixa de entrada (e no spam).
              </li>
              <li>
                <strong className="text-foreground">Usou outro e-mail?</strong>{" "}
                Saia desta conta e entre novamente com o e-mail informado na
                triagem.
              </li>
              <li>
                <strong className="text-foreground">Ainda não respondeu?</strong>{" "}
                Faça a pré-avaliação primeiro e depois volte aqui com o mesmo
                e-mail.
              </li>
            </ol>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link to="/triagem">
              <Button className="w-full sm:w-auto">Responder a pré-avaliação</Button>
            </Link>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => void handleSignOut()}
            >
              Entrar com outro e-mail
            </Button>
          </div>
        </Card>
      )}

      {assessments.map((a) => (
        <AssessmentCard key={a.id} assessment={a} />
      ))}

      <p className="text-center text-xs text-muted-foreground">
        Os resultados são instrumentos de rastreio — não constituem diagnóstico.
        A interpretação completa é feita pelo seu médico na consulta.
      </p>
    </div>
  );
}

function AssessmentCard({ assessment }: { assessment: PortalAssessment }) {
  const date = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(assessment.submitted_at));

  return (
    <Card className="border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-serif text-lg font-semibold text-foreground">
            {assessment.clinic_name}
          </h2>
          <p className="text-xs text-muted-foreground">
            Respondida em {date}
            {assessment.respondent_type === "familiar" &&
              ` · por familiar/responsável${
                assessment.informant_relation
                  ? ` (${assessment.informant_relation})`
                  : ""
              }`}
          </p>
        </div>
        <span className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
          {assessment.results.length} instrumento(s)
        </span>
      </div>

      <div className="mt-4 space-y-2.5">
        {assessment.results.map((r, i) => (
          <div
            key={`${r.scale_name}-${i}`}
            className="rounded-lg border border-border bg-background/60 p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground">
                {r.scale_name}
              </span>
              {r.band && (
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs ${
                    (r.band_level ?? 0) >= 2
                      ? "border-primary/40 bg-primary/5 text-foreground"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {r.band}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {portalGuidance(r.band_level)}
            </p>
          </div>
        ))}
        {assessment.results.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Respostas registradas — o resumo será liberado após a revisão da
            equipe.
          </p>
        )}
      </div>
    </Card>
  );
}
