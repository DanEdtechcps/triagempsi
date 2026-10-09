# 04. Mapeamento de Rotas, Componentes e Fluxos de Usuário

> **Plataforma:** TriagemPsi (Multi-Tenant)  
> **Roteador:** TanStack Router v1.170+ (Type-Safe SSR)  
> **Versão da Arquitetura:** v1.30.0

---

## 1. Tabela Geral de Rotas da Aplicação

| Rota | Layout / Tipo | Permissão | Finalidade e Principais Componentes |
|---|---|---|---|
| `/` | Pública | Livre | Landing Page institucional luxury com apresentação técnica e chamada de contato. |
| `/saraiva` | Pública | Livre | Acolhimento institucional da **Saraiva Clínica de Psiquiatria**. (O alias `/padrao` era na verdade uma clínica duplicada com id próprio — mesclada e removida em 2026-09-21.) |
| `/saraiva/triagem` | Pública | Livre | Jornada adaptativa completa de pré-triagem psiquiátrica do Dr. Saraiva. |
| `/lumina` | Pública | Livre | Acolhimento institucional do **Instituto Lumina de Saúde Mental & Neurociências** (Dr. Gustavo Mello, admin; Dra. Camila Nogueira, doctor). Slug corrigido em 2026-09-21 (estava `lumina-saude` no banco, causando 404 nesta rota). |
| `/lumina/triagem` | Pública | Livre | Jornada adaptativa parametrizada para o Instituto Lumina. |
| `/auth` | Pública | Livre | Login restrito de médicos, staff e administradores via e-mail e senha. |
| `/entrar` | Pública | Livre | Acesso rápido do paciente por e-mail para consultar suas triagens. |
| `/primeiro-acesso` | Pública | Livre | Ativação da conta do paciente vinculada ao e-mail informado na triagem. |
| `/reset-password` | Pública | Livre | Recuperação segura de senha de acesso com token temporário. |
| `/portal` | Autenticada | Paciente | Portal do Paciente: biblioteca de psicoeducação filtrável, histórico e Plano de Segurança. |
| `/painel` | Autenticada | Médico / Admin | Painel Clínico: tabela de triagens, filtros de risco, badges e **TenantSwitcher** (Super Admin). |
| `/painel/$id` | Autenticada | Médico / Admin | Prontuário detalhado: escores das 28 escalas, **TelemetryCard** (Dwell-Time), **PsychoeducationTracker**, Decision Support e exportação em PDF. |
| `/materiais` | Autenticada | Médico / Admin | **Cockpit de Psicoeducação**: biblioteca clínica com busca em tempo real, filtros por categoria/tags, modal de leitura Markdown, impressão em PDF, cópia para WhatsApp e protocolos rápidos (C-SSRS, Prontuário, NR-01). |
| `/revisao/estudio#t=<token>` | Pública, por **link pessoal** (`noindex`) | Avaliadores convidados (médico curador = decisor; sócios = avaliadores) | **Estúdio de validação**: veem, comparam e opinam sobre vídeos, frases ligadas à obra, escalas, marca e pendências; resposta salva por avaliador, **cego até responder**; o decisor grava a **decisão final** com justificativa e exporta a ata. Sem conta no sistema e sem acesso a dados de pacientes. Links criados com `scripts/review-reviewer.ts`; catálogo carregado com `scripts/seed-review-catalog.ts` (conteúdo só em disco). |
| `/admin` | Autenticada | Admin | Gestão de consultórios, profissionais cadastrados e convites de equipe. |
| `/comercial` | Autenticada | Admin Global | Gestão de planos multi-clínica, limites de triagens e faturamento. |
| `/auditoria` | Autenticada | Admin Global | Trilha completa de auditoria LGPD (leitura de prontuários e exportações de relatórios). |
| `/emails` | Autenticada | Admin Global | Fila e logs de disparos transacionais via Resend. |
| `/roadmap` | Autenticada | Admin Global | Backlog executivo de melhorias técnicas e novos instrumentos psicométricos. |
| `/changelog` | Autenticada | Admin Global | Histórico formal de versões, tags e deploys lançados. |

---

## 2. Fluxos Clínicos Detalhados

