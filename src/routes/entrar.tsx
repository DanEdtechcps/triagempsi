import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { checkIsStaff } from "@/lib/staff";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/entrar")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — Portal do Paciente" },
      {
        name: "description",
        content:
          "Entrada rápida do paciente: e-mail e senha para rever o resumo básico das suas pré-avaliações, sem passar pelo painel da equipe.",
      },
      { property: "og:title", content: "Entrar — Portal do Paciente" },
      {
        property: "og:description",
        content: "Entrada rápida do paciente com e-mail e senha.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EntrarPage,
});

/**
 * Entrada rápida do paciente — única superfície de login do portal.
 * Nunca toca no painel da equipe: quem tem papel clínico é roteado ao
 * /painel automaticamente; paciente vai direto ao /portal.
 */
function EntrarPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Sessão existente entra direto, cada papel no seu território.
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const staff = await checkIsStaff(data.session.user.id);
      navigate({ to: staff ? "/painel" : "/portal", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setInfo(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      const staff = data.user ? await checkIsStaff(data.user.id) : false;
      navigate({ to: staff ? "/painel" : "/portal", replace: true });
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      setMsg(
        /invalid login/i.test(raw)
          ? "E-mail ou senha incorretos."
          : raw || "Não foi possível continuar.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    setMsg(null);
    setInfo(null);
    if (!email) {
      setMsg("Digite seu e-mail acima para receber o link de redefinição.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset-password",
      });
      if (error) throw error;
      setInfo(
        "Se este e-mail estiver cadastrado, enviamos um link para criar uma nova senha.",
      );
    } catch {
      setMsg("Não foi possível enviar o link agora. Tente em instantes.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Voltar ao início
        </Link>

        <Card className="mt-6 border-border bg-card p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Portal do Paciente
          </p>
          <h1 className="mt-2 font-serif text-2xl font-semibold text-foreground">
            Entrada rápida
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Entre com o <strong className="text-foreground">mesmo e-mail</strong>{" "}
            que você informou ao responder a pré-avaliação para ver o resumo
            básico dos seus resultados.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="entrar-email">E-mail</Label>
              <Input
                id="entrar-email"
                type="email"
                autoComplete="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-base"
                placeholder="voce@exemplo.com"
              />
            </div>
            <div>
              <Label htmlFor="entrar-password">Senha</Label>
              <Input
                id="entrar-password"
                type="password"
                autoComplete="current-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-base"
              />
            </div>
            {msg && <p className="text-sm text-destructive">{msg}</p>}
            {info && <p className="text-sm text-foreground">{info}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Aguarde…" : "Entrar no portal"}
            </Button>
          </form>

          <button
            type="button"
            onClick={handleReset}
            disabled={loading}
            className="mt-4 w-full text-sm text-primary underline-offset-4 hover:underline"
          >
            Esqueci minha senha
          </button>

          <Link
            to="/primeiro-acesso"
            className="mt-3 block w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            Primeira vez aqui? Veja o passo a passo e crie seu acesso
          </Link>

          <p className="mt-6 border-t border-border pt-4 text-center text-xs text-muted-foreground">
            É da equipe clínica?{" "}
            <Link
              to="/auth"
              className="text-primary underline-offset-4 hover:underline"
            >
              Acesse o painel do profissional
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
