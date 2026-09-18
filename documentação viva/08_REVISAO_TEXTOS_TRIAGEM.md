# Revisão de Textos e Conteúdos da Triagem — Saraiva Clínica de Psiquiatria

> **Documento de Auditoria e Refinamento Textual**  
> **Objetivo:** Mapear rigorosamente 100% das telas, títulos, subtítulos, instruções, rótulos de campos, avisos éticos, opções de sintomas e mensagens de acolhimento da jornada do paciente em `https://triagempsi.pontocomumtus.workers.dev/saraiva/triagem`.  
> **Uso:** Permitir que o Dr. Saraiva e a equipe avaliem e ajustem o tom, a linguagem e a clareza de cada texto antes do atendimento clínico.

---

## Estrutura Geral da Jornada do Paciente

```
[Cabeçalho Fixo]
       │
       ▼
[Tela 1: Boas-Vindas e Consentimento LGPD]
       │
       ▼
[Tela 2: Dados Básicos e Identificação do Paciente / Familiar]
       │
       ▼
[Tela 3: Mapeamento de Sintomas e Queixas Iniciais (Árvore de Triagem)]
       │
       ▼
[Tela 4: Aplicação de Escalas Psiquiátricas (1 Pergunta por Tela)]
       │
       ├── Se Risco Detectado ──► [Tela 5: Acolhimento Imediato / Risco / CVV]
       │                                  │
       └── Se Fluxo Normal ─────► [Tela 6: Conclusão / Encerramento / PDF]
                                          │
                                          ▼
                         [Módulo Final: Cartões de Psicoeducação (10 Temas)]
```

---

## 0. Componentes Globais (Fixos em Todas as Telas)

### 0.1. Cabeçalho Superior (Header)
- **Logotipo / Ícone:** Ícone oficial da clínica ou monograma.
- **Nome da Clínica:** `Saraiva Clínica de Psiquiatria`
- **Link de Navegação (à direita):** `Início` (retorna para a landing page `/saraiva`)
- **Barra de Progresso (durante as escalas):** Linha fina verde-azulada indicando a porcentagem de conclusão calculada dinamicamente.

### 0.2. Rodapé Inferior (Footer Disclaimer)
- **Texto:**
  > *"Este questionário é um instrumento de pré-avaliação clínica e não substitui uma consulta médica formal. Em caso de emergência ou risco à vida, ligue 192 (SAMU) ou 188 (CVV)."*

---

## Tela 1: Boas-Vindas e Consentimento LGPD

**Objetivo:** Acolher o paciente, explicar o propósito da pré-avaliação, reduzir a ansiedade sobre questionários médicos e obter o consentimento ético e legal (LGPD).

### Textos em Tela

#### Título Principal
> **Bem-vindo(a) à pré-avaliação**

#### Texto Introdutório de Boas-Vindas
> *"Seja bem-vindo(a). Este questionário breve de pré-avaliação ajuda o Dr. José Ribamar Fernandes Saraiva Junior a conhecer seu momento antes da consulta, permitindo que o nosso tempo juntos seja dedicado ao que realmente importa: uma escuta atenta, humanizada e individualizada. Suas respostas são protegidas por sigilo ético absoluto."*

#### Pontos de Destaque / Instruções Práticas
- • **Tempo estimado:** *Leve cerca de 10 minutos e pode ser feito pelo celular.*
- • **Salvamento automático:** *Se você fechar a página, retomamos de onde parou.*
- • **Confidencialidade:** *Suas respostas são confidenciais e vistas só pela equipe clínica.*

#### Caixa de Aviso Ético / Não-Diagnóstico
> *"Esta pré-avaliação organiza seus sintomas e direciona a conversa médica inicial, mas não constitui diagnóstico clínico nem prescrição de tratamento."*

#### Termo de Consentimento e Privacidade (LGPD)
- **Checkbox:** `[ ]`
- **Texto do Rótulo:**
  > *"Concordo em compartilhar estas informações com a equipe de saúde para fins exclusivos do meu atendimento médico, em conformidade com a LGPD e o Código de Ética Médica."*

