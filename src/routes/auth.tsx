import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkIsStaff } from "@/lib/staff";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acesso do profissional — Pré-triagem em saúde mental" },
      {
        name: "description",
        content:
          "Área restrita da equipe clínica para consultar as pré-triagens recebidas antes da consulta.",
      },
      { property: "og:title", content: "Acesso do profissional — Pré-triagem" },
      {
        property: "og:description",
        content: "Área restrita da equipe clínica.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      // Fronteira por papel: equipe clínica vai ao painel; paciente, ao portal.
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
      if (mode === "entrar") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Paciente nunca aterrissa no painel: vai direto ao Portal do Paciente.
        const staff = data.user ? await checkIsStaff(data.user.id) : false;
        navigate({ to: staff ? "/painel" : "/portal", replace: true });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/painel" },
        });
        if (error) throw error;
        setMsg(
          "Conta criada. Um administrador precisa liberar seu acesso à clínica antes de você ver as triagens.",
        );
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Não foi possível continuar.");
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
      setInfo("Enviamos um link de redefinição para o seu e-mail. Abra-o para criar a nova senha.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Não foi possível enviar o link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md border-border bg-card p-6 sm:p-8">
        <h1 className="font-serif text-2xl font-semibold text-foreground">
          Acesso do profissional
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          TriagemPsi — área restrita da equipe clínica.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-base"
            />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "entrar" ? "current-password" : "new-password"}
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
            {loading ? "Aguarde…" : mode === "entrar" ? "Entrar" : "Criar conta"}
          </Button>
        </form>

        {mode === "entrar" && (
          <button
            type="button"
            onClick={handleReset}
            disabled={loading}
            className="mt-4 w-full text-sm text-primary underline-offset-4 hover:underline"
          >
            Esqueci minha senha / trocar senha provisória
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            setMode(mode === "entrar" ? "criar" : "entrar");
            setMsg(null);
            setInfo(null);
          }}
          className="mt-3 w-full text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "entrar" ? "Não tem conta? Criar acesso" : "Já tem conta? Entrar"}
        </button>

        {/* Antes de autenticar não há como saber a clínica do usuário (só
        resolvida via user_roles após o login) — "início" aqui é a landing
        da plataforma, não a triagem pública de uma clínica específica. */}
        <Link
          to="/"
          className="mt-6 block text-center text-xs text-muted-foreground hover:text-foreground"
        >
          Voltar ao início
        </Link>
      </Card>
    </div>
  );
}
