import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PainelShell } from "@/components/painel/PainelShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateNewPassword, MIN_PASSWORD_LENGTH } from "@/lib/password";
import { PasswordStrengthMeter } from "@/components/PasswordStrengthMeter";

export const Route = createFileRoute("/_authenticated/senha")({
  head: () => ({
    meta: [
      { title: "Alterar senha — Painel da clínica" },
      {
        name: "description",
        content: "Troque a senha da sua conta de acesso ao painel de pré-triagens da clínica.",
      },
      { property: "og:title", content: "Alterar senha — Painel da clínica" },
      {
        property: "og:description",
        content: "Área restrita da equipe clínica.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TrocarSenhaPage,
});

function TrocarSenhaPage() {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setOk(false);

    const problem = validateNewPassword(password, confirm, current);
    if (problem) {
      setMsg(problem);
      return;
    }

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email;
      if (!email) throw new Error("Sessão expirada. Entre novamente.");

      // Confirma a senha atual antes de permitir a troca.
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: current,
      });
      if (authError) throw new Error("Senha atual incorreta.");

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setOk(true);
      setCurrent("");
      setPassword("");
      setConfirm("");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Não foi possível alterar a senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PainelShell title="Alterar senha">
      <Card className="max-w-md border-border bg-card p-5 sm:p-6">
        <h2 className="font-serif text-lg font-semibold text-foreground">Trocar minha senha</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use esta tela para substituir a senha provisória por uma definitiva.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <Label htmlFor="atual">Senha atual</Label>
            <Input
              id="atual"
              type="password"
              autoComplete="current-password"
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className="text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nova">Nova senha</Label>
            <Input
              id="nova"
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
          {ok && <p className="text-sm text-foreground">Senha alterada com sucesso.</p>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Salvando…" : "Salvar nova senha"}
          </Button>
        </form>
      </Card>
    </PainelShell>
  );
}