#### Botão de Ação
- **Botão Principal:** `Começar` *(desabilitado até que o consentimento seja marcado)*

---

## Tela 2: Dados Básicos e Identificação

**Objetivo:** Vincular a pré-avaliação à consulta médica e identificar quem está preenchendo (o próprio paciente ou um familiar/cuidador).

### Textos em Tela

#### Título e Subtítulo
- **Título:** **Seus dados**
- **Subtítulo:** *Usamos apenas para associar sua pré-avaliação à sua consulta.*

#### Escolha do Profissional (Opcional — quando há mais de um cadastrado)
- **Rótulo:** `Com qual profissional você quer consultar? (opcional)`
- **Opções disponíveis:**
  - Card 1: `Dr. José Ribamar Fernandes Saraiva Junior` — *Psiquiatria Clínica · RQE 30038*
  - Card 2: `Sem preferência — a equipe direciona`
- **Texto de apoio:**
  > *"Sua pré-avaliação fica destacada para o profissional escolhido, e toda a equipe do consultório pode acompanhar."*

#### Pergunta sobre Quem Preenche o Formulário
- **Rótulo:** `Quem está preenchendo este questionário? *`
- **Opções (Botões Selecionáveis):**
  1. `O próprio paciente`
  2. `Familiar ou responsável`
- **Nota explicativa:**
  > *"Os nomes e a data de nascimento pedidos abaixo são sempre os do paciente. Essa informação muda a forma como o médico interpreta os resultados."*

#### Campos Adicionais (Exibidos APENAS se selecionado "Familiar ou responsável")
- **Campo:** `Seu nome (quem responde) *`
- **Campo:** `Grau de parentesco` (Placeholder: *"mãe, cônjuge, cuidador(a)…"*)

#### Campos de Identificação do Paciente
1. **Nome completo do paciente \***: `Nome completo do paciente *`
2. **Data de nascimento \***: `Data de nascimento *` *(Calcula automaticamente a idade em anos, ex.: "35 anos")*
3. **Sexo/Gênero**: `Sexo/gênero`
4. **E-mail \***: `E-mail *`
5. **Telefone / WhatsApp**: `Telefone / WhatsApp` (Placeholder: *"(11) 99999-9999"*)
6. **Motivo da Consulta**: `O que motiva sua busca por atendimento? (opcional)` *(Caixa de texto livre com até 2.000 caracteres)*

#### Botões de Navegação
- **Botão Esquerdo:** `Voltar` (retorna para a Tela 1)
- **Botão Direito:** `Continuar` *(habilitado após preencher nome, e-mail válido e data de nascimento com idade ≥ 5 anos)*

---

## Tela 3: Rastreio Inicial de Queixas e Sintomas

**Objetivo:** Apresentar a árvore de queixas para que o paciente marque os sintomas que vivencia, permitindo que o sistema selecione exatamente as escalas pertinentes à faixa etária e ao sofrimento relatado.

### Textos em Tela

#### Título e Instrução
- **Título:** **Nas últimas semanas, você tem se sentido…**
- **Subtítulo:** *Marque tudo o que você reconhece em você. Pode escolher mais de uma opção — ou nenhuma.*

#### Lista Completa de Sintomas (17 Opções Clínicas)

