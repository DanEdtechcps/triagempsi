import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordStrengthMeter } from "@/components/PasswordStrengthMeter";
import { useStaffRole } from "@/lib/staff";
import {
  ClipboardList,
  UserPlus,
  MailCheck,
  LayoutDashboard,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";

export const Route = createFileRoute("/primeiro-acesso")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Primeiro acesso — crie sua conta do Portal do Paciente" },
      {
        name: "description",
        content:
          "Passo a passo para criar seu acesso ao Portal do Paciente: use o mesmo e-mail da triagem, confirme o link recebido e acompanhe seus resumos.",
      },
      { property: "og:title", content: "Primeiro acesso — Portal do Paciente" },
      {
        property: "og:description",
        content:
          "Crie sua conta com o mesmo e-mail informado na triagem e acompanhe o resumo das suas pré-avaliações.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PrimeiroAcessoPage,
});

const STEPS = [
  {
    icon: ClipboardList,
    title: "Responda a pré-avaliação",
    text: "Preencha a triagem informando o seu e-mail. É ele que vincula seus resultados a você.",
  },
  {
    icon: UserPlus,
    title: "Crie seu acesso aqui",
    text: "Use o mesmo e-mail da triagem e escolha uma senha. Um clique e sua conta é criada.",
  },
  {
    icon: MailCheck,
    title: "Confirme o e-mail",
    text: "Enviamos um link de confirmação para a sua caixa de entrada. Abra-o para ativar o acesso.",
  },
  {
    icon: LayoutDashboard,
    title: "Entre no portal",
    text: "Pronto! Seus resumos das pré-avaliações ficam disponíveis sempre que você entrar.",
  },
] as const;

function PrimeiroAcessoPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  // Verificação consultiva de equipe: nunca bloqueia a página do paciente.
  const { isStaff } = useStaffRole();

  async function handleCriarConta(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + "/portal" },
      });
      if (error) throw error;
      if (data.session) {
        // Confirmação de e-mail desativada no projeto: entra direto.
        navigate({ to: "/portal" });
        return;
      }
      setSucesso(true);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      setErro(
        /already registered/i.test(raw)
          ? "Este e-mail já tem uma conta. Entre no portal com sua senha ou use \"Esqueci minha senha\"."
          : raw || "Não foi possível criar sua conta agora. Tente em instantes.",
      );
    } finally {
      setLoading(false);
    }
  }


  // Fronteira paciente × profissional: quem tem papel de equipe não cria
  // conta de paciente — é encaminhado ao painel.
  if (isStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md p-6 text-center sm:p-8">
          <h1 className="font-serif text-xl font-semibold text-foreground">
            Você faz parte da equipe clínica
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Esta página é o primeiro acesso de <strong>pacientes</strong>. Como
            profissional, suas telas ficam no painel da clínica.
          </p>
          <Button asChild className="mt-6 w-full">
            <Link to="/painel">Ir para o painel do profissional</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          to="/entrar"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Voltar ao login
        </Link>

        <header className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Portal do Paciente
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-foreground">
            Primeiro acesso
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Em poucos minutos você cria sua conta e passa a acompanhar o resumo
            das suas pré-avaliações. Veja como funciona:
          </p>
        </header>

        {/* Passo a passo */}
        <ol className="mt-8 grid gap-3 sm:grid-cols-2">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="relative rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                  <step.icon className="h-4.5 w-4.5 text-primary" aria-hidden />
                </span>
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Passo {i + 1}
                </span>
              </div>
              <h2 className="mt-3 text-sm font-semibold text-foreground">
                {step.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>

        {/* Formulário / sucesso */}
        {sucesso ? (
          <Card className="mt-8 border-border bg-card p-6 text-center sm:p-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-6 w-6 text-primary" aria-hidden />
            </div>
            <h2 className="mt-4 font-serif text-xl font-semibold text-foreground">
              Conta criada! Confirme seu e-mail
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Enviamos um link de confirmação para{" "}
              <strong className="text-foreground">{email}</strong>. Abra o
              e-mail e clique no link para ativar seu acesso — depois é só
              entrar no portal.
            </p>
            <div className="mt-4 rounded-xl border border-border bg-muted/40 p-4 text-left">
              <p className="text-sm font-medium text-foreground">
                Não encontrou o e-mail?
              </p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                <li>Verifique a caixa de spam ou lixo eletrônico.</li>
                <li>Confira se o endereço foi digitado corretamente.</li>
                <li>Aguarde alguns minutos — o envio pode levar um pouco.</li>
              </ul>
            </div>
            <Link to="/entrar" className="mt-5 block">
              <Button className="w-full">Ir para o login</Button>
            </Link>
          </Card>
        ) : (
          <Card className="mt-8 border-border bg-card p-6 sm:p-8">
            <h2 className="font-serif text-xl font-semibold text-foreground">
              Criar minha conta
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Use o <strong className="text-foreground">mesmo e-mail</strong>{" "}
              que você informou ao responder a triagem — é assim que o portal
              encontra seus resultados.
            </p>

            <form onSubmit={handleCriarConta} className="mt-5 space-y-4">
              <div>
                <Label htmlFor="pa-email">E-mail usado na triagem</Label>
                <Input
                  id="pa-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="text-base"
                  placeholder="voce@exemplo.com"
                />
              </div>
              <div>
                <Label htmlFor="pa-password">Escolha uma senha</Label>
                <Input
                  id="pa-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="text-base"
                />
                <div className="mt-2">
                  <PasswordStrengthMeter value={password} />
                </div>
              </div>

              {erro && (
                <p className="text-sm text-destructive">
                  {erro}{" "}
                  {/já tem uma conta/i.test(erro) && (
                    <Link
                      to="/entrar"
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Ir para o login
                    </Link>
                  )}
                </p>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading
                  ? "Criando sua conta…"
                  : "Criar conta e receber e-mail de confirmação"}
              </Button>
            </form>

            <p className="mt-5 border-t border-border pt-4 text-center text-xs text-muted-foreground">
              Já tem conta?{" "}
              <Link
                to="/entrar"
                className="text-primary underline-offset-4 hover:underline"
              >
                Entrar no portal
              </Link>
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
