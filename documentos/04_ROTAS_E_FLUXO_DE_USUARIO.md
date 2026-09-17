# 04. Mapeamento de Rotas e Fluxos de Usuário

O sistema utiliza o **TanStack Router** com tipagem estática e Server-Side Rendering (SSR). Todas as rotas são mapeadas de forma determinística na pasta `src/routes/`.

---

## 1. Tabela Geral de Rotas

| Rota | Tipo | Permissão | Finalidade |
|---|---|---|---|
| `/` | Pública | Livre | Landing Page institucional do produto SaaS com demonstração e chamada comercial. |
| `/{slug}` | Pública | Livre | Portal de boas-vindas personalizado do consultório (ex: `/padrao`). |
| `/{slug}/triagem` | Pública | Livre | Fluxo completo do questionário clínico pré-consulta daquele consultório. |
| `/auth` | Pública | Livre | Tela de login e cadastro da equipe clínica (médicos e secretárias). |
| `/entrar` | Pública | Livre | Tela de login rápido do paciente para acessar seus resumos. |
| `/primeiro-acesso` | Pública | Livre | Fluxo de ativação de conta do paciente com o e-mail da triagem. |
| `/reset-password` | Pública | Livre | Redefinição de senha com token recebido por e-mail. |
| `/portal` | Autenticada | Paciente | Histórico de avaliações e relatórios liberados para o paciente logado. |
| `/painel` | Autenticada | Médico / Admin | Painel clínico de triagens recebidas com filtros, gravidade e status. |
| `/painel/:id` | Autenticada | Médico / Admin | Prontuário detalhado do caso, escalas respondidas e exportação de PDF. |
| `/admin` | Autenticada | Admin | Gestão de consultórios, médicos, especialidades e convites de equipe. |
| `/comercial` | Autenticada | Admin Global | Visão de faturamento, assinaturas B2B, planos e métricas de MRR. |
| `/auditoria` | Autenticada | Admin Global | Logs completos de acesso a dados de saúde e exportações de relatórios. |
| `/emails` | Autenticada | Admin Global | Fila e logs de disparos transacionais via Resend. |
| `/roadmap` | Autenticada | Admin Global | Backlog de melhorias técnicas e novos instrumentos. |
| `/changelog` | Autenticada | Admin Global | Histórico de versões e deploys lançados. |

---

## 2. Guardas de Acesso e Ciclo de Vida

### Guarda de Rotas Autenticadas (`src/routes/_authenticated/route.tsx`)
Todas as rotas sob `_authenticated/` passam pela validação do token JWT do Supabase no `beforeLoad`:
```ts
beforeLoad: async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw redirect({ to: "/auth" });
  return { user: data.user };
}
```

### Guarda de Equipe Clínica (`src/lib/staff.ts`)
* Ao logar no `/auth`, o sistema consulta se o usuário possui registro ativo na tabela `user_roles`.
* Se tiver registro: redireciona para `/painel`.
* Se não tiver (ou for paciente): redireciona para `/portal`.

### Guarda de Administrador Global (`src/lib/admin-guard.server.ts`)
* Rotas como `/comercial` e `/admin` executam validação no servidor via server function:
* Apenas usuários com `role = 'admin'` e `clinic_id IS NULL` recebem autorização.
* Usuários sem esse nível recebem erro de `AcessoNegado` com status 403.