| # | Identificador | Texto Principal da Opção | Dica de Apoio (Texto Secundário) |
|---|---|---|---|
| 1 | `tristeza` | **Triste, desanimado(a) ou sem vontade** | *(Sem texto adicional)* |
| 2 | `ansiedade` | **Ansioso(a), preocupado(a) ou tenso(a)** | *(Sem texto adicional)* |
| 3 | `angustia` | **Angustiado(a), com o corpo pesado ou sem energia** | *(Sem texto adicional)* |
| 4 | `somatico` | **Com dores ou sintomas físicos frequentes sem explicação** | *(Sem texto adicional)* |
| 5 | `trauma` | **Marcado(a) por algo muito assustador que vivi** | *Acidente grave, violência, abuso, perda ou ameaça de morte.* |
| 6 | `obsessivo` | **Com manias ou pensamentos repetitivos que não param** | *(Sem texto adicional)* |
| 7 | `substancias` | **Com problemas envolvendo álcool ou outras substâncias** | *(Sem texto adicional)* |
| 8 | `morte` | **Com pensamentos de morte ou de me machucar** | *Responder isso aqui ajuda a equipe a cuidar de você com prioridade.* |
| 9 | `jogos` | **Com apostas, bets ou jogos ocupando muito espaço na minha vida** | *Cassino online, bets, loterias, jogo do bicho ou cartas.* |
| 10 | `atencao` | **Com dificuldade de atenção, agitação ou impulsividade** | *(Sem texto adicional)* |
| 11 | `oscilacao` | **Com oscilações de humor ou fases de muita energia sem precisar dormir** | *Períodos em que você não estava do seu jeito habitual — muito acelerado(a), eufórico(a) ou irritado(a).* |
| 12 | `tabaco` | **Fumando (cigarro, vape ou narguilé) e com dificuldade de parar** | *(Sem texto adicional)* |
| 13 | `perinatal` | **Grávida ou com bebê de até 12 meses** | *A gestação e o pós-parto pedem um rastreio próprio de humor.* |
| 14 | `alimentar` | **Com a comida, o peso ou o corpo ocupando muito espaço na minha cabeça** | *(Sem texto adicional)* |
| 15 | `sono` | **Dormindo mal há semanas** | *(Sem texto adicional)* |
| 16 | `neuro` | **Com dificuldade em situações sociais e sensibilidade a barulho, luz ou rotina** | *(Sem texto adicional)* |
| 17 | `trabalho` | **Sobrecarregado(a) ou adoecendo por causa do trabalho** | *Ritmo, cobrança, assédio ou insegurança no emprego (rastreio de riscos psicossociais — NR-01).* |
| 18 | `memoria` | **Com falhas de memória ou confusão que apareceram nos últimos anos** | *Se você estiver respondendo por outra pessoa, marque também esta opção.* |

#### Botões de Navegação
- **Botão Esquerdo:** `Voltar` (retorna para Dados Básicos)
- **Botão Direito:** `Continuar` *(ou `Enviando…` se não houver escalas indicadas e finalizar de imediato)*

---

## Tela 4: Aplicação das Escalas Psiquiátricas (Uma Pergunta por Tela)

**Objetivo:** Apresentar os itens das escalas médicas validadas com foco cognitivo, sem poluição visual e com avanço ágil.

### Textos do Cabeçalho da Pergunta
- **Identificação da Escala e Posição:**
  `[NOME DA ESCALA] · pergunta [X] de [TOTAL]`  
  *(Exemplo: `PHQ-9 · pergunta 1 de 9` ou `GAD-7 · pergunta 3 de 7`)*
- **Instruções da Escala e Período de Recordação:**
  `[Texto de instrução] ([Período de referência])`  
  *(Exemplo: "Nas últimas duas semanas, com que frequência você foi incomodado(a) por qualquer dos seguintes problemas? (Últimas 2 semanas)")*
- **Rótulo de Bloco / Agrupamento (se aplicável):**
  *(Exemplo no ASSIST-Lite: `Álcool`, `Cannabis`, `Tabaco`)*
- **Texto da Pergunta Principal:**
  *(Exemplo: "Pouco interesse ou pouco prazer em fazer as coisas")*

### Formato das Opções de Resposta (Botões de Toque Único)

#### Padrão 1: Escalas de Frequência de 4 Pontos (PHQ-9, GAD-7, etc.)
1. `Nenhuma vez` (0)
2. `Vários dias` (1)
3. `Mais da metade dos dias` (2)
4. `Quase todos os dias` (3)

#### Padrão 2: Escala de Bem-Estar da OMS (WHO-5 — 6 Pontos)
1. `Nunca (0)`
2. `De vez em quando (1)`
3. `Menos da metade do tempo (2)`
4. `Mais da metade do tempo (3)`
5. `A maior parte do tempo (4)`
6. `O tempo todo (5)`

