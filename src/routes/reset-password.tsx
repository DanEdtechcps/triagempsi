import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateNewPassword, MIN_PASSWORD_LENGTH } from "@/lib/password";
import { PasswordStrengthMeter } from "@/components/PasswordStrengthMeter";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Definir nova senha — Acesso do profissional" },
      {
        name: "description",
        content: "Defina uma nova senha para acessar o painel de pré-triagens da clínica.",
      },
      { property: "og:title", content: "Definir nova senha" },
      { property: "og:description", content: "Área restrita da equipe clínica." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

type LinkProblem = { title: string; detail: string } | null;

function readLinkError(): LinkProblem {
  if (typeof window === "undefined") return null;
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  const code = hash.get("error_code") ?? query.get("error_code");
  const error = hash.get("error") ?? query.get("error");
  if (!code && !error) return null;

  if (code === "otp_expired") {
    return {
      title: "Este link de redefinição expirou.",
      detail:
        "Por segurança, o link vale por tempo limitado e só pode ser usado uma vez. Peça um novo e-mail abaixo.",
    };
  }
  return {
    title: "Link inválido ou já utilizado.",
    detail: "Cada link de redefinição funciona apenas uma vez. Solicite um novo e-mail abaixo.",
  };
}

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [linkError, setLinkError] = useState<LinkProblem>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const problem = readLinkError();
    if (problem) {
      setLinkError(problem);
      setReady(true);
      return;
    }
    // Após o link de recuperação, o Supabase cria a sessão a partir do hash da URL.
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setHasSession(Boolean(session));
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const problem = validateNewPassword(password, confirm);
    if (problem) {
      setMsg(problem);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setOk(true);
      // Equipe vai ao painel; paciente vai ao portal.
      const { data: roles } = await supabase.from("user_roles").select("id").limit(1);
      const destino = roles && roles.length > 0 ? "/painel" : "/portal";
      setTimeout(() => navigate({ to: destino, replace: true }), 1500);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      const expired =
        /expired|invalid|not found|session/i.test(raw) && !/8 characters|weak/i.test(raw);
      setMsg(
        expired
          ? "Este link expirou ou já foi usado. Solicite um novo e-mail de redefinição."
          : raw || "Não foi possível alterar a senha.",
      );
      if (expired) {
        setHasSession(false);
        setLinkError({
          title: "Este link expirou ou já foi usado.",
          detail: "Solicite um novo e-mail de redefinição abaixo.",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setResendMsg(null);
    setResending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resendEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResendMsg(
        "Se este e-mail estiver cadastrado, um novo link foi enviado. Ele vale por 1 hora e pode ser usado uma única vez.",
      );
    } catch {
      setResendMsg("Não foi possível enviar agora. Tente novamente em instantes.");
    } finally {
      setResending(false);
    }
  }

  const blocked = ready && (Boolean(linkError) || !hasSession);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md border-border bg-card p-6 sm:p-8">
        <h1 className="font-serif text-2xl font-semibold text-foreground">Definir nova senha</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          TriagemPsi — escolha uma senha com pelo menos 8 caracteres.
        </p>

        {!ready && <p className="mt-6 text-sm text-muted-foreground">Verificando o link…</p>}

        {blocked && !ok && (
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
              <p className="text-sm font-medium text-destructive">
                {linkError?.title ?? "Link inválido ou expirado."}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {linkError?.detail ??
                  "Cada link de redefinição vale por 1 hora e só pode ser usado uma vez. Peça um novo e-mail abaixo."}
              </p>
            </div>

            <form onSubmit={handleResend} className="space-y-3">
              <div>
                <Label htmlFor="reenviar-email">Seu e-mail</Label>
                <Input
                  id="reenviar-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="text-base"
                />
              </div>
              {resendMsg && <p className="text-sm text-muted-foreground">{resendMsg}</p>}
              <Button type="submit" disabled={resending} className="w-full">
                {resending ? "Enviando…" : "Enviar novo link"}
              </Button>
            </form>

            <Link to="/entrar" className="block">
              <Button variant="outline" className="w-full">
                Voltar ao acesso
              </Button>
            </Link>
          </div>
        )}

        {ready && hasSession && !linkError && !ok && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="senha">Nova senha</Label>
              <Input
                id="senha"
                type="password"
                autoComplete="new-password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                maxLength={72}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-base"
              />
              <PasswordStrengthMeter value={password} />
            </div>
            <div>
              <Label htmlFor="confirmar">Confirmar nova senha</Label>
              <Input
                id="confirmar"
                type="password"
                autoComplete="new-password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                maxLength={72}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="text-base"
              />
              {confirm && confirm !== password && (
                <p className="mt-1 text-xs text-destructive">As senhas não coincidem.</p>
              )}
            </div>

            {msg && <p className="text-sm text-destructive">{msg}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Salvando…" : "Salvar nova senha"}
            </Button>
          </form>
        )}

        {ok && (
          <p className="mt-6 text-sm text-foreground">
            Senha alterada com sucesso. Redirecionando…
          </p>
        )}
      </Card>
    </div>
  );
}
