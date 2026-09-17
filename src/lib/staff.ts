import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type StaffState = {
  /** true enquanto a verificação de papel está em andamento. */
  loading: boolean;
  /** true SOMENTE quando o papel de equipe (médico/admin) foi confirmado. */
  isStaff: boolean;
  /** true quando a verificação falhou (rede, sessão expirada etc.). */
  erro: boolean;
  /** E-mail do usuário logado (quando há sessão). */
  email: string | null;
};

/**
 * Consulta única: o usuário tem papel de equipe (médico/admin)?
 *
 * Falha ABERTA para o lado do paciente: qualquer erro (rede, sessão
 * expirada) retorna false. É seguro porque a direção restritiva — paciente
 * fora do painel — é garantida pelo GuardAreaProfissional e pelas
 * verificações de escopo no servidor, nunca por esta consulta.
 */
export async function checkIsStaff(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .limit(1);
    if (error) {
      console.warn("checkIsStaff: falha ao consultar papel", error.message);
      return false;
    }
    return !!data?.length;
  } catch (e) {
    console.warn("checkIsStaff: erro inesperado", e);
    return false;
  }
}

/**
 * Verifica se o usuário logado pertence à equipe clínica (tem linha em
 * user_roles). Pacientes não têm papel.
 *
 * Superfícies de paciente (portal, primeiro acesso) tratam `isStaff=false`
 * como caminho padrão: esta verificação é consultiva e nunca pode bloquear
 * a navegação do paciente. A fronteira restritiva do painel usa o mesmo
 * hook e permanece fechada: em caso de erro mostra estado de falha com
 * nova tentativa — nunca libera conteúdo profissional por engano.
 */
export function useStaffRole(): StaffState {
  const [state, setState] = useState<StaffState>({
    loading: true,
    isStaff: false,
    erro: false,
    email: null,
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          if (alive) {
            setState({ loading: false, isStaff: false, erro: false, email: null });
          }
          return;
        }
        const { data: roles, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id);
        if (!alive) return;
        if (error) {
          setState({
            loading: false,
            isStaff: false,
            erro: true,
            email: data.user.email ?? null,
          });
          return;
        }
        setState({
          loading: false,
          isStaff: !!roles?.length,
          erro: false,
          email: data.user.email ?? null,
        });
      } catch {
        if (alive) {
          setState({ loading: false, isStaff: false, erro: true, email: null });
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
