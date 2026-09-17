# Painel mobile-first: leitura rápida no celular (v1.23.0)

## Diagnóstico (confirmado no código)

1. **Navegação com 17 links** em faixa de rolagem horizontal (`PainelShell`) — no celular vira uma "barra de rolagem" escondida onde quase tudo fica invisível.
2. **A visão padrão é uma tabela com `min-w-[52rem]`** (~832px) dentro de `overflow-x-auto` — em qualquer telefone isso **força rolagem horizontal** para ver ações e escalas. É a barra de rolagem que incomoda.
3. **Antes da lista de pacientes há uma pilha enorme de controles**: visualizações salvas, busca, 4 chips, banner de impacto, alternador fila/cartões, "Mais filtros" (10+ selects), métricas — no celular são várias telas de rolagem até o primeiro paciente.
4. Existe um modo "Cartões", mas não é o padrão e o cartão é denso demais para escaneamento rápido.

## O que será construído

### 1. Navegação profissional reformulada (mobile)
- **Barra inferior fixa (bottom tabs)** no celular com 5 destinos: **Triagens**, **Contatos**, **Evolução**, **Resumo** e **Menu**.
- **"Menu" abre uma gaveta (drawer)** com os demais destinos agrupados: Clínica (Protocolo, NR-01, Evolução), Referência (Evidências, Como interpretar, Materiais, Ajuda) e Sistema (Auditoria, E-mails, Roadmap, Changelog, Consultórios, Metatags, Minha senha, Sair).
- No **desktop**, a navegação por abas no topo é mantida (sem regressão para o uso em consultório).
- O cabeçalho mobile fica enxuto: nome da clínica + título da página; "Sair" sai do header e vai para a gaveta.

### 2. Lista de triagens sem rolagem horizontal
- **Celular sempre abre em cartões** (detecção de viewport no cliente, sem quebrar SSR); a tabela densa continua disponível e padrão no desktop.
- **Novo cartão de leitura rápida** (mobile): faixa lateral colorida por gravidade (risco/atenção/neutro), nome + idade + "há Xh", até 3 badges de escala + "+N", médico destinado; **toque no cartão abre o detalhe**; ações secundárias (PDF paciente/clínico, marcar revisado, seleção em lote) ficam em uma linha de ícones/expandir — sem poluir o escaneamento.
- Nenhuma largura mínima forçada em telas pequenas: fim da rolagem horizontal.

### 3. Controles compactos
- **Barra fixa no topo da lista** (sticky): campo de busca + chips de risco (Todas / Via de risco / Atenção / Sem alteração) com contadores — é o filtro de 90% do uso diário.
- **"Filtros" vira botão com contador de ativos** que abre uma **gaveta (bottom sheet)** com todos os selects (período, escala, status, informante, clínica, ordenação) e as **visualizações salvas** — em vez de empilhar tudo na página.
- Banner de impacto da fila e `InformanteMetrics` viram seções recolhíveis abaixo da lista no mobile.

### 4. Paginação adaptada
- No celular: botão **"Carregar mais"** (acumula os resultados, sem controles de página miúdos).
- No desktop: paginação Anterior/Próxima preservada.

### 5. Registro da entrega
- Roadmap/changelog via `node scripts/roadmap-add.mjs` (status pendente, aguardando sua aprovação na fila de revisão), versão 1.23.0.

## Detalhes técnicos
- Arquivos:
  - `src/components/painel/PainelShell.tsx` — bottom tab bar + drawer de menu (componentes `Sheet`/`Drawer` do shadcn já disponíveis); nav desktop intacta via classes responsivas (`hidden sm:flex` etc.).
  - `src/components/painel/MobileTriageCard.tsx` (novo) — cartão de leitura rápida.
  - `src/routes/_authenticated/painel.index.tsx` — estado inicial de `modo` por viewport (lido em `useEffect` para não quebrar hidratação), sticky bar, drawer de filtros, "Carregar mais".
- Zero mudança de backend/RLS: apenas apresentação. Todas as cores seguem os tokens semânticos existentes (`--primary`, `--destructive`, `--warning`…).
- A tabela atual **não é removida** — continua a visão de trabalho no desktop.

## Verificação
- Playwright em viewport de celular (390×844): confirmar que não há rolagem horizontal, que o primeiro paciente aparece sem rolar a página e que busca/chips/gaveta funcionam.
- Playwright em desktop (1280px): confirmar que tabela, filtros e navegação atuais seguem idênticos.
- (Se a sessão de teste não estiver disponível no sandbox, peço para você abrir o preview logado uma vez para a sessão ser injetada.)
