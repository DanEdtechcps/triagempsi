import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, Stethoscope, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStaffRole } from "@/lib/staff";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Guarda de fronteira do painel: só a equipe clínica (user_roles) enxerga as
 * telas profissionais. Um paciente logado que chegar a qualquer rota do painel
 * vê uma orientação clara e um caminho de volta ao Portal do Paciente.
 *
 * Falha FECHADA: se a verificação de papel falhar, o conteúdo profissional
 * não é exibido — mostra-se um estado de erro com nova tentativa.
 *
 * Aplicado dentro do PainelShell — protege todas as páginas _authenticated
 * em um único ponto.
 */
export function GuardAreaProfissional({ children }: { children: ReactNode }) {
  const { loading, isStaff, erro, email } = useStaffRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Verificando seu perfil de acesso…
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md p-6 text-center sm:p-8">
          <h1 className="font-serif text-xl font-semibold text-foreground">
            Não foi possível confirmar seu acesso
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Houve uma falha de conexão ao verificar seu perfil. Confira sua internet e tente
            novamente — seus dados continuam protegidos.
          </p>
          <div className="mt-6 grid gap-2">
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
            <Button variant="ghost" onClick={sair}>
              Sair da conta
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md p-6 text-center sm:p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Stethoscope className="h-6 w-6 text-primary" />
          </div>
          <h1 className="mt-4 font-serif text-xl font-semibold text-foreground">
            Área exclusiva da equipe clínica
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Você entrou com <strong>{email ?? "uma conta"}</strong>, que é uma conta de{" "}
            <strong>paciente</strong>. As telas de triagens, auditoria e administração são restritas
            a médicos e administradores da clínica.
          </p>
          <div className="mt-6 grid gap-2">
            <Button asChild>
              <Link to="/portal">
                <UserRound className="mr-2 h-4 w-4" />
                Ir para o Portal do Paciente
              </Link>
            </Button>
            <Button variant="ghost" onClick={sair}>
              Sair da conta
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            É profissional e está vendo esta mensagem? Peça ao administrador da clínica para liberar
            seu acesso à equipe.
          </p>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
