# ASSIST-Lite (OMS) — substituição do ASSIST simplificado

## Objetivo

Substituir o ASSIST simplificado de hoje (9 perguntas de frequência, escore único) pelo **ASSIST-Lite da OMS** exatamente como no documento enviado: 20 perguntas Sim/Não (nº 801–820), ramificação por gateway em 7 substâncias, escore e classificação de risco **por substância** e conduta recomendada por nível.

## O que muda para o paciente

- Quem marca "uso de substâncias" na triagem responde o ASSIST-Lite: a 1ª pergunta de cada substância é a porta de entrada — se "Não", o restante daquela substância é pulado e vale 0.
- Quem não usa nada responde apenas 7 perguntas (uma por substância); quem usa, no máximo 20.
- A contagem "pergunta X de Y" e o botão Voltar acompanham os pulos sem quebrar.
- Faixa etária e porta de entrada não mudam: sintoma "substâncias", a partir de 15 anos.

## O que muda para o médico

- **Detalhe da triagem no painel**: quadro por substância (escore, faixa baixo/moderado/alto e conduta: reforço positivo / intervenção breve FRAMES / encaminhamento especializado), seguido das respostas item a item. Itens pulados aparecem marcados como "pulada — gateway negativo".
- **PDF e e-mail de resultados**: passam a exibir o quadro por substância com as condutas.
- **Escalonamentos atualizados**:
  - Tabaco ≥ 1 → abre Fagerström (FTND), medindo dependência de nicotina;
  - Álcool ≥ 2 → abre AUDIT completo;
  - Qualquer substância em alto risco (≥ 3) → abre PHQ-2 (comorbidade depressiva).
- Triagens antigas (ASSIST simplificado) continuam legíveis no painel — a definição antiga fica preservada de forma oculta só para renderizar o histórico.

## Implementação (resumo técnico)

1. **Motor de ramificação** (`src/lib/scale-types.ts` + `src/routes/$slug.triagem.tsx`): metadado de grupo/gateway nos itens e função `proximoItem()` que pula o restante do grupo quando o gateway é "Não". Loop de perguntas, botão Voltar e progresso passam a usá-la. Itens pulados são gravados como 0 e marcados como pulados.
2. **Dados da escala** (`src/lib/scales-extra.ts`): nova definição `ASSIST` com as 20 questões, 7 dimensões e faixas por substância (padrão: 0 baixo, 1–2 moderado, ≥3 alto; álcool: 0–1 / 2 / ≥3). ASSIST antigo vira definição oculta para o histórico.
3. **Escore** (`src/lib/scoring.ts`): `scoreScale` passa a calcular `subscores` (por substância: escore, faixa, conduta recomendada). O escore principal da escala vira o pior nível entre as substâncias, mantendo compatível o semáforo da fila de revisão.
4. **Escalonamentos** (`src/config/triage-tree.ts`): regras remapeadas dos cortes antigos para os subescores (tabaco → FTND, álcool → AUDIT, alto risco → PHQ-2).
5. **Exibição**: painel de detalhe, PDF (`pdf-report.ts`) e e-mail de resultados renderizam o quadro por substância e os itens pulados.
6. **Validação de envio** (`src/lib/assessment.functions.ts`): aceitar itens pulados pelo gateway como respondidos com 0.
7. **Testes**: ramificação (gateway "Não" pula e zera), escore por substância, corte especial do álcool e os três escalonamentos; ajustar testes existentes que citam o ASSIST antigo.
8. **Registro da entrega** via `node scripts/roadmap-add.mjs` (nova versão, pendente de aprovação no /roadmap).

## Fora de escopo

- AUDIT-C e CAGE permanecem no fluxo (são instrumentos de profundidade; o Lite dispara o AUDIT quando o álcool é positivo).
- Nenhuma mudança visual na landing page ou no portal além do necessário dentro da triagem.
