-- ====================================================================
-- MÓDULO DE PSICOEDUCAÇÃO - TriagemPsi
-- ====================================================================
-- Curadoria clínica inspirada nas práticas do Dr. José Ribamar Fernandes Saraiva Junior
-- (Medicina de Família, Psiquiatria ABP, TCC, Dependência Química e Geriatria).
-- ====================================================================

-- 1. Temas (categorias clínicas)
CREATE TABLE IF NOT EXISTS public.psychoeducation_topics (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL,
  title         text NOT NULL,
  short_title   text,
  description   text,
  icon          text,
  sort_order    integer DEFAULT 0,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- 2. Conteúdos (versões do tema)
CREATE TABLE IF NOT EXISTS public.psychoeducation_contents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id        uuid NOT NULL REFERENCES public.psychoeducation_topics(id) ON DELETE CASCADE,
  version         text NOT NULL DEFAULT 'v1',
  level           text NOT NULL CHECK (level IN ('resumo', 'completo', 'crise')),
  title           text NOT NULL,
  body_md         text NOT NULL,
  summary_pdf     text,
  external_links  jsonb DEFAULT '[]',
  video_urls      jsonb DEFAULT '[]',
  is_published    boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(topic_id, version, level)
);

-- 3. Configuração por clínica (o médico controla)
CREATE TABLE IF NOT EXISTS public.clinic_psychoeducation_settings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  topic_id        uuid NOT NULL REFERENCES public.psychoeducation_topics(id) ON DELETE CASCADE,
  is_enabled      boolean DEFAULT true,
  auto_trigger    boolean DEFAULT true,
  custom_intro    text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(clinic_id, topic_id)
);

