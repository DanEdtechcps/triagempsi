# 04. Mapeamento de Rotas e Fluxos de Usuário — Saraiva Clínica de Psiquiatria

O sistema utiliza o **TanStack Router** com tipagem estática ponta a ponta e Server-Side Rendering (SSR). Todas as rotas são mapeadas de forma determinística na pasta `src/routes/`.

---

## 1. Tabela Geral de Rotas

| Rota | Tipo | Permissão | Finalidade |
|---|---|---|---|
| `/` | Pública | Livre | Landing Page institucional com apresentação técnica e chamada de contato. |
| `/saraiva` | Pública | Livre | Portal de acolhimento oficial da **Saraiva Clínica de Psiquiatria** (alias: `/padrao`). |
| `/saraiva/triagem` | Pública | Livre | Fluxo adaptativo completo de pré-avaliação psiquiátrica do Dr. Saraiva. |
| `/auth` | Pública | Livre | Acesso restrito do Dr. Saraiva, médicos e equipe clínica. |
| `/entrar` | Pública | Livre | Acesso rápido do paciente para consultar suas triagens e orientações. |
| `/primeiro-acesso` | Pública | Livre | Ativação de conta do paciente utilizando o e-mail informado na triagem. |
| `/reset-password` | Pública | Livre | Recuperação segura de senha com token temporário. |
| `/portal` | Autenticada | Paciente | Biblioteca filtrável de psicoeducação, histórico de triagens e Plano de Segurança. |
| `/painel` | Autenticada | Médico / Admin | Painel clínico do Dr. Saraiva com filtros, classificação de risco e status de atendimento. |
| `/painel/:id` | Autenticada | Médico / Admin | Prontuário detalhado com Decision Support, métricas de leitura, liberação de temas e PDF clínico. |
| `/admin` | Autenticada | Admin | Gestão de consultórios, profissionais, especialidades e convites de equipe. |
| `/comercial` | Autenticada | Admin Global | Gestão de assinaturas, planos corporativos e métricas operacionais. |
| `/auditoria` | Autenticada | Admin Global | Trilha completa de auditoria LGPD (leitura de prontuários e exportações de relatórios). |
| `/emails` | Autenticada | Admin Global | Fila e logs de disparos transacionais via Resend. |
| `/roadmap` | Autenticada | Admin Global | Backlog de melhorias técnicas e novos instrumentos psicométricos. |
| `/changelog` | Autenticada | Admin Global | Histórico formal de versões e deploys lançados. |

---

## 2. Fluxos Clínicos Detalhados

### 2.1 Jornada do Paciente na Saraiva Clínica de Psiquiatria (`/saraiva/triagem`)
1. **Acolhimento Institucional:** O paciente é recebido com a mensagem humanizada do Dr. Saraiva explicando que o questionário não é um teste punitivo nem emite diagnóstico automático, mas serve para otimizar o tempo presencial.
2. **Consentimento LGPD:** Checkbox obrigatório autorizando o tratamento estrito de dados sob sigilo médico.
3. **Identificação e Queixa:** Nome, idade, WhatsApp e queixa principal em texto livre.
4. **Rastreio Adaptativo Rápido:** PHQ-2 e GAD-2 iniciam a avaliação. Se positivos, desdobram em PHQ-9 e GAD-7 completos.
5. **Ramificação Especializada:** Se houver alterações de humor, sono, atenção ou substâncias, o motor aciona os instrumentos correspondentes (MDQ, ISI, ASRS-18, AUDIT, PCL-5, MBI-HSS).
6. **Proteção Prioritária (Via de Crise):** Se o item 9 do PHQ-9 for positivo ou houver ideação no C-SSRS, é exibido imediatamente o banner de proteção com canais gratuitos 24h (**CVV 188** e **SAMU 192**).
7. **Conclusão e Psicoeducação:** Exibição dos cards educativos, plano de descompressão e disponibilização do PDF do Paciente (sem termos estigmatizantes e com versão `v1 · 2026.1`).

### 2.2 Fluxo do Psiquiatra no Painel Clínico (`/painel/:id`)
1. **Visão Geral e Escores:** Escore total, bandas de severidade e itens respondidos de cada uma das 28 escalas.
2. **Apoio à Decisão Clínica (Decision Support):** Cards com prioridade (`Urgente`, `Alerta`, `Orientativo`) sugerindo condutas orientativas (ex: TCC-I concomitante ao manejo depressivo; alerta de virada maníaca no espectro bipolar; intervenção breve no modelo FRAMES).
3. **Métricas de Engajamento de Psicoeducação:** Indicador em tempo real (*"X de Y materiais lidos pelo paciente — Z%"*) e data/hora do último acesso no Portal.
4. **Prescrição de Material Complementar:** Botão para liberar manualmente temas de psicoeducação para o paciente.
5. **Exportação de Prontuário:** Geração em 1 clique do PDF Clínico completo ou PDF do Paciente.

---

## 3. Guardas de Acesso e Ciclo de Vida

### Guarda de Rotas Autenticadas (`src/routes/_authenticated/route.tsx`)
```ts
beforeLoad: async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw redirect({ to: "/auth" });
  return { user: data.user };
}
```

### Redirecionamento por Papel (`src/lib/staff.ts`)
* Médico ou Admin com registro ativo em `user_roles` ➔ Redireciona para `/painel`.
* Paciente autenticado ➔ Redireciona para `/portal`.

### Guarda de Administrador Global (`src/lib/admin-guard.server.ts`)
* Valida no servidor se `role === 'admin'` e `clinic_id IS NULL`.
* Impede qualquer acesso indevido com erro 403 (`AcessoNegado`).