#### Padrão 3: Escala de Gravidade de Insônia (ISI — 5 Pontos)
1. `Nenhuma` (0)
2. `Leve` (1)
3. `Moderada` (2)
4. `Grave` (3)
5. `Muito grave` (4)

#### Padrão 4: Inventário de Burnout de Maslach (MBI-HSS — 7 Pontos)
1. `Nunca` (0)
2. `Raramente (algumas vezes ao ano)` (1)
3. `Ocasionalmente (uma vez ao mês)` (2)
4. `Frequentemente (algumas vezes ao mês)` (3)
5. `Muito frequentemente (uma vez por semana)` (4)
6. `Quase sempre (algumas vezes por semana)` (5)
7. `Diariamente` (6)

#### Padrão 5: Escalas Dicotômicas (C-SSRS, SCOFF, MDQ)
1. `Não` (0)
2. `Sim` (1)

### Elementos de Apoio e Navegação
- **Botão Retornar:** `← Voltar` (permite corrigir a resposta anterior sem reiniciar o questionário)
- **Feedback de Envio:** `Enviando suas respostas…` (ao responder o último item da bateria indicada)

---

## Tela 5: Acolhimento Imediato em Caso de Risco Clínico

**Objetivo:** Garantir a segurança do paciente quando pensamentos de morte, ideação suicida ou sofrimento agudo forem sinalizados (C-SSRS, PHQ-9 item 9, RISK-COMPOSITE).

### Textos em Tela

#### Card de Alerta e Acolhimento
- **Título de Alerta:** **Você não está sozinho(a)**
- **Mensagem Central de Cuidado:**
  > *"Seus sentimentos e seu sofrimento são importantes para nós. Se você está passando por um momento difícil, com pensamentos de morte ou ideação de se machucar, queremos que saiba que você não está sozinho(a) e que existe ajuda imediata e humana disponível agora mesmo."*

#### Canais de Ajuda Rápida (Botões com Discagem Direta)
1. **Canal 1 (CVV):**
   - Rótulo: `CVV — Centro de Valorização da Vida (24h)`
   - Telefone em Destaque: `188` (Ligação gratuita nacional)
2. **Canal 2 (SAMU):**
   - Rótulo: `SAMU — emergência médica`
   - Telefone em Destaque: `192`

#### Orientação Adicional de Procura Presencial
> *"Procure atendimento imediato em um pronto-socorro ou CAPS mais próximo se o sofrimento estiver intenso agora. Você também pode falar com a nossa equipe: (54) 99999-0000."*

#### Card de Confirmação do Envio
- **Texto:**
  > *"Suas respostas foram enviadas e a equipe clínica será avisada com prioridade."*
- **Ação:**
  - Botão: `Baixar meu resumo em PDF`

---

## Tela 6: Conclusão e Encerramento Normal

**Objetivo:** Confirmar o recebimento seguro, acalmar o paciente e direcioná-lo para os próximos passos de sua consulta com o Dr. Saraiva.

### Textos em Tela

#### Ícone de Sucesso
- Checkmark verde em círculo suave.

#### Título e Confirmação
- **Título:** **Pré-avaliação concluída**
- **Texto de Encerramento Oficial do Consultório:**
  > *"Muito obrigado por dedicar seu tempo. Suas informações foram enviadas com segurança diretamente ao Dr. Saraiva, servindo de alicerce para a sua consulta médica."*
- **Confirmação de Envio por E-mail:**
  > *"Uma confirmação será enviada para [e-mail do paciente]."*

#### Ação Principal
- **Botão:** `Baixar meu resumo em PDF`

#### Chamada para o Portal do Paciente
> *"Quer rever este resumo depois? [Crie seu acesso no Portal do Paciente](link) com o mesmo e-mail informado aqui."*

#### Aviso Ético de Rodapé
> *"Este questionário é um instrumento de pré-avaliação clínica e não substitui uma consulta médica formal. Em caso de emergência ou risco à vida, ligue 192 (SAMU) ou 188 (CVV)."*