-- 4. Recomendações geradas por triagem (histórico)
CREATE TABLE IF NOT EXISTS public.assessment_psychoeducation (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id   uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  topic_id        uuid NOT NULL REFERENCES public.psychoeducation_topics(id) ON DELETE CASCADE,
  content_id      uuid REFERENCES public.psychoeducation_contents(id) ON DELETE SET NULL,
  trigger_reason  text,
  is_manual       boolean DEFAULT false,
  viewed_at       timestamptz,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(assessment_id, topic_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_psycho_contents_topic ON public.psychoeducation_contents(topic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_psycho_clinic ON public.clinic_psychoeducation_settings(clinic_id);
CREATE INDEX IF NOT EXISTS idx_assessment_psycho_assessment ON public.assessment_psychoeducation(assessment_id);

-- Grants
GRANT SELECT ON public.psychoeducation_topics TO anon, authenticated;
GRANT SELECT ON public.psychoeducation_contents TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_psychoeducation_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_psychoeducation TO authenticated;
GRANT ALL ON public.psychoeducation_topics TO service_role;
GRANT ALL ON public.psychoeducation_contents TO service_role;
GRANT ALL ON public.clinic_psychoeducation_settings TO service_role;
GRANT ALL ON public.assessment_psychoeducation TO service_role;

-- =====================================================
-- RLS
-- =====================================================

ALTER TABLE public.psychoeducation_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.psychoeducation_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_psychoeducation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_psychoeducation ENABLE ROW LEVEL SECURITY;

-- Temas e conteúdos: leitura pública para ativos e publicados
DROP POLICY IF EXISTS "psycho_topics_read" ON public.psychoeducation_topics;
CREATE POLICY "psycho_topics_read" ON public.psychoeducation_topics
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "psycho_contents_read" ON public.psychoeducation_contents;
CREATE POLICY "psycho_contents_read" ON public.psychoeducation_contents
  FOR SELECT USING (is_published = true);

-- Configuração da clínica: quem tem acesso à clínica
DROP POLICY IF EXISTS "clinic_psycho_select" ON public.clinic_psychoeducation_settings;
CREATE POLICY "clinic_psycho_select" ON public.clinic_psychoeducation_settings
  FOR SELECT USING (
    public.is_global_admin(auth.uid()) 
    OR public.has_clinic_access(clinic_id)
  );

DROP POLICY IF EXISTS "clinic_psycho_manage" ON public.clinic_psychoeducation_settings;
CREATE POLICY "clinic_psycho_manage" ON public.clinic_psychoeducation_settings
  FOR ALL USING (
    public.is_global_admin(auth.uid()) 
    OR (public.has_clinic_access(clinic_id) AND public.has_role(auth.uid(), 'admin'))
  );

-- Recomendações da triagem: equipe clínica e paciente dono do e-mail
DROP POLICY IF EXISTS "assessment_psycho_select" ON public.assessment_psychoeducation;
CREATE POLICY "assessment_psycho_select" ON public.assessment_psychoeducation
  FOR SELECT USING (
    public.is_global_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_id
        AND (
          public.has_clinic_access(a.clinic_id)
          OR (a.respondent_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
        )
    )
  );

DROP POLICY IF EXISTS "assessment_psycho_insert" ON public.assessment_psychoeducation;
CREATE POLICY "assessment_psycho_insert" ON public.assessment_psychoeducation
  FOR INSERT WITH CHECK (
    public.is_global_admin(auth.uid())
    OR public.has_clinic_access(
      (SELECT clinic_id FROM public.assessments WHERE id = assessment_id)
    )
  );

DROP POLICY IF EXISTS "assessment_psycho_update" ON public.assessment_psychoeducation;
CREATE POLICY "assessment_psycho_update" ON public.assessment_psychoeducation
  FOR UPDATE USING (
    public.is_global_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_id
        AND (
          public.has_clinic_access(a.clinic_id)
          OR (a.respondent_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
        )
    )
  );

-- =====================================================
-- SEED DOS 10 TEMAS OFICIAIS COM RESUMO E COMPLETO
-- =====================================================

DO $$
DECLARE
  v_topic_id uuid;
BEGIN

  -- 1. Depressão e humor baixo
  INSERT INTO public.psychoeducation_topics (slug, title, short_title, description, icon, sort_order)
  VALUES (
    'depressao-humor',
    'Depressão e humor baixo',
    'Humor e Depressão',
    'Compreensão do humor deprimido, ativação comportamental e apoio sem julgamento.',
    'Sun',
    1
  ) ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, short_title = EXCLUDED.short_title
  RETURNING id INTO v_topic_id;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'resumo',
    'Depressão e humor baixo: primeiros passos',
    'Sentir o humor baixo por vários dias, com falta de prazer nas coisas e cansaço excessivo, é mais comum do que se imagina. Isso não significa fraqueza. Pequenas ações diárias (caminhada curta, manter rotina de sono e conversar com alguém de confiança) já ajudam a criar movimento. Se esses sentimentos persistirem, conversar com seu médico é o próximo passo mais importante. Você não precisa enfrentar isso sozinho.',
    'Sentir o humor baixo por vários dias e cansaço excessivo é comum e não significa fraqueza. Pequenas ações diárias ajudam a criar movimento. Converse com seu médico para avaliação individualizada.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'completo',
    'Compreendendo a depressão e a recuperação',
    'O humor deprimido envolve alterações no sono, apetite, energia, concentração e interesse pelas coisas que antes davam prazer. A Terapia Cognitivo-Comportamental (TCC) demonstra que pensamentos autocríticos e a redução gradual de atividades cotidianas formam um ciclo que se retroalimenta.

### Estratégias práticas de enfrentamento:
1. **Ativação comportamental:** Comece com uma atividade muito pequena e viável (ex.: 10 minutos de caminhada ou arrumar uma mesa), mesmo sem ter vontade prévia. A motivação frequentemente surge após o movimento, não antes.
2. **Higiene do sono:** Mantenha horários constantes para acordar e deitar, garantindo exposição à luz solar pela manhã.
3. **Reduzir a autocrítica:** Reconheça que a lentidão é um sintoma biológico e psicológico, e não preguiça ou falta de caráter.

### Abordagens de tratamento:
O plano terapêutico é sempre individualizado e pode combinar psicoterapia, intervenções no estilo de vida, psicofármacos adequados e, em situações específicas, técnicas modernas de neuromodulação (como a Estimulação Magnética Transcraniana - TMS). O passo fundamental é compartilhar o que você sente com seu médico de confiança.',
    'Compreensão profunda sobre ciclo de humor, ativação comportamental e opções de cuidado em equipe multiprofissional.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;


  -- 2. Ansiedade e preocupação excessiva
  INSERT INTO public.psychoeducation_topics (slug, title, short_title, description, icon, sort_order)
  VALUES (
    'ansiedade-preocupacao',
    'Ansiedade e preocupação excessiva',
    'Ansiedade e Alívio',
    'O sistema de alarme do organismo, técnicas de respiração e regulação cognitiva.',
    'Wind',
    2
  ) ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, short_title = EXCLUDED.short_title
  RETURNING id INTO v_topic_id;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'resumo',
    'Ansiedade e preocupação: compreendendo o alarme',
    'A ansiedade é um sistema de alarme do corpo. Quando ele fica ligado o tempo todo, gera tensão, preocupação excessiva e dificuldade de relaxar. Técnicas simples de respiração (inspirar 4 segundos, segurar 4, expirar 6) e limitar o tempo de checagem de notícias já ajudam. Converse com seu médico se a preocupação estiver atrapalhando seu dia a dia.',
    'A ansiedade funciona como um alarme hiperativo. Pratique a respiração 4-4-6 e limite estímulos de notícias. Um profissional de saúde pode ajudar a recalibrar esse equilíbrio.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'completo',
    'Mecanismos da ansiedade e técnicas de autorregulação',
    'A ansiedade excessiva mantém o organismo em estado contínuo de alerta contra perigos imaginados ou superestimados. Isso se manifesta no corpo como taquicardia, tensão muscular, aperto no peito e respiração curta.

### Estratégias práticas de TCC:
1. **Respiração diafragmática ritmada:** Inspire contando até 4 pelo nariz, segure o ar por 4 segundos e solte lentamente pela boca por 6 segundos. Repita por 3 a 5 ciclos para sinalizar segurança ao sistema nervoso.
2. **Técnica de Aterramento (Grounding 5-4-3-2-1):** Em momentos de crise, olhe ao redor e nomeie 5 objetos que você vê, 4 que pode tocar, 3 sons que escuta, 2 cheiros e 1 sabor.
3. **Exposição gradual:** Não evite completamente tarefas rotineiras que gerem desconforto leve; encare-as em etapas gradativas.
4. **Higiene informacional:** Estabeleça horários específicos para ler notícias e redes sociais, evitando checagens repetitivas à noite.',
    'Guia de autorregulação emocional, técnicas de grounding e respiração diafragmática contra crises de ansiedade.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;


  -- 3. Crise emocional e ideação suicida
  INSERT INTO public.psychoeducation_topics (slug, title, short_title, description, icon, sort_order)
  VALUES (
    'crise-emocional',
    'Crise emocional e ideação suicida',
    'Apoio Imediato e Crise',
    'Acolhimento prioritário, desestigmatização do sofrimento extremo e canais 24h de emergência.',
    'HeartHandshake',
    3
  ) ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, short_title = EXCLUDED.short_title
  RETURNING id INTO v_topic_id;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'resumo',
    'Apoio em momentos de sofrimento intenso',
    'Se você está passando por um momento muito difícil e teve pensamentos de que seria melhor não estar vivo, saiba que esses sentimentos podem melhorar. Você não está sozinho. Ligue agora para o CVV 188 (24 horas, gratuito) ou SAMU 192. Conte para alguém de confiança. Há ajuda disponível.',
    'Você não precisa carregar essa dor sozinho. Em sofrimento intenso, ligue imediatamente para o CVV 188 (ligação gratuita 24h) ou SAMU 192.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'completo',
    'Plano de segurança e cuidado prioritário',
    'Momentos de crise profunda podem trazer pensamentos de morte, desaparecimento ou autolesão. Esse é um sinal de sofrimento psíquico severo e agudo, e **nunca** de fraqueza pessoal ou falta de fé.

### Passos de segurança imediatos:
1. **Peça ajuda agora:** Ligue gratuitamente para o **CVV (Centro de Valorização da Vida) no número 188** ou acione o **SAMU (192)**.
2. **Avise alguém de confiança:** Fale abertamente com um amigo, familiar ou vizinho próximo: *"Estou com pensamentos difíceis agora e preciso de companhia."*
3. **Proteja seu ambiente:** Afaste do alcance qualquer substância, medicamento ou meio que possa oferecer risco.
4. **Não tome decisões definitivas sob dor extrema:** A dor psíquica intensa distorce temporariamente nossa capacidade de enxergar soluções futuras.
5. **Procure atendimento presencial:** Vá até a Unidade de Pronto Atendimento (UPA) ou pronto-socorro mais próximo.

Existem intervenções seguras e eficazes. A sua vida tem valor e o acolhimento médico é sigiloso e acolhedor.',
    'Plano de segurança para momentos críticos com canais de emergência CVV 188 e SAMU 192.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;


  -- 4. Insônia e higiene do sono
  INSERT INTO public.psychoeducation_topics (slug, title, short_title, description, icon, sort_order)
  VALUES (
    'insonia-sono',
    'Insônia e higiene do sono',
    'Sono e Recuperação',
    'Regras de higiene do sono, regulação circadiana e cuidados especiais para todas as faixas etárias.',
    'Moon',
    4
  ) ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, short_title = EXCLUDED.short_title
  RETURNING id INTO v_topic_id;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'resumo',
    'Higiene do sono para noites reparadoras',
    'Dormir mal afeta humor, ansiedade e concentração. Regras simples: horário fixo para deitar e acordar, evitar telas 1 hora antes, não usar a cama para trabalho ou celular, e levantar se não dormir em 20-30 minutos.',
    'A qualidade do sono modula a estabilidade do humor e da ansiedade. Horários regulares e quarto sem telas são os primeiros passos fundamentais.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'completo',
    'Estratégias baseadas em evidências para insônia',
    'A insônia frequentemente se perpetua através de associações condicionadas de ansiedade com a própria cama. A privação crônica de sono amplia a vulnerabilidade a sintomas depressivos e desregulação neuroquímica.

### Pilares da Higiene do Sono (TCC-I):
1. **Controle de estímulos:** Use a cama unicamente para dormir e intimidade. Evite trabalhar, assistir televisão ou usar smartphone deitado.
2. **Regra dos 25 minutos:** Se não adormecer após 20 a 30 minutos, saia do quarto, vá a um ambiente com luz suave e faça uma leitura tranquila. Volte apenas com sono real.
3. **Horário de despertar inegociável:** Mantenha o mesmo horário de levantar todos os dias, inclusive nos fins de semana, ancorando o ritmo circadiano.
4. **Cuidado com cafeína e álcool:** Suspenda estimulantes após as 14h. Embora o álcool induza sonolência superficial, ele fragmenta o sono profundo e piora a insônia nas horas seguintes.
5. **Atenção especial à terceira idade:** No envelhecimento, é natural haver menor necessidade de sono profundo e maior fragmentação; cochilos diurnos prolongados devem ser ajustados para preservar o repouso noturno.',
    'Diretrizes da TCC para insônia (TCC-I), controle de estímulos e rotina de descanso biológico.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;


  -- 5. TDAH em adultos
  INSERT INTO public.psychoeducation_topics (slug, title, short_title, description, icon, sort_order)
  VALUES (
    'tdah-adultos',
    'TDAH em adultos (atenção e organização)',
    'TDAH em Adultos',
    'Mecanismos executivos, desorganização crônica, estratégias práticas de rotina e externalização mental.',
    'BrainCircuit',
    5
  ) ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, short_title = EXCLUDED.short_title
  RETURNING id INTO v_topic_id;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'resumo',
    'TDAH em adultos: atenção e rotina',
    'Dificuldade de organização, procrastinação e distração excessiva na vida adulta podem estar relacionadas ao TDAH. Estratégias práticas (listas, alarmes, ambiente organizado) ajudam bastante. Uma avaliação formal pode esclarecer e abrir caminhos de tratamento.',
    'Dificuldades crônicas de foco, esquecimentos e procrastinação em adultos podem se beneficiar de avaliação clínica e estratégias de apoio estruturado.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'completo',
    'Compreensão do TDAH no adulto e funções executivas',
    'O Transtorno de Déficit de Atenção/Hiperatividade em adultos se manifesta primariamente por disfunção executiva: dificuldade em gerenciar o tempo, priorizar obrigações, sustentar foco em tarefas pouco prazerosas e modular a impulsividade.

### Estratégias práticas de externalização:
1. **Tire as pendências da cabeça:** A memória de trabalho no TDAH sobrecarrega facilmente. Registre compromissos em blocos visíveis, calendários sincronizados e notas no celular.
2. **Método de micropassos:** Divida relatórios, estudos ou tarefas domésticas em etapas de 15 minutos (técnica Pomodoro adaptada).
3. **Ambiente com baixo ruído visual:** Mantenha sobre a mesa apenas o que está sendo executado naquele momento.
4. **Validação histórica:** Entender que a distração não é sinal de incapacidade intelectual reduz anos de culpa e baixa autoestima acumulada.',
    'Guia sobre funções executivas no TDAH adulto, externalização de tarefas e organização prática.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;


  -- 6. Oscilações de humor (espectro bipolar)
  INSERT INTO public.psychoeducation_topics (slug, title, short_title, description, icon, sort_order)
  VALUES (
    'oscilacoes-humor',
    'Oscilações de humor (espectro bipolar)',
    'Estabilidade do Humor',
    'Diferença entre reações normais e períodos de ativação intensa; relevância de diagnóstico cuidadoso.',
    'Activity',
    6
  ) ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, short_title = EXCLUDED.short_title
  RETURNING id INTO v_topic_id;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'resumo',
    'Oscilações de energia e ritmo de humor',
    'Mudanças intensas de energia, sono e humor merecem atenção. Evite automedicação. Converse com seu médico sobre o padrão desses períodos. Existem formas eficazes de estabilizar o humor.',
    'Períodos alternados de excesso de energia seguidos por apatia profunda merecem investigação médica detalhada para segurança farmacológica.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'completo',
    'Entendendo as oscilações do espectro bipolar',
    'Variações emocionais fazem parte da existência humana. No entanto, quando surgem fases de energia exacerbada, redução acentuada da necessidade de sono (sentir-se desperto dormindo apenas 2 ou 3 horas), pensamento acelerado e aumento de comportamentos impulsivos, pode se tratar de uma oscilação do espectro de humor bipolar.

### Aspectos essenciais:
1. **Preservação de rotina social e biológica:** Pessoas com propensão a oscilações de humor têm relógios biológicos sensíveis. Horários fixos de alimentação e sono agem como estabilizadores naturais.
2. **Cuidado com antidepressivos isolados:** Em quadros bipolares, tomar antidepressivos sem estabilizador de humor pode deflagrar crises de aceleração (virada hipomaníaca) ou agitação.
3. **Mapeamento de gatilhos:** Privação deliberada de sono, viagens longas com troca de fuso horário e estresse prolongado exigem acompanhamento médico vigilante.',
    'Orientações sobre ritmos circadianos, cuidados no uso de medicamentos e estabilidade no espectro bipolar.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;


  -- 7. Álcool e substâncias
  INSERT INTO public.psychoeducation_topics (slug, title, short_title, description, icon, sort_order)
  VALUES (
    'alcool-substancias',
    'Álcool e substâncias',
    'Álcool e Substâncias',
    'Abordagem humanizada, redução progressiva de danos e acolhimento em saúde sem julgamento moral.',
    'Wine',
    7
  ) ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, short_title = EXCLUDED.short_title
  RETURNING id INTO v_topic_id;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'resumo',
    'Cuidado integral no uso de substâncias',
    'O uso de álcool ou outras substâncias pode afetar o humor, o sono e a ansiedade. Reduzir o consumo já traz benefícios. Converse abertamente com seu médico — o objetivo é cuidar da sua saúde, sem julgamento.',
    'O consumo de substâncias interage intimamente com quadros de ansiedade e sono. A redução gradual de danos é sempre acolhida com sigilo e respeito.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'completo',
    'Redução de danos e saúde mental no uso de substâncias',
    'O consumo de álcool, tabaco ou outras substâncias frequentemente tem início como uma tentativa de aplacar angústias, ansiedade ou insônia. Contudo, com o tempo, o uso continuado altera a neuroquímica cerebral e aprofunda os próprios sintomas que se tentava aliviar.

### Princípios da Redução de Danos:
1. **Progresso acima da perfeição:** Não é necessário atingir abstinência imediata para experimentar melhoras na saúde. Cada redução de quantidade ou frequência é uma vitória protetora.
2. **Mapeie os contextos de risco:** Identifique horários, companhias e locais onde o consumo perde o controle planejado.
3. **Hidratação e alimentação prévia:** Nunca consuma álcool com o estômago vazio e intercale sempre copos de água.
4. **Espaço seguro na consulta médica:** Em nosso serviço, o diálogo sobre substâncias é conduzido sob sigilo ético absoluto, com foco científico em sua qualidade de vida e metas pessoais.',
    'Guia de redução de danos, relação entre substâncias e ansiedade e atendimento médico acolhedor.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;


  -- 8. Trauma e estresse pós-traumático
  INSERT INTO public.psychoeducation_topics (slug, title, short_title, description, icon, sort_order)
  VALUES (
    'trauma-tept',
    'Trauma e estresse pós-traumático',
    'Trauma e Segurança',
    'Processamento de eventos estressores graves, memórias intrusivas e caminhos de restabelecimento seguro.',
    'ShieldCheck',
    8
  ) ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, short_title = EXCLUDED.short_title
  RETURNING id INTO v_topic_id;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'resumo',
    'Superando o impacto de experiências traumáticas',
    'Experiências difíceis podem deixar marcas (lembranças invasivas, evitação, hipervigilância). Existem tratamentos eficazes. Você não precisa reviver tudo sozinho.',
    'Lembranças invasivas e estado contínuo de alerta são reações biológicas a traumas. Terapias especializadas ajudam a reprocessar essas memórias com segurança.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'completo',
    'Compreendendo o Transtorno de Estresse Pós-Traumático (TEPT)',
    'Eventos traumáticos — como acidentes graves, violência interpessoal, perdas abruptas ou situações de risco iminente — podem sobrecarregar o centro cerebral de memória (hipocampo) e medo (amígdala), fazendo com que o evento passado pareça estar acontecendo no tempo presente.

### Sintomas típicos e normatização:
- **Intrusão:** Flashbacks, pesadelos e imagens espontâneas angustiantes.
- **Evitação:** Esforço para não falar, pensar ou passar perto de locais que lembrem o fato.
- **Hiperativação:** Sobressaltos repentinos, irritabilidade e dificuldade severa para relaxar.

### Caminhos de cuidado baseado em evidências:
A psicoterapia com técnicas de TCC focada em trauma, EMDR e cuidados médicos coordenados demonstram excelentes índices de recuperação. O autocuidado começa por reestabelecer uma rotina de segurança pessoal e acolhimento por pessoas queridas.',
    'Orientações sobre processamento de traumas, redução da hipervigilância e psicoterapias com respaldo científico.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;


  -- 9. Burnout e esgotamento
  INSERT INTO public.psychoeducation_topics (slug, title, short_title, description, icon, sort_order)
  VALUES (
    'burnout-esgotamento',
    'Burnout e esgotamento',
    'Esgotamento e Trabalho',
    'Identificação do cansaço laboral crônico, despersonalização e reorganização saudável de limites.',
    'BatteryWarning',
    9
  ) ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, short_title = EXCLUDED.short_title
  RETURNING id INTO v_topic_id;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'resumo',
    'Reconhecendo o esgotamento no trabalho',
    'Esgotamento emocional, cinismo e sensação de ineficácia são sinais de burnout. Pausas reais, limites claros e conversa com alguém de confiança são o começo. Seu médico pode ajudar a avaliar o quadro completo.',
    'O esgotamento profissional crônico não se resolve apenas com descanso de fim de semana. É necessária reestruturação de limites e suporte clínico.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'completo',
    'Dimensões do Burnout e restauração de energia',
    'O Burnout não é um simples cansaço passageiro; é uma resposta prolongada ao estresse crônico no ambiente de trabalho ou de cuidados a terceiros, estruturado em três dimensões:
1. **Exaustão emocional:** Esvaziamento de recursos físicos e mentais logo no início do dia.
2. **Despersonalização / Cinismo:** Atitude de distanciamento, frieza ou irritação com colegas e clientes.
3. **Baixa realização pessoal:** Sensação de que o esforço é inútil ou insuficiente.

### Medidas práticas de recuperação:
- **Desconexão digital real:** Não responda e-mails ou mensagens de trabalho fora da jornada contratada.
- **Resgate de atividades com sentido:** Pratique hobbies desvinculados de metas de produtividade.
- **Suporte médico e laboral:** Quando a exaustão atinge níveis incapacitantes, licenças médicas orientadas e psicoterapia são passos clínicos indispensáveis.',
    'Guia sobre as 3 dimensões do burnout, limites profissionais e recuperação de energia vital.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;


  -- 10. Bem-estar e prevenção + Saúde mental no envelhecimento
  INSERT INTO public.psychoeducation_topics (slug, title, short_title, description, icon, sort_order)
  VALUES (
    'bem-estar-prevencao',
    'Bem-estar e prevenção na vida e no envelhecimento',
    'Bem-estar e Longevidade',
    'Hábitos protetores, manutenção de propósito, conexões afetivas e saúde mental na maturidade e velhice.',
    'Sparkles',
    10
  ) ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, short_title = EXCLUDED.short_title
  RETURNING id INTO v_topic_id;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'resumo',
    'Hábitos fundamentais de bem-estar',
    'Pequenos hábitos diários protegem a saúde mental: sono regular, movimento, conexão social e limitação de redes sociais. Na terceira idade, manter vínculos e propósito é especialmente importante.',
    'A saúde mental se cultiva em pequenos atos diários de conexão, sono e movimento. O envelhecimento pleno apoia-se em manter autonomia e vínculos significativos.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf)
  VALUES (
    v_topic_id,
    'v1',
    'completo',
    'Saúde mental integral, longevidade e envelhecimento com dignidade',
    'A saúde mental é uma construção dinâmica diária e não uma ausência passiva de sintomas. Ao longo de todo o ciclo de vida — e muito especialmente na maturidade e na velhice — a preservação de vínculos afetivos autênticos e de um sentido pessoal são os maiores protetores cerebrais conhecidos pela neurociência e pela psicodinâmica.

### Pilares Universais de Proteção Psíquica:
1. **Movimento regular:** Atividade aeróbica ou caminhadas leves estimulam o BDNF (fator neurotrófico derivado do cérebro), atuando como um antidepressivo natural.
2. **Conexão humana presencial:** Conversas significativas liberam ocitocina e regulam o eixo de estresse corporal.
3. **Cultivo de propósito:** Ter projetos pessoais — desde plantar, estudar um novo assunto ou orientar outras gerações — mantém a plasticidade mental ativa.

### A Psicodinâmica do Envelhecimento Humano:
Como nos ensinam os estudos sobre longevidade e saúde mental do idoso, o avançar da idade traz singularidade, sabedoria acumulada e capacidade de ressignificação. O envelhecer **não** deve ser igualado a decadência ou perda de valor social. Manter a escuta ativa, o respeito à autonomia e o cuidado preventivo de rotina permite que cada fase da vida seja vivida com dignidade, vitalidade e alegria.',
    'Reflexões sobre longevidade ativa, neurociência dos hábitos de bem-estar e psicodinâmica do envelhecimento.'
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;

END $$;