### 2.1 Jornada do Paciente na Triagem Adaptativa (`/:slug/triagem`)
1. **Acolhimento Institucional:** O paciente visualiza a mensagem humanizada do médico responsável, explicando que o questionário não é um teste nem substitui o julgamento clínico, mas serve para transformar a primeira consulta presencial em um diálogo focado.
2. **Consentimento LGPD:** Checkbox obrigatório aceitando o tratamento estrito de dados sob sigilo médico.
3. **Identificação e Queixas:** Nome, idade, WhatsApp, sexo biológico (utilizado para travas biológicas estritas como EPDS) e seleção das queixas iniciais.
4. **Rastreio Rápido Inicial:** PHQ-2 e GAD-2 avaliam sintomas basais. Se positivos, disparam automaticamente PHQ-9 e GAD-7 completos via DAG.
5. **Ramificação Adaptativa Especializada:** Conforme as queixas e pontuações, instrumentos específicos são acionados (MDQ, ISI, ASRS-18, AUDIT, PCL-5, MBI-HSS, etc.).
6. **Proteção Prioritária (Via de Crise):** Diante de ideação suicida (PHQ-9 item 9 ≥ 1 ou C-SSRS), surge o banner acolhedor com botões diretos de discagem para o **CVV 188** e **SAMU 192**, além de exercícios de aterramento.
7. **Conclusão e Psicoeducação:** O paciente recebe orientações imediatas de autocuidado, técnicas de descompressão e opção de download do PDF do Paciente (versão `v1 · 2026.1`, sem termos diagnósticos conclusivos).

### 2.2 O Cockpit de Psicoeducação (`/materiais`)
Projetado como um centro de prescrição e consulta rápida para o psiquiatra e sua equipe:
- **Busca em Tempo Real e Filtros de Categoria:** Filtragem ágil por temas clínicos (*Humor, Ansiedade, Crise, Sono, Neurodesenvolvimento, Substâncias, Trauma, Ocupacional, Longevidade*).
- **Pré-Visualização em Modal Completo:** Renderização do guia em Markdown detalhado, com técnicas práticas de TCC e exercícios de autorregulação.
- **Cópia Instantânea para WhatsApp:** Formatação limpa com emojis e quebras de linha prontas para envio ao paciente ou seus familiares com 1 clique.
- **Impressão e PDF Customizado:** Layout limpo e profissional pronto para impressão ou geração de PDF institucional.
- **Protocolos Técnicos Rápidos:**
  - *Protocolo Columbia (C-SSRS):* Roteiro de triagem de gravidade suicida.
  - *Modelo de Prontuário Psiquiátrico:* Estrutura completa de anamnese e exame do estado mental.
  - *Protocolo Ocupacional NR-01 / Burnout:* Diretrizes para laudos de saúde mental ocupacional.

### 2.3 Fluxo do Médico no Prontuário (`/painel/$id`)
1. **Cabeçalho Clínico:** Identificação do paciente, idade, tempo decorrido e status da avaliação.
2. **Cards de Apoio à Decisão (Decision Support):** Destaque visual em amarelo/vermelho com alertas clínicos (ex: cautela com antidepressivos no espectro bipolar; introdução de TCC-I).
3. **Card de Telemetria Comportamental (`TelemetryCard`):**
   - Apresenta o tempo total de preenchimento, média vs. mediana por item.
   - Sinaliza se houve **Hesitação Focal** em perguntas de risco crítico, permitindo ao médico explorar o ponto durante a consulta presencial.
4. **Rastreador de Psicoeducação (`PsychoeducationTracker`):**
   - Exibe a porcentagem de leitura dos materiais pelo paciente no Portal (*"2 de 3 lidos — 67%"*).
   - Permite a prescrição manual de novos temas complementares com 1 clique.
5. **Escores Detalhados:** Tabela expansível com os 28 instrumentos, pontuação bruta, corte psicométrico e respostas item a item.
6. **Exportação de Relatórios:** Geração do PDF Clínico Completo para arquivamento ou encaminhamento multiprofissional.

---

## 3. Gestão Multi-Tenant e Alternância de Contexto

### O Componente `TenantSwitcher`
Localizado na barra de navegação superior (`PainelShell.tsx`):
- **Visibilidade:** Exclusiva para usuários com papel de Superadministrador Global (`role === 'admin'` e `clinic_id === null`), como `coletivoaruatemvoz@gmail.com`.
- **Modos de Operação:**
  - *Visão Global / Todas as Clínicas:* Lista triagens de todas as unidades federadas para auditoria técnica.
  - *Saraiva Clínica de Psiquiatria:* Filtra exclusivamente os pacientes e métricas do Dr. Saraiva.
  - *Instituto Lumina de Saúde Mental:* Filtra exclusivamente os atendimentos de Dr. Gustavo Mello / Dra. Camila Nogueira.
