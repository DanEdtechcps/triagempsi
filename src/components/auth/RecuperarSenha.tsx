import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/lib/password-reset.functions";
import { RESEND_COOLDOWN_SECONDS, maskEmail, resendLabel } from "@/lib/auth-ui";

/**
 * Recuperação de senha como TELA PRÓPRIA (não um link escondido no formulário de
 * login). Dois estados: pedir o e-mail → "e-mail enviado", que FICA na tela até a
 * pessoa agir (reenviar, trocar o e-mail ou voltar ao login). Nada some sozinho.
 */
export function RecuperarSenha({
  initialEmail,
  onBack,
}: {
  initialEmail: string;
  onBack: () => void;
}) {
  const requestReset = useServerFn(requestPasswordReset);
  const [email, setEmail] = useState(initialEmail);
  const [phase, setPhase] = useState<"form" | "sent">("form");
  const [sentTo, setSentTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Leva o foco (e o leitor de tela) ao título da etapa atual.
  useEffect(() => {
    headingRef.current?.focus();
  }, [phase]);

  async function send(to: string) {
    setLoading(true);
    setError(null);
    try {
      await requestReset({ data: { email: to } });
      setSentTo(to);
      setPhase("sent");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setError("Não foi possível enviar agora. Confira o e-mail e tente de novo em instantes.");
    } finally {
      setLoading(false);
    }
  }

  if (phase === "sent") {
    return (
      <div className="mt-6 space-y-5" role="status" aria-live="polite">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MailCheck className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="font-serif text-xl font-semibold text-foreground outline-none"
            >
              Verifique seu e-mail
            </h2>
            <p className="mt-1 text-sm text-foreground/85">
              Se existir uma conta para <strong>{maskEmail(sentTo)}</strong>, enviamos um link para
              criar uma nova senha.
            </p>
          </div>
        </div>

        <ul className="space-y-1.5 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          <li>• Pode levar alguns minutos para chegar.</li>
          <li>
            • Olhe também a caixa de <strong>spam</strong> ou lixo eletrônico.
          </li>
          <li>• O link vale por 60 minutos e só funciona uma vez.</li>
        </ul>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={loading || cooldown > 0}
            onClick={() => void send(sentTo)}
          >
            {loading ? "Enviando…" : resendLabel(cooldown)}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setPhase("form");
              setError(null);
            }}
          >
            Usar outro e-mail
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
            Voltar ao login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void send(email.trim());
      }}
    >
      <div>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="font-serif text-xl font-semibold text-foreground outline-none"
        >
          Recuperar acesso
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Digite o e-mail da sua conta. Enviaremos um link para você criar uma nova senha.
        </p>
      </div>
      <div>
        <Label htmlFor="recuperar-email">E-mail</Label>
        <Input
          id="recuperar-email"
          type="email"
          autoComplete="email"
          required
          autoFocus={!initialEmail}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="text-base"
        />
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Enviando…" : "Enviar link de acesso"}
      </Button>
      <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
        Voltar ao login
      </Button>
    </form>
  );
}