---

## Tela 7: Módulo de Recomendações e Psicoeducação (Exibido no Fim)

**Objetivo:** Disponibilizar estratégias práticas, baseadas em TCC e redução de danos, personalizadas de acordo com as respostas do paciente.

### Cabeçalho da Seção de Psicoeducação
- **Ícone:** Livro aberto
- **Título:** **Orientações e Práticas de Cuidado Recomendadas**
- **Subtítulo:**
  > *"Com base nas áreas avaliadas, separamos materiais educativos e estratégias práticas de autorregulação elaboradas pela nossa equipe clínica:"*

---

### Os 10 Temas Psicoeducativos Oficiais

#### Tema 1: Crise Emocional e Apoio Imediato
- **Título:** Apoio Imediato e Manejo de Crise
- **Tag:** `Apoio Imediato` · Tags: `#seguranca`, `#crise`, `#acolhimento`
- **Resumo do Card:**
  > *"Se você está sentindo que a dor emocional está insuportável, respire e lembre-se: crises são temporárias, mesmo quando parecem intermináveis. Existem pessoas preparadas para te ouvir agora."*
- **Botões Imediatos:**
  - `Ligar CVV 188 (Gratuito 24h)`
  - `SAMU 192`
- **Conteúdo Completo (Plano de Segurança):**
  > **1. Afaste-se do perigo imediato:** Vá para um ambiente acompanhado ou ligue para alguém de confiança.  
  > **2. Técnica de ancoragem 5-4-3-2-1:** Identifique 5 coisas que você vê, 4 que pode tocar, 3 que ouve, 2 que pode cheirar e 1 sabor na boca.  
  > **3. Contatos de Emergência:** CVV 188 (ligação gratuita nacional, atendimento 24h sigiloso) ou SAMU 192.  
  > **4. Rede de apoio:** Envie uma mensagem simples para alguém próximo: *"Não estou bem agora, você pode ficar comigo?"*

---

#### Tema 2: Depressão e Humor Baixo
- **Título:** Compreendendo a Depressão e o Desânimo
- **Resumo do Card:**
  > *"A depressão não é fraqueza nem falta de força de vontade. É uma condição médica tratável que afeta energia, pensamentos e a forma como o cérebro processa o prazer."*
- **Conteúdo Completo:**
  > **O ciclo do desânimo:** Na depressão, a falta de energia faz você se afastar das atividades, o que gera mais isolamento e piora o humor.  
  > **Ativação Comportamental (Passos Mínimos):** Não espere a vontade chegar para agir. Escolha uma única ação muito pequena (ex.: lavar o rosto, dar uma volta de 5 minutos na quadra, abrir a janela) e realize-a sem se cobrar perfeição.  
  > **Autocompaixão:** Trate a si mesmo com a gentileza com que trataria um amigo doente. A recuperação se faz passo a passo.

---

#### Tema 3: Ansiedade e Regulação Nervosa
- **Título:** Ansiedade: Compreendendo o Alarme do Corpo
- **Resumo do Card:**
  > *"A ansiedade é o alarme natural do organismo para perigos. Às vezes, esse alarme dispara sem ameaça real, causando palpitações, falta de ar e preocupações persistentes."*
- **Conteúdo Completo:**
  > **O alarme em falso:** Taquicardia, respiração curta e tensão muscular são respostas normais do sistema simpático — são desconfortáveis, mas não são perigosas por si só.  
  > **Respiração Diafragmática 4-7-8:** Inspire pelo nariz em 4 segundos, retenha o ar por 7 segundos e solte lentamente pela boca em 8 segundos. Repita 4 vezes para desacelerar os batimentos cardíacos.  
  > **Desfusão de Pensamentos:** Um pensamento de preocupação ("e se tudo der errado?") é apenas um evento mental, não uma profecia. Diga a si mesmo: *"Percebo que minha mente está produzindo um pensamento de medo"*.

---

