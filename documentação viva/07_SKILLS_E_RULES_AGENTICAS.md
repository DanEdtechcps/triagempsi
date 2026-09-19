# 07. Skills, Rules e Governança Agêntica — Saraiva Clínica de Psiquiatria

Este documento reúne todas as **Regras de Ouro**, **Instruções de Agente**, **Políticas de Governança de Código** e **Diretrizes Ético-Clínicas** aplicadas no desenvolvimento e manutenção contínua desta plataforma. Qualquer agente autônomo, CLI ou modelo de linguagem operando neste repositório deve seguir rigorosamente estes preceitos.

---

## 1. Identidade Ético-Clínica (Dr. José Ribamar Fernandes Saraiva Junior)

O sistema deve sempre refletir a autoridade humanizada e integrativa do Dr. Saraiva (CRM-RS 29349 · RQE 30038):

1. **Tom de Voz da Marca:**
   - **Acolhedor e Claro:** Herança direta da Medicina de Família e Comunidade.
   - **Técnico sem ser frio:** Vocabulário médico fundamentado em evidências, mas acessível ao público leigo.
   - **Educativo e Orientativo:** Promove a psicoeducação ativa em vez de rotulações precipitadas.
   - **Sem Sensacionalismo:** NUNCA utilizar termos como *"cura definitiva"*, *"solução mágica"* ou abordagens de marketing predatório.
   - **Respeitoso com o Sofrimento:** Reconhece a vulnerabilidade psíquica com dignidade.

2. **Diretriz de Segurança Inviolável (Protocolo de Crise):**
   - Diante de qualquer sinal de risco (PHQ-9 item 9 ≥ 1, C-SSRS positivo ou RISK-COMPOSITE), a prioridade do agente/sistema deve ser a ativação imediata do **Plano de Segurança Estruturado** com os canais gratuitos 24h: **CVV 188** e **SAMU 192**.

3. **Padrão Cromático Oficial:**
   - Primary: `#1e4d5c` (Azul-petróleo sóbrio e confiável)
   - Accent: `#3d8b8b` (Verde-azulado suave)
   - Neutros: Tons de cinza quente e off-white para legibilidade confortável.

---

## 2. Regras Fundamentais do Usuário (Daniel Arraes Reino)

### Regra de Ouro: Links de Arquivos Clicáveis
- **SEMPRE** que um arquivo relevante for criado, editado ou referenciado na conversa ou relatório, o agente **DEVE** fornecer um link markdown clicável direto utilizando o esquema `file://`.
- **Formato Mandatório:** `[Nome do Arquivo](file:///caminho/absoluto/do/arquivo)` ou com linhas `[Nome](file:///caminho#L10-L25)`.
- **Justificativa:** Elimina o atrito cognitivo de navegação e permite auditoria instantânea por qualquer ferramenta ou IDE integrada.

### Comunicação Direta e Sem Enrolação ("Macarrão Carbonara")
- Respostas orientadas à solução:
  - Sem introduções genéricas ou rodeios desnecessários.
  - Resultados diretos, testes executados e status objetivo de cada entrega.

---

## 3. Regras de Preservação e Integração Lovable

```markdown
<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> Este projeto possui sincronização com a plataforma Lovable.
> NUNCA reescreva o histórico git publicado (evite expressamente git push --force, rebase ou squash de commits que já foram enviados para o repositório remoto).
> Forçar commits destrói o histórico de versões no editor visual do Lovable.
> Mantenha a branch main sempre em estado compilável e funcional (verde).
<!-- LOVABLE:END -->
```

---

## 4. Diretrizes de Segurança e Proteção de Segredos

### Regra Anti-Exposição (GitHub Push Protection)
- Chaves privadas como `SUPABASE_SERVICE_ROLE_KEY` **JAMAIS** devem ser gravadas em arquivos rastreados pelo Git (`wrangler.json`, `config.ts`, etc.).
- O GitHub bloqueia commits com push protection (GH013).
- **Padrão Obrigatório:**
  - Chaves públicas anon (`sb_publishable_...`) residem no `.env.production` e variáveis públicas do `wrangler.json`.
  - Service Role Key deve ser injetada via Secret Manager do Cloudflare (`bun x wrangler secret put SUPABASE_SERVICE_ROLE_KEY`).

### Triplo Fallback de Inicialização do Supabase Client
No bundle estático gerado por Vite, o código do cliente não deve assumir que variáveis de ambiente sempre estarão povoadas em tempo de execução:
1. `import.meta.env.VITE_SUPABASE_URL`
2. `process.env.SUPABASE_URL` || `process.env.VITE_SUPABASE_URL`
3. Constante canônica da instância de produção (`https://ffyjjkouscnabyxjxexu.supabase.co`).

---

## 5. Skills e Boas Práticas do Banco de Dados (Supabase / Postgres)

