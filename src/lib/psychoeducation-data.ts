/**
 * Módulo de Psicoeducação - TriagemPsi
 * Curadoria clínica alinhada à prática do Dr. José Ribamar Fernandes Saraiva Junior
 * (Medicina de Família, Psiquiatria ABP, TCC, Dependência Química e Envelhecimento Humano).
 */

export type PsychoLevel = "resumo" | "completo" | "crise";

export type PsychoTopicDefinition = {
  slug: string;
  title: string;
  short_title: string;
  description: string;
  icon: string;
  sort_order: number;
  tags: string[];
  triggersDescription: string;
  summary_pdf: string;
  resumo_card: string;
  body_md: string;
};

export const OFFICIAL_PSYCHOEDUCATION_TOPICS: PsychoTopicDefinition[] = [
  {
    slug: "depressao-humor",
    title: "Depressão e humor baixo",
    short_title: "Humor e Depressão",
    description:
      "Compreensão do humor deprimido, ativação comportamental e acolhimento sem julgamento.",
    icon: "Sun",
    sort_order: 1,
    tags: ["#TCC", "#AtivacaoComportamental", "#Humor"],
    triggersDescription: "PHQ-9 ≥ 10 ou PHQ-2 ≥ 3",
    summary_pdf:
      "Sentir o humor baixo por vários dias e cansaço excessivo é comum e não significa fraqueza. Pequenas ações diárias ajudam a criar movimento. Converse com seu médico para avaliação individualizada.",
    resumo_card:
      "Sentir o humor baixo por vários dias, com falta de prazer nas coisas e cansaço excessivo, é mais comum do que se imagina. Isso não significa fraqueza. Pequenas ações diárias (caminhada curta, manter rotina de sono e conversar com alguém de confiança) já ajudam a criar movimento. Se esses sentimentos persistirem, conversar com seu médico é o próximo passo mais importante. Você não precisa enfrentar isso sozinho.",
    body_md: `### Compreendendo a depressão e a recuperação

O humor deprimido envolve alterações no sono, apetite, energia, concentração e interesse pelas coisas que antes davam prazer. A Terapia Cognitivo-Comportamental (TCC) demonstra que pensamentos autocríticos e a redução gradual de atividades cotidianas formam um ciclo que se retroalimenta.

#### Estratégias práticas de enfrentamento:
1. **Ativação comportamental:** Comece com uma atividade muito pequena e viável (ex.: 10 minutos de caminhada ou arrumar uma mesa), mesmo sem ter vontade prévia. A motivação frequentemente surge após o movimento, não antes.
2. **Higiene do sono:** Mantenha horários constantes para acordar e deitar, garantindo exposição à luz solar pela manhã.
3. **Reduzir a autocrítica:** Reconheça que a lentidão é um sintoma biológico e psicológico, e não preguiça ou falta de caráter.

#### Abordagens de tratamento:
O plano terapêutico é sempre individualizado e pode combinar psicoterapia, intervenções no estilo de vida, psicofármacos adequados e, em situações específicas, técnicas modernas de neuromodulação (como a Estimulação Magnética Transcraniana - TMS). O passo fundamental é compartilhar o que você sente com seu médico de confiança.`,
  },
  {
    slug: "ansiedade-preocupacao",
    title: "Ansiedade e preocupação excessiva",
    short_title: "Ansiedade e Alívio",
    description: "O sistema de alarme do organismo, técnicas de respiração e regulação cognitiva.",
    icon: "Wind",
    sort_order: 2,
    tags: ["#TCC", "#Grounding", "#Respiracao"],
    triggersDescription: "GAD-7 ≥ 10 ou GAD-2 ≥ 3",
    summary_pdf:
      "A ansiedade funciona como um alarme hiperativo. Pratique a respiração 4-4-6 e limite estímulos de notícias. Um profissional de saúde pode ajudar a recalibrar esse equilíbrio.",
    resumo_card:
      "A ansiedade é um sistema de alarme do corpo. Quando ele fica ligado o tempo todo, gera tensão, preocupação excessiva e dificuldade de relaxar. Técnicas simples de respiração (inspirar 4 segundos, segurar 4, expirar 6) e limitar o tempo de checagem de notícias já ajudam. Converse com seu médico se a preocupação estiver atrapalhando seu dia a dia.",
    body_md: `### Mecanismos da ansiedade e técnicas de autorregulação

A ansiedade excessiva mantém o organismo em estado contínuo de alerta contra perigos imaginados ou superestimados. Isso se manifesta no corpo como taquicardia, tensão muscular, aperto no peito e respiração curta.

#### Estratégias práticas de TCC:
1. **Respiração diafragmática ritmada:** Inspire contando até 4 pelo nariz, segure o ar por 4 segundos e solte lentamente pela boca por 6 segundos. Repita por 3 a 5 ciclos para sinalizar segurança ao sistema nervoso.
2. **Técnica de Aterramento (Grounding 5-4-3-2-1):** Em momentos de crise, olhe ao redor e nomeie 5 objetos que você vê, 4 que pode tocar, 3 sons que escuta, 2 cheiros e 1 sabor.
3. **Exposição gradual:** Não evite completamente tarefas rotineiras que gerem desconforto leve; encare-as em etapas gradativas.
4. **Higiene informacional:** Estabeleça horários específicos para ler notícias e redes sociais, evitando checagens repetitivas à noite.`,
  },
  {
    slug: "crise-emocional",
    title: "Crise emocional e apoio prioritário",
    short_title: "Apoio Imediato e Crise",
    description:
      "Acolhimento prioritário, desestigmatização do sofrimento extremo e canais 24h de emergência.",
    icon: "HeartHandshake",
    sort_order: 3,
    tags: ["#CVV188", "#Seguranca", "#ApoioImediato"],
    triggersDescription: "PHQ-9 item 9 ≥ 1, C-SSRS positivo ou RISK-COMPOSITE",
    summary_pdf:
      "Você não precisa carregar essa dor sozinho. Em sofrimento intenso, ligue imediatamente para o CVV 188 (ligação gratuita 24h) ou SAMU 192.",
    resumo_card:
      "Se você está passando por um momento muito difícil e teve pensamentos de que seria melhor não estar vivo, saiba que esses sentimentos podem melhorar. Você não está sozinho. Ligue agora para o CVV 188 (24 horas, gratuito) ou SAMU 192. Conte para alguém de confiança. Há ajuda disponível.",
    body_md: `### Plano de segurança e cuidado prioritário

Momentos de crise profunda podem trazer pensamentos de morte, desaparecimento ou autolesão. Esse é um sinal de sofrimento psíquico severo e agudo, e **nunca** de fraqueza pessoal ou falta de fé.

#### Passos de segurança imediatos:
1. **Peça ajuda agora:** Ligue gratuitamente para o **CVV (Centro de Valorização da Vida) no número 188** ou acione o **SAMU (192)**.
2. **Avise alguém de confiança:** Fale abertamente com um amigo, familiar ou vizinho próximo: *"Estou com pensamentos difíceis agora e preciso de companhia."*
3. **Proteja seu ambiente:** Afaste do alcance qualquer substância, medicamento ou meio que possa oferecer risco.
4. **Não tome decisões definitivas sob dor extrema:** A dor psíquica intensa distorce temporariamente nossa capacidade de enxergar soluções futuras.
5. **Procure atendimento presencial:** Vá até a Unidade de Pronto Atendimento (UPA) ou pronto-socorro mais próximo.

Existem intervenções seguras e eficazes. A sua vida tem valor e o acolhimento médico é sigiloso e acolhedor.`,
  },
  {
    slug: "insonia-sono",
    title: "Insônia e higiene do sono",
    short_title: "Sono e Recuperação",
    description:
      "Regras de higiene do sono, regulação circadiana e cuidados especiais para todas as faixas etárias.",
    icon: "Moon",
    sort_order: 4,
    tags: ["#TCC-I", "#HigieneDoSono", "#RitmoCircadiano"],
    triggersDescription: "ISI ≥ 15",
    summary_pdf:
      "A qualidade do sono modula a estabilidade do humor e da ansiedade. Horários regulares e quarto sem telas são os primeiros passos fundamentais.",
    resumo_card:
      "Dormir mal afeta humor, ansiedade e concentração. Regras simples: horário fixo para deitar e acordar, evitar telas 1 hora antes, não usar a cama para trabalho ou celular, e levantar se não dormir em 20-30 minutos.",
    body_md: `### Estratégias baseadas em evidências para insônia

A insônia frequentemente se perpetua através de associações condicionadas de ansiedade com a própria cama. A privação crônica de sono amplia a vulnerabilidade a sintomas depressivos e desregulação neuroquímica.

#### Pilares da Higiene do Sono (TCC-I):
1. **Controle de estímulos:** Use a cama unicamente para dormir e intimidade. Evite trabalhar, assistir televisão ou usar smartphone deitado.
2. **Regra dos 25 minutos:** Se não adormecer após 20 a 30 minutos, saia do quarto, vá a um ambiente com luz suave e faça uma leitura tranquila. Volte apenas com sono real.
3. **Horário de despertar inegociável:** Mantenha o mesmo horário de levantar todos os dias, inclusive nos fins de semana, ancorando o ritmo circadiano.
4. **Cuidado com cafeína e álcool:** Suspenda estimulantes após as 14h. Embora o álcool induza sonolência superficial, ele fragmenta o sono profundo e piora a insônia nas horas seguintes.
5. **Atenção especial à terceira idade:** No envelhecimento, é natural haver menor necessidade de sono profundo e maior fragmentação; cochilos diurnos prolongados devem ser ajustados para preservar o repouso noturno.`,
  },
  {
    slug: "tdah-adultos",
    title: "TDAH em adultos (atenção e organização)",
    short_title: "TDAH em Adultos",
    description:
      "Mecanismos executivos, desorganização crônica, estratégias práticas de rotina e externalização mental.",
    icon: "BrainCircuit",
    sort_order: 5,
    tags: ["#TDAH", "#FuncoesExecutivas", "#Organizacao"],
    triggersDescription: "ASRS-18 Parte A positiva",
    summary_pdf:
      "Dificuldades crônicas de foco, esquecimentos e procrastinação em adultos podem se beneficiar de avaliação clínica e estratégias de apoio estruturado.",
    resumo_card:
      "Dificuldade de organização, procrastinação e distração excessiva na vida adulta podem estar relacionadas ao TDAH. Estratégias práticas (listas, alarmes, ambiente organizado) ajudam bastante. Uma avaliação formal pode esclarecer e abrir caminhos de tratamento.",
    body_md: `### Compreensão do TDAH no adulto e funções executivas

O Transtorno de Déficit de Atenção/Hiperatividade em adultos se manifesta primariamente por disfunção executiva: dificuldade em gerenciar o tempo, priorizar obrigações, sustentar foco em tarefas pouco prazerosas e modular a impulsividade.

#### Estratégias práticas de externalização:
1. **Tire as pendências da cabeça:** A memória de trabalho no TDAH sobrecarrega facilmente. Registre compromissos em blocos visíveis, calendários sincronizados e notas no celular.
2. **Método de micropassos:** Divida relatórios, estudos ou tarefas domésticas em etapas de 15 minutos (técnica Pomodoro adaptada).
3. **Ambiente com baixo ruído visual:** Mantenha sobre a mesa apenas o que está sendo executado naquele momento.
4. **Validação histórica:** Entender que a distração não é sinal de incapacidade intelectual reduz anos de culpa e baixa autoestima acumulada.`,
  },
  {
    slug: "oscilacoes-humor",
    title: "Oscilações de humor (espectro bipolar)",
    short_title: "Estabilidade do Humor",
    description:
      "Diferença entre reações normais e períodos de ativação intensa; relevância de diagnóstico cuidadoso.",
    icon: "Activity",
    sort_order: 6,
    tags: ["#Bipolaridade", "#Estabilidade", "#RitmoBiologico"],
    triggersDescription: "MDQ positivo",
    summary_pdf:
      "Períodos alternados de excesso de energia seguidos por apatia profunda merecem investigação médica detalhada para segurança farmacológica.",
    resumo_card:
      "Mudanças intensas de energia, sono e humor merecem atenção. Evite automedicação. Converse com seu médico sobre o padrão desses períodos. Existem formas eficazes de estabilizar o humor.",
    body_md: `### Entendendo as oscilações do espectro bipolar

Variações emocionais fazem parte da existência humana. No entanto, quando surgem fases de energia exacerbada, redução acentuada da necessidade de sono (sentir-se desperto dormindo apenas 2 ou 3 horas), pensamento acelerado e aumento de comportamentos impulsivos, pode se tratar de uma oscilação do espectro de humor bipolar.

#### Aspectos essenciais:
1. **Preservação de rotina social e biológica:** Pessoas com propensão a oscilações de humor têm relógios biológicos sensíveis. Horários fixos de alimentação e sono agem como estabilizadores naturais.
2. **Cuidado com antidepressivos isolados:** Em quadros bipolares, tomar antidepressivos sem estabilizador de humor pode deflagrar crises de aceleração (virada hipomaníaca) ou agitação.
3. **Mapeamento de gatilhos:** Privação deliberada de sono, viagens longas com troca de fuso horário e estresse prolongado exigem acompanhamento médico vigilante.`,
  },
  {
    slug: "alcool-substancias",
    title: "Álcool e substâncias",
    short_title: "Álcool e Substâncias",
    description:
      "Abordagem humanizada, redução progressiva de danos e acolhimento em saúde sem julgamento moral.",
    icon: "Wine",
    sort_order: 7,
    tags: ["#ReducaoDeDanos", "#SaudeIntegral", "#CuidadoHumanizado"],
    triggersDescription: "AUDIT ≥ 8, DAST-10 ≥ 3 ou CRAFFT ≥ 2",
    summary_pdf:
      "O consumo de substâncias interage intimamente com quadros de ansiedade e sono. A redução gradual de danos é sempre acolhida com sigilo e respeito.",
    resumo_card:
      "O uso de álcool ou outras substâncias pode afetar o humor, o sono e a ansiedade. Reduzir o consumo já traz benefícios. Converse abertamente com seu médico — o objetivo é cuidar da sua saúde, sem julgamento.",
    body_md: `### Redução de danos e saúde mental no uso de substâncias

O consumo de álcool, tabaco ou outras substâncias frequentemente tem início como uma tentativa de aplacar angústias, ansiedade ou insônia. Contudo, com o tempo, o uso continuado altera a neuroquímica cerebral e aprofunda os próprios sintomas que se tentava aliviar.

#### Princípios da Redução de Danos:
1. **Progresso acima da perfeição:** Não é necessário atingir abstinência imediata para experimentar melhoras na saúde. Cada redução de quantidade ou frequência é uma vitória protetora.
2. **Mapeie os contextos de risco:** Identifique horários, companhias e locais onde o consumo perde o controle planejado.
3. **Hidratação e alimentação prévia:** Nunca consuma álcool com o estômago vazio e intercale sempre copos de água.
4. **Espaço seguro na consulta médica:** Em nosso serviço, o diálogo sobre substâncias é conduzido sob sigilo ético absoluto, com foco científico em sua qualidade de vida e metas pessoais.`,
  },
  {
    slug: "trauma-tept",
    title: "Trauma e estresse pós-traumático",
    short_title: "Trauma e Segurança",
    description:
      "Processamento de eventos estressores graves, memórias intrusivas e caminhos de restabelecimento seguro.",
    icon: "ShieldCheck",
    sort_order: 8,
    tags: ["#TEPT", "#Seguranca", "#Resiliencia"],
    triggersDescription: "PCL-5 ≥ 31-33",
    summary_pdf:
      "Lembranças invasivas e estado contínuo de alerta são reações biológicas a traumas. Terapias especializadas ajudam a reprocessar essas memórias com segurança.",
    resumo_card:
      "Experiências difíceis podem deixar marcas (lembranças invasivas, evitação, hipervigilância). Existem tratamentos eficazes. Você não precisa reviver tudo sozinho.",
    body_md: `### Compreendendo o Transtorno de Estresse Pós-Traumático (TEPT)

Eventos traumáticos — como acidentes graves, violência interpessoal, perdas abruptas ou situações de risco iminente — podem sobrecarregar o centro cerebral de memória (hipocampo) e medo (amígdala), fazendo com que o evento passado pareça estar acontecendo no tempo presente.

#### Sintomas típicos e normatização:
- **Intrusão:** Flashbacks, pesadelos e imagens espontâneas angustiantes.
- **Evitação:** Esforço para não falar, pensar ou passar perto de locais que lembrem o fato.
- **Hiperativação:** Sobressaltos repentinos, irritabilidade e dificuldade severa para relaxar.

#### Caminhos de cuidado baseado em evidências:
A psicoterapia com técnicas de TCC focada em trauma, EMDR e cuidados médicos coordenados demonstram excelentes índices de recuperação. O autocuidado começa por reestabelecer uma rotina de segurança pessoal e acolhimento por pessoas queridas.`,
  },
  {
    slug: "burnout-esgotamento",
    title: "Burnout e esgotamento",
    short_title: "Esgotamento e Trabalho",
    description:
      "Identificação do cansaço laboral crônico, despersonalização e reorganização saudável de limites.",
    icon: "BatteryWarning",
    sort_order: 9,
    tags: ["#Burnout", "#SaudeNoTrabalho", "#Limites"],
    triggersDescription: "MBI-HSS elevado ou PSS-10 ≥ 27",
    summary_pdf:
      "O esgotamento profissional crônico não se resolve apenas com descanso de fim de semana. É necessária reestruturação de limites e suporte clínico.",
    resumo_card:
      "Esgotamento emocional, cinismo e sensação de ineficácia são sinais de burnout. Pausas reais, limites claros e conversa com alguém de confiança são o começo. Seu médico pode ajudar a avaliar o quadro completo.",
    body_md: `### Dimensões do Burnout e restauração de energia

O Burnout não é um simples cansaço passageiro; é uma resposta prolongada ao estresse crônico no ambiente de trabalho ou de cuidados a terceiros, estruturado em três dimensões:
1. **Exaustão emocional:** Esvaziamento de recursos físicos e mentais logo no início do dia.
2. **Despersonalização / Cinismo:** Atitude de distanciamento, frieza ou irritação com colegas e clientes.
3. **Baixa realização pessoal:** Sensação de que o esforço é inútil ou insuficiente.

#### Medidas práticas de recuperação:
- **Desconexão digital real:** Não responda e-mails ou mensagens de trabalho fora da jornada contratada.
- **Resgate de atividades com sentido:** Pratique hobbies desvinculados de metas de produtividade.
- **Suporte médico e laboral:** Quando a exaustão atinge níveis incapacitantes, licenças médicas orientadas e psicoterapia são passos clínicos indispensáveis.`,
  },
  {
    slug: "bem-estar-prevencao",
    title: "Bem-estar e prevenção na vida e no envelhecimento",
    short_title: "Bem-estar e Longevidade",
    description:
      "Hábitos protetores, manutenção de propósito, conexões afetivas e saúde mental na maturidade e velhice.",
    icon: "Sparkles",
    sort_order: 10,
    tags: ["#Longevidade", "#EnvelhecimentoHumano", "#Prevencao"],
    triggersDescription: "WHO-5 ≤ 50% ou disponível para toda triagem",
    summary_pdf:
      "A saúde mental se cultiva em pequenos atos diários de conexão, sono e movimento. O envelhecimento pleno apoia-se em manter autonomia e vínculos significativos.",
    resumo_card:
      "Pequenos hábitos diários protegem a saúde mental: sono regular, movimento, conexão social e limitação de redes sociais. Na terceira idade, manter vínculos e propósito é especialmente importante.",
    body_md: `### Saúde mental integral, longevidade e envelhecimento com dignidade

A saúde mental é uma construção dinâmica diária e não uma ausência passiva de sintomas. Ao longo de todo o ciclo de vida — e muito especialmente na maturidade e na velhice — a preservação de vínculos afetivos autênticos e de um sentido pessoal são os maiores protetores cerebrais conhecidos pela neurociência e pela psicodinâmica.

#### Pilares Universais de Proteção Psíquica:
1. **Movimento regular:** Atividade aeróbica ou caminhadas leves estimulam o BDNF (fator neurotrófico derivado do cérebro), atuando como um antidepressivo natural.
2. **Conexão humana presencial:** Conversas significativas liberam ocitocina e regulam o eixo de estresse corporal.
3. **Cultivo de propósito:** Ter projetos pessoais — desde plantar, estudar um novo assunto ou orientar outras gerações — mantém a plasticidade mental ativa.

#### A Psicodinâmica do Envelhecimento Humano:
Como nos ensinam os estudos sobre longevidade e saúde mental do idoso, o avançar da idade traz singularidade, sabedoria acumulada e capacidade de ressignificação. O envelhecer **não** deve ser igualado a decadência ou perda de valor social. Manter a escuta ativa, o respeito à autonomia e o cuidado preventivo de rotina permite que cada fase da vida seja vivida com dignidade, vitalidade e alegria.`,
  },
];

export const PSYCHO_TOPIC_BY_SLUG = new Map<string, PsychoTopicDefinition>(
  OFFICIAL_PSYCHOEDUCATION_TOPICS.map((t) => [t.slug, t]),
);