#### Tema 4: Higiene do Sono e Ritmo Circadiano
- **Título:** Otimizando a Qualidade do Sono
- **Resumo do Card:**
  > *"Dormir bem é o alicerce biológico do equilíbrio emocional. Pequenas alterações no ambiente e na rotina restauram o ciclo sono-vigília de forma sustentável."*
- **Conteúdo Completo:**
  > **A regra dos 20 minutos:** Se não conseguir dormir em cerca de 20 minutos, saia da cama. Vá para outro cômodo com pouca luz e faça uma atividade calma (como ler um livro impresso) até o sono retornar.  
  > **Higiene de Luz:** Evite telas azuis (celular, tablet, TV) pelo menos 60 minutos antes de deitar. De manhã, tome sol nos primeiros 30 minutos após acordar para fixar o ritmo circadiano.  
  > **Temperatura e Cafeína:** Mantenha o quarto fresco e evite café, chimarrão, energéticos e refrigerantes cafeinados após as 14h.

---

#### Tema 5: Atenção, Foco e Organização (TDAH)
- **Título:** Desafios de Foco e Funcionamento Executivo
- **Resumo do Card:**
  > *"Dificuldades em manter a atenção, esquecimentos e procrastinação refletem a regulação da dopamina e das funções executivas no córtex pré-frontal, e não falta de inteligência ou caráter."*
- **Conteúdo Completo:**
  > **Técnica dos Blocos de Foco (Pomodoro Adaptado):** Divida o trabalho em intervalos de 20 a 25 minutos de dedicação exclusiva a uma única tarefa, seguidos de 5 minutos de pausa com movimento físico.  
  > **Descarga Mental no Papel:** Nunca confie apenas na memória de trabalho. Tenha um caderno aberto para anotar imediatamente ideias e pendências sem interromper o que está fazendo.  
  > **Ambiente sem Distrações:** Deixe o celular em outro cômodo enquanto trabalha e reduza estímulos visuais na mesa.

---

#### Tema 6: Oscilações de Humor e Energia
- **Título:** Mapeando Oscilações de Humor e Energia
- **Resumo do Card:**
  > *"Oscilações marcadas de humor, períodos de euforia ou aceleração com pouca necessidade de sono exigem olhar especializado para diferenciar estresse de variações de ritmo afetivo."*
- **Conteúdo Completo:**
  > **Diário de Humor e Sono:** Anote diariamente o número de horas dormidas, nível de energia (de 0 a 10) e humor. Alterações no padrão de sono costumam ser o primeiro sinal de virada de humor.  
  > **Rotina Regular (Social Rhythm):** Mantenha horários consistentes para acordar, fazer refeições e dormir. A estabilidade de rotina é um fator protetor biológico reconhecido.  
  > **Comunicação com a Família:** Compartilhe com pessoas próximas quais são seus sinais habituais de aceleração ou desânimo para que elas possam alertá-lo com gentileza.

---

#### Tema 7: Álcool e Outras Substâncias
- **Título:** Autonomia e Cuidado com o Uso de Substâncias
- **Resumo do Card:**
  > *"O uso de álcool ou substâncias com frequência começa como uma tentativa de aliviar angústia, ansiedade ou insônia. Conversar abertamente sobre isso, sem julgamentos, é o primeiro passo para a liberdade."*
- **Conteúdo Completo:**
  > **Acolhimento sem preconceito:** Em nosso consultório, a abordagem é baseada no respeito, na autonomia e na redução de danos, sem cobranças moralistas.  
  > **Identificando Gatilhos:** Observe em quais momentos a vontade de beber ou usar é mais forte (cansaço extremo, brigas, solidão, comemorações específicas).  
  > **Substituições Estratégicas:** Se o objetivo ao final do dia é desacelerar, experimente criar um ritual substituto (banho quente, chá aromático, caminhada leve, exercício de respiração).

---

#### Tema 8: Vivências Traumáticas e Segurança
- **Título:** Processando Experiências Assustadoras e Trauma
- **Resumo do Card:**
  > *"Reações intensas a eventos traumáticos — como lembranças invasivas, sobressaltos e evitação de lugares — são tentativas do corpo de se proteger de uma ameaça que já passou."*