- **Persistência Reativa:** Gerenciada pelo [`TenantContext.tsx`](file:///mnt/armazenamento/Projetos/triagem-medica/src/context/TenantContext.tsx) via React Context, atualizando instantaneamente as listagens sem recarregar a página.

---

## 4. Ciclo de Vida e Guardas de Autenticação

### Guarda de Rotas Autenticadas (`src/routes/_authenticated/route.tsx`)
```ts
beforeLoad: async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw redirect({ to: "/auth" });
  }
  return { user: data.user };
}
```

### Redirecionamento Baseado em Papel (`src/lib/staff.ts`)
* Usuário com registro ativo em `user_roles` (`admin`, `doctor`, `staff`) ➔ Redireciona para `/painel`.
* Usuário sem registro em `user_roles` (Paciente) ➔ Redireciona para `/portal`.

## Estúdio de validação: como evoluir sem sofrer

**Estrutura.** O Estúdio reúne **quatro projetos** (Psiqway, Caminhos, Corte 800, Médico de Família) e um grupo "Geral" (escalas e pendências da plataforma). Cada projeto é um produto com público e regras próprios: os materiais de um **não são alternativas** aos de outro. Por isso o catálogo tem **um item por tipo e por projeto** e **um item de identidade por projeto** (`ref` `identidade-<projeto>`, tipo `marca`), com "para quem", "o projeto é" e "o projeto não é". Os decisores confirmam ou ajustam a identidade no próprio Estúdio; cada material é avaliado contra ela. A tela tem um seletor de projeto; "Todos os projetos" mostra um cartão por projeto, com público e andamento.

**Onde editar cada coisa (um lugar só para cada)**
| O que mudar | Onde | Precisa de deploy? |
|---|---|---|
| Qualquer texto que explica a tela (passos, botões, ajuda de cada aba, regras de decisão, resultados) | `src/lib/review-textos.ts` | Sim |
| Rótulos curtos de abas e botões | `src/lib/review-studio.ts` (`KIND_LABEL`, `DECISION_LABEL`) | Sim |
| Identidade de um projeto (para quem, é, não é) | `IDENTIDADES` em `_ferramentas/gerar_catalogo_materiais.py` (pasta de conteúdo, fora do git), depois `seed-review-catalog.ts --apply` | **Não** |
| Materiais (infográfico, quiz etc.) de um projeto | mesmo gerador, a partir de `_notebooklm/piloto_bipolar__<projeto>/` | Não |
Um teste (`review-projetos.test.ts`) falha se um tipo de item ou botão novo ficar sem texto de ajuda, apontando o que escrever.

**Decidir sem reunião.** Cada pessoa responde quando puder. O decisor vê "Resultados" no Resumo (quem participou, onde há divergência, quantos itens esperam decisão) e, na aba Decidir, o bloco **"Consenso"**: itens em que todos os que votaram (mínimo 2) aprovaram ou escolheram a mesma opção entram numa **aprovação em lote**, com confirmação. Ajuste, rejeição, divergência ou poucos votos ficam para o decisor ler os motivos e decidir com justificativa. Com mais de um decisor, vale a última decisão e o histórico fica guardado.

**Próximos passos possíveis (cada um é uma escolha dos decisores, não só técnica)**
1. **Rodada com prazo**: data limite por rodada; passado o prazo, o que ninguém objetou segue ("silêncio é consentimento"). Exige tabela de rodadas.
2. **Dono por tema**: um decisor responsável por tipo ou projeto, para não haver dois decidindo o mesmo item. Hoje vale a última decisão.
3. **Fio de comentários por item** para divergências, no lugar de um comentário por pessoa.
4. **Aviso por e-mail** quando um item fica pronto para decisão.

**Teste de ponta a ponta.** `e2e/estudio-validacao.spec.ts` roda contra um ambiente real com um link de decisor, confere o que foi gravado no banco e apaga só o que criou (inclusive um avaliador temporário usado no teste de lote). Comando e variáveis estão no cabeçalho do arquivo. Pula sozinho sem credenciais e não sobrescreve resposta real.