### Modelagem e RLS (Row Level Security)
- **RLS Ativo:** Toda tabela nova deve conter obrigatoriamente `ALTER TABLE public.<nome> ENABLE ROW LEVEL SECURITY;`.
- **Padrão de Papéis Unificado:**
  - `role = 'admin'` + `clinic_id IS NULL` = Admin Global (acesso total).
  - `role = 'admin'` + `clinic_id` preenchido = Admin da clínica.
  - `role = 'doctor'` e `'staff'` vinculados à clínica.
- **Tipagem Estrita:** Uso de `TIMESTAMPTZ` para todos os campos temporais e `UUID` para chaves primárias.

### Prevenção de Inatividade (Keepalive)
- Instâncias gratuitas do Supabase entram em pausa após inatividade prolongada.
- **Solução Padronizada:** Tabela técnica `_keepalive` atualizada via script SQL (`supabase/keepalive.sql`) e via GitHub Actions semanal/diário.

---

## 6. Skills de Engenharia Frontend e UX Clínica

### Arquitetura de Componentes
- Stack: **TanStack Start + React 19 + TypeScript + Tailwind CSS v4 + Radix UI / Lucide**.
- Isolamento do motor de cálculo: funções puras em `src/lib/scoring.ts`, `src/lib/safety-plan.ts` e `src/lib/clinical-decision-support.ts` sem dependência de UI.
- Feedback imediato: Loading skeletons em transições de rota e toast notifications amigáveis.

### Validação e Testes Contínuos (TDD Gate)
- Toda alteração nas regras de pontuação de escalas (PHQ-9, GAD-7, C-SSRS, CRAFFT, ASRS-18) e psicoeducação deve ser acompanhada por testes unitários com **Vitest**.
- O build deve ser verificado com `bun x tsc --noEmit` antes de qualquer commit.

---

---

## 7. Skill de Qualidade de Interface (UI Quality Baseline) e Checklist Vivo

A interface do TriagemPsi é governada permanentemente pela skill corporativa instalada em:
- [`.agents/skills/ui-quality-baseline/SKILL.md`](file:///mnt/armazenamento/Projetos/triagem-medica/.agents/skills/ui-quality-baseline/SKILL.md)
- Volume oficial de governança: [`documentação viva/09_CHECKLIST_VIVO_UI_QUALITY.md`](file:///mnt/armazenamento/Projetos/triagem-medica/documentação%20viva/09_CHECKLIST_VIVO_UI_QUALITY.md)

### Os 5 Pilares Obrigatórios:
1. **Layout & Responsividade:** Mobile-First (≤480px), zero overflow-x, touch targets ≥ 44-48px.
2. **Tipografia & Hierarquia:** Contraste WCAG 2.2 AA (≥ 4.5:1), inputs mobile ≥ 16px (evita auto-zoom iOS).
3. **Estados de Interface:** Loading (Skeletons), Empty State acolhedor, Error State com retry, Disabled State com prevenção de double-click.
4. **Acessibilidade (a11y):** Foco visível (`focus-visible:ring-2`), `<Label htmlFor>` em todo input, navegação completa por teclado.
5. **Feedback Visual:** Toasts imediatos, mensagens claras de erro acionável.

---

## 8. Política de Execução Anti-Freeze (Playwright & E2E)

Devido às características de GPU em ambiente Linux/Wayland (Intel Iris Xe / `i915`), testes E2E nunca devem saturar buffers gráficos simultâneos:
- **Regra:** Testes do Playwright DEVEM ser executados obrigatoriamente com `--workers=1` e sem concorrência paralela (`fullyParallel: false`).
- **Comando padrão:** `npx playwright test --workers=1`
- O arquivo [`playwright.config.ts`](file:///mnt/armazenamento/Projetos/triagem-medica/playwright.config.ts) já está protegido com essa configuração por padrão.

---

## 9. Governança para Próximos Agentes de IA

Ao ser inicializado para trabalhar neste projeto:
1. **Consulte a pasta `documentação viva/`** antes de propor mudanças arquiteturais.
2. **Consulte o Checklist Vivo em [`09_CHECKLIST_VIVO_UI_QUALITY.md`](file:///mnt/armazenamento/Projetos/triagem-medica/documentação%20viva/09_CHECKLIST_VIVO_UI_QUALITY.md)** antes de finalizar qualquer tela ou componente.
3. **Execute os testes (`bun run test`)** para garantir que o ambiente está íntegro (**137 testes passando**).
4. **Mantenha os arquivos da pasta `documentação viva/` atualizados** sempre que novas tabelas, rotas ou fluxos clínicos forem adicionados.
5. **Respeite o formato de saída do usuário Daniel**, mantendo links de arquivo clicáveis (`file:///...`) e foco cirúrgico na execução.