- **Conteúdo Completo:**
  > **A resposta de sobrevivência:** O cérebro primitivo reage como se o perigo ainda estivesse acontecendo no presente. Compreender isso reduz a sensação de desespero.  
  > **Orientação no Presente:** Quando uma lembrança invasiva surgir, toque em um objeto sólido, sinta os pés firmes no chão e repita mentalmente: *"Aquele fato aconteceu no passado. Agora estou seguro(a) aqui"*.  
  > **Respeito ao Próprio Tempo:** Não se force a revisitar memórias difíceis antes de ter um ambiente terapêutico seguro com o seu médico ou psicólogo.

---

#### Tema 9: Sobrecarga, Estresse e Burnout
- **Título:** Reconhecendo e Manejando a Exaustão Profissional
- **Resumo do Card:**
  > *"O esgotamento crônico no trabalho (Burnout) resulta de um descompasso prolongado entre as exigências do ambiente e a capacidade biológica de recuperação, não de incapacidade pessoal."*
- **Conteúdo Completo:**
  > **Os três pilares do Burnout:** Exaustão emocional profunda, sensação de distanciamento cínico do trabalho e queda na eficácia profissional percebida.  
  > **Limites de Comunicação:** Defina um horário limite para responder mensagens de trabalho. Desative notificações corporativas no celular à noite e nos finais de semana.  
  > **Micro-pausas de Descompressão:** A cada 90 minutos de esforço mental contínuo, levante-se por 3 a 5 minutos, alongue o corpo e beba água fresca para quebrar o ciclo de cortisol elevado.

---

#### Tema 10: Bem-Estar e Prevenção Ativa
- **Título:** Cultivando Saúde Mental no Dia a Dia
- **Resumo do Card:**
  > *"Saúde mental não é apenas a ausência de sintomas psiquiátricos, mas a presença ativa de propósito, conexões significativas, autocuidado e vitalidade diária."*
- **Conteúdo Completo:**
  > **Os 5 Pilares do Estilo de Vida Saudável:**  
  > 1. *Movimento regular:* Caminhadas ou exercícios liberam endorfinas e BDNF (fator neurotrófico protetor cerebral).  
  > 2. *Nutrição e Hidratação:* O intestino produz neurotransmissores chave para o humor; prefira alimentos in natura.  
  > 3. *Conexões Reais:* Cultive momentos de conversa com pessoas com quem você se sente ouvido(a) e aceito(a).  
  > 4. *Lazer sem Telas:* Reserve tempo semanal para passatempos prazerosos que não envolvam computadores ou celulares.  
  > 5. *Pausa Espiritual / Sentido:* Dedique minutos ao silêncio, gratidão ou reflexão sobre seus valores fundamentais.

---

## Tela 8: Tela de Erro / Falha de Conexão

**Objetivo:** Informar com transparência qualquer intercorrência de rede ou gravação, preservando todas as respostas na memória do navegador.

### Textos em Tela
- **Título em Vermelho:** **Não foi possível enviar**
- **Mensagem Amigável:**
  > *"Não foi possível salvar sua triagem. Tente novamente."*  
  *(Ou descrição detalhada do erro se gerada pelo servidor)*
- **Botão de Recuperação:**
  - `Tentar novamente` *(Retorna para as respostas com 100% dos dados preservados, sem perder nada)*

---

## Checklist de Revisão Recomendada

- [ ] **Tom de acolhimento:** O texto soa empático, profissional e acolhedor?
- [ ] **Clareza das opções de sintomas:** Algum termo parece técnico demais ou ambíguo?
- [ ] **LGPD e Consentimento:** O termo atende às exigências regulatórias do consultório?
- [ ] **Orientações de emergência:** Telefones 188 e 192 estão perfeitamente visíveis?
- [ ] **Psicoeducação:** O vocabulário das 10 áreas dialoga de forma construtiva com a abordagem de TCC do Dr. Saraiva?
