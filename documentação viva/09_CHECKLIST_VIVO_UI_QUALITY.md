# 09. Checklist Vivo de Qualidade de Interface (UI Quality Baseline) — TriagemPsi

Este documento estabelece o **Checklist Vivo e Permanente** de qualidade de interface para o TriagemPsi (Saraiva Clínica de Psiquiatria), derivado da skill corporativa **`ui-quality-baseline`** instalada em [.agents/skills/ui-quality-baseline/SKILL.md](file:///mnt/armazenamento/Projetos/triagem-medica/.agents/skills/ui-quality-baseline/SKILL.md).

> [!IMPORTANT]
> **Regra de Ouro da Interface:** Nenhuma tela, fluxo ou componente interativo pode ser considerado concluído ("done") sem passar integralmente por todos os itens deste checklist. As diretrizes são stack-agnósticas e devem ser cumpridas tanto em ambiente móvel quanto em desktop.

---

## 1. Os 5 Pilares Não Negociáveis do Baseline

```mermaid
flowchart TD
    subgraph P1["1. Layout & Responsividade"]
        A1["Mobile-First (<=480px)"]
        A2["Zero Scroll Horizontal"]
        A3["Touch Targets >= 44-48px"]
        A4["Sem dependência de Hover"]
    end

    subgraph P2["2. Tipografia & Hierarquia"]
        B1["Hierarquia Visual Evidente"]
        B2["Contraste WCAG 2.2 AA (>= 4.5:1)"]
        B3["Fontes Mobile >= 16px (Sem Auto-zoom iOS)"]
        B4["Ritmo de Espaçamento Consistente"]
    end

    subgraph P3["3. Estados de Interface"]
        C1["Loading (Skeleton / Spinner)"]
        C2["Empty State (Vazio Acolhedor)"]
        C3["Error State (Mensagem + Ação de Retentativa)"]
        C4["Disabled State (Prevenção de Duplo Clique)"]
    end

    subgraph P4["4. Acessibilidade (a11y)"]
        D1["Navegação Completa por Teclado"]
        D2["Indicador de Foco Visível (ring-offset)"]
        D3["Alt em Imagens Relevantes"]
        D4["Labels Explícitos (<Label htmlFor>)"]
        D5["Informação Não Dependente Exclusiva de Cor"]
    end

    subgraph P5["5. Feedback ao Usuário"]
        E1["Resposta Visual Imediata a Ações"]
        E2["Erros Claros e Acionáveis"]
        E3["Transparência Total (Sem Telas no Escuro)"]
    end
```

---

## 2. Matriz Viva de Verificação por Tela

Esta matriz é continuamente atualizada a cada ciclo de desenvolvimento e release:

### Legenda:
*  **Aprovado**: Cumpre integralmente o critério.
* ⚠️ **Atenção / Débito**: Funciona, mas possui refinamento ergonômico recomendado.
* ❌ **Crítico / Blocker**: Violação direta que compromete a usabilidade ou conformidade.

| Critério | Triagem do Paciente (`$slug.triagem.tsx`) | Cockpit Médico (`painel.$id.tsx` / `painel.index`) | Portal do Paciente (`portal.tsx`) | Admin & Gestão (`admin.tsx`) | Autenticação (`entrar.tsx` / `auth.tsx`) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **1.1 Mobile-First (≤480px)** |  (Testado iPhone SE / 14) |  (Cards móveis + Sheet) |  (Container fluido) |  (Colapsável lg:grid) |  (Centralizado fluido) |
| **1.2 Zero Overflow-X** |  (Contido) |  (Tabela com scroll isolado) |  (Contido) |  (Tabs com scroll interno) |  (Contido) |
| **1.3 Touch Targets (≥44px)** |  (Botões min-h-14 / 44px) |  (Ações rápidas ≥44px) |  (Botões h-11 / 44px) |  (Botões min-h-11) |  (Botões h-12) |
| **1.4 Sem Dependência de Hover** |  (Ações explícitas por toque) |  (Ações com clique direto) |  (Ações visíveis) |  (Botões com label) |  (Ações visíveis) |
| **2.1 Hierarquia Visual** |  (H1/H2 padronizados) |  (Tipografia com peso claro) |  (H1 serif + tags) |  (Banner hero + cards) |  (H1 serif claro) |
| **2.2 Contraste WCAG AA** |  (Esmeralda/Slate ≥4.5:1) |  (Tons conformes AA) |  (Card de crise de alto contraste) |  (Badges e botões nítidos) |  (Cores institucionais) |
| **2.3 Font-Size Mobile (≥16px)** |  (text-base sem auto-zoom) |  (text-base em filtros/inputs) |  (text-base) |  (text-base em campos) |  (text-base em inputs) |
| **3.1 Loading State** |  (Progress bar / submitting) |  (Skeletons animados) |  (Skeletons animados) |  (Spinners de ação) |  (Spinner no botão) |
| **3.2 Empty State** | N/A (Formulário) |  (Empty card + limpar filtros) |  (Empty card acolhedor + CTA) |  (Lista com chamada de cadastro) | N/A |
| **3.3 Error State + Retry** |  (Card de erro com retry) |  (Card com tentar novamente) |  (Card com tentar novamente) |  (Feedback toast/inline) |  (Alerta de credencial) |
| **3.4 Disabled State** |  (disabled={!valid}) |  (Prevenção de double-click) |  (Prevenção de submissão) |  (disabled={saving}) |  (disabled={loading}) |
| **4.1 Teclado Completo** |  (Tab/Enter/Espaço) |  (Foco sequencial funcional) |  (Teclado nativo) |  (Tabulação padrão) |  (Tabulação de form) |
| **4.2 Foco Visível** |  (focus-visible:ring-2) |  (focus-visible:ring-2) |  (focus-visible:ring-2) |  (focus-visible:ring-2) |  (focus-visible:ring-2) |
| **4.3 Labels de Formulário** |  (Label htmlFor em todos) |  (Labels acessíveis) |  (Labels em campos) |  (Label htmlFor em tudo) |  (Label htmlFor em tudo) |
| **5.1 Feedback Imediato** |  (Troca instantânea com motion) |  (Toasts / Sonner) |  (Mensagens em tempo real) |  (Toast de sucesso) |  (Alertas claros) |
| **5.2 Erros Acionáveis** |  (Validação pt-BR nos campos) |  (Mensagens clínicas claras) |  (Instruções passo a passo) |  (Mensagens em português) |  (Mensagens de auth amigáveis) |

---

## 3. Protocolo de Auditoria Contínua

Ao modificar qualquer interface:
1. Rodar a verificação de tipos e compilação: `bun run build`.
2. Rodar a suíte de testes unitários: `bun run test`.
3. Rodar a suíte de testes móveis e responsividade do Playwright:
   ```bash
   npx playwright test e2e/triagem-mobile.spec.ts --workers=1
   ```
4. Se qualquer teste falhar ou se um novo campo de formulário for adicionado sem `<Label htmlFor>`, o PR deve ser bloqueado até a regularização.
