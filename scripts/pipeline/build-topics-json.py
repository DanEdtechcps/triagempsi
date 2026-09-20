#!/usr/bin/env python3
import json
from pathlib import Path

topics = [
  {
    "slug": "insonia-sono",
    "title": "Insônia e Higiene do Sono — TCC-I na Prática",
    "short_title": "Insônia & TCC-I",
    "description": "Compreensão psicodinâmica do sono, abordagem TCC-I e redução segura de hipnóticos conforme protocolo clínico.",
    "icon": "moon",
    "sort_order": 1,
    "contents": [
      {
        "version": "v1",
        "level": "resumo",
        "title": "Por que você não consegue dormir — e o que a ciência diz",
        "body_md": (
          "A insônia crônica afeta 30% dos adultos brasileiros e é a queixa mais comum associada "
          "ao uso prolongado de benzodiazepínicos. A Terapia Cognitivo-Comportamental para Insônia (TCC-I) "
          "é reconhecida pela Sociedade Brasileira de Sono como tratamento de primeira linha — superior à medicação a longo prazo.\n\n"
          "Pontos-chave:\n"
          "- Insônia crônica: dificuldade para iniciar ou manter o sono por pelo menos 3 noites por semana há mais de 3 meses com prejuízo diurno.\n"
          "- O ciclo de manutenção: ansiedade antecipatória gera hiperativação cortical, sono fragmentado e mais ansiedade.\n"
          "- TCC-I atua nas crenças disfuncionais e nos hábitos que perpetuam o ciclo.\n"
          "- O uso de hipnóticos sem acompanhamento causa dependência em poucas semanas."
        ),
        "video_urls": [],
        "external_links": ["https://absono.com.br"]
      },
      {
        "version": "v1",
        "level": "completo",
        "title": "TCC-I Completo: Protocolo de 6 Semanas e Desmame Seguro de Benzodiazepínicos",
        "body_md": (
          "## Fisiopatologia da Insônia Crônica\n\n"
          "O modelo de Espie (3P) explica a insônia por três fatores:\n"
          "1. Predisponentes: hiperativação do eixo HPA, traço ansioso e neuroticismo.\n"
          "2. Precipitantes: luto, aposentadoria, estresse agudo e comorbidades clínicas.\n"
          "3. Perpetuantes: crenças catastrofizantes ('preciso de 8h para funcionar') e uso crônico de hipnóticos.\n\n"
          "## Protocolo TCC-I — Pilares Clínicos\n\n"
          "1. Controle de Estímulos: cama apenas para sono e sexo; levantar em 20 minutos se não dormir; horário fixo de despertar.\n"
          "2. Restrição do Sono: limitar o tempo na cama ao tempo real médio de sono para elevar a pressão homeostática.\n"
          "3. Higiene do Sono: evitar cafeína após as 14h, cessar telas 1h antes de deitar e manter quarto escuro e fresco.\n"
          "4. Relaxamento: técnica de respiração diafragmática 4-7-8 e relaxamento progressivo de Jacobson.\n\n"
          "## Desmame de Benzodiazepínicos no Idoso (Saraiva & Diehl, 2014)\n"
          "Redução lenta de 10-25% a cada 1 a 2 semanas, com substituição gradual por higiene do sono e acompanhamento multiprofissional. "
          "Nunca suspender abruptamente devido ao risco de crises convulsivas e rebote."
        ),
        "external_links": ["https://www.sbsono.com.br"]
      },
      {
        "version": "v1",
        "level": "crise",
        "title": "Insônia em Crise — Ações Imediatas",
        "body_md": (
          "Se você estiver há mais de 48 horas sem dormir significativamente ou com sintomas alucinatórios, busque atendimento médico.\n\n"
          "1. Saia da cama e vá para um ambiente calmo com luz baixa.\n"
          "2. Pratique 10 ciclos de respiração lenta: inspire em 4s e expire em 6s.\n"
          "3. Não force o sono nem olhe o relógio repetidamente.\n"
          "4. Se houver angústia aguda, disque CVV 188 para acolhimento sigiloso."
        )
      }
    ]
  },
  {
    "slug": "alcool-substancias",
    "title": "Álcool, Substâncias e Redução de Danos — Especialmente no Idoso",
    "short_title": "Álcool & Substâncias",
    "description": "Reconhecimento do uso problemático, farmacocinética do envelhecimento, intervenção breve FRAMES e redução de danos sem confrontação.",
    "icon": "shield",
    "sort_order": 2,
    "contents": [
      {
        "version": "v1",
        "level": "resumo",
        "title": "O uísque das seis da tarde — quando a rotina esconde o risco",
        "body_md": (
          "O caso autoral do Dr. Saraiva (Berthier, 2014) ilustra o padrão clássico do idoso que consome a mesma dose há décadas, "
          "mas passa a apresentar quedas repetidas e lapsos de memória devido às alterações fisiológicas do envelhecimento.\n\n"
          "No idoso, a menor proporção de água corporal e o metabolismo hepático reduzido aumentam a concentração de álcool no sangue. "
          "O rastreio deve ser feito de forma acolhedora com AUDIT-C sem confrontações agressivas."
        ),
        "video_urls": [],
        "external_links": []
      },
      {
        "version": "v1",
        "level": "completo",
        "title": "Protocolo FRAMES de Intervenção Breve e Manejo Hospitalar",
        "body_md": (
          "## Intervenção Breve (FRAMES da OMS)\n"
          "- Feedback: apresentação clara dos riscos individuais baseados no AUDIT-C.\n"
          "- Responsabilidade: reforço de que a decisão da mudança cabe ao paciente.\n"
          "- Advice: recomendação médica expressa de redução do consumo.\n"
          "- Menu: opções variadas de estratégias (redução, abstinência temporária, CAPS-AD).\n"
          "- Empathy: escuta ativa e validação emocional sem julgamentos morais.\n"
          "- Self-efficacy: fortalecimento da autoconfiança para alcançar metas.\n\n"
          "## Síndrome de Ekbom por Estimulantes (Saraiva Jr et al., 2015)\n"
          "Manejo do delírio parasitário induzido por cocaína: não confrontar o delírio, cessar o uso do estimulante e usar antipsicótico em baixa dose.\n\n"
          "## Prevenção de Delirium Tremens\n"
          "Rastreio obrigatório do consumo de álcool na admissão hospitalar. Tratamento protocolado com benzodiazepínicos e reposição de tiamina EV precoce."
        ),
        "external_links": ["https://www.caminhos-cps.social"]
      },
      {
        "version": "v1",
        "level": "crise",
        "title": "Crise Aguda por Substâncias — Quando Chamar o SAMU",
        "body_md": (
          "Se houver tremores intensos, convulsões, febre alta com confusão ou alucinações visuais (zoopsias), "
          "ligue 192 (SAMU) imediatamente. Delirium Tremens é uma emergência com risco à vida.\n\n"
          "Mantenha o paciente em local seguro, iluminado e protegido de quedas até a chegada do socorro."
        )
      }
    ]
  },
  {
    "slug": "transtorno-bipolar",
    "title": "Transtorno Bipolar — Reconhecendo Mania, Hipomania e Depressão",
    "short_title": "Bipolar & Humor",
    "description": "Diferenciação entre mania e hipomania, armadilhas diagnósticas e por que o antidepressivo isolado pode induzir virada.",
    "icon": "activity",
    "sort_order": 3,
    "contents": [
      {
        "version": "v1",
        "level": "resumo",
        "title": "Euforia que preocupa — quando a aceleração é sintoma",
        "body_md": (
          "O transtorno bipolar afeta 2-4% da população e é frequentemente confundido com depressão unipolar, "
          "o que leva ao erro comum de prescrição de antidepressivo em monoterapia, induzindo viradas maníacas e ciclagem rápida.\n\n"
          "Mania se caracteriza por período de pelo menos 7 dias de humor exaltado ou irritável, redução drástica da necessidade de sono "
          "e prejuízo funcional evidente com gastos descontrolados."
        ),
        "video_urls": [],
        "external_links": []
      },
      {
        "version": "v1",
        "level": "completo",
        "title": "Diagnóstico Diferencial e Estabilizadores do Humor",
        "body_md": (
          "## Mania vs. Hipomania\n"
          "A distinção central reside na gravidade do impacto funcional e na presença de psicose ou necessidade de internação, "
          "presentes na mania e ausentes na hipomania.\n\n"
          "## Farmacoterapia Racional (Saraiva Jr · Corte 800)\n"
          "O padrão-ouro na fase aguda e profilaxia é o Carbonato de Lítio em monoterapia, com monitoramento periódico de litemia, "
          "função renal e tireoidiana. Antidepressivos ISRS isolados são expressamente contraindicados."
        ),
        "external_links": []
      },
      {
        "version": "v1",
        "level": "crise",
        "title": "Crise Maníaca com Risco Iminente",
        "body_md": (
          "Em episódios de descontrole psicomotor, delírios de grandeza ou gastos ruinantes:\n"
          "1. Reduza estímulos ambientais e evite confrontação verbal direta.\n"
          "2. Contate o psiquiatra de referência ou acione o SAMU 192.\n"
          "3. Remova meios financeiros e chaves de veículos preventivamente."
        )
      }
    ]
  },
  {
    "slug": "risco-suicidio-seguranca",
    "title": "Risco de Suicídio — Acolhimento e Plano de Segurança",
    "short_title": "Risco & Segurança",
    "description": "Reconhecimento de ideação suicida, aplicação do C-SSRS em linguagem acessível e elaboração de plano de segurança.",
    "icon": "heart",
    "sort_order": 4,
    "contents": [
      {
        "version": "v1",
        "level": "resumo",
        "title": "Falar sobre ideação suicida salva vidas",
        "body_md": (
          "Perguntar sobre pensamentos de morte de forma respeitosa e direta não induz o ato; ao contrário, valida a dor "
          "e abre caminho para a intervenção protetiva. Fique atento a despedidas atípicas, desesperança persistente e cessação súbita de afeto."
        ),
        "video_urls": [],
        "external_links": ["https://cvv.org.br"]
      },
      {
        "version": "v1",
        "level": "completo",
        "title": "Plano de Segurança Estruturado — Modelo Stanley-Brown",
        "body_md": (
          "O Plano de Segurança consiste em 6 etapas pactuadas com o paciente:\n"
          "1. Reconhecimento de gatilhos e sinais de crise.\n"
          "2. Estratégias internas de alívio emocional autônomo.\n"
          "3. Contatos sociais para distração segura.\n"
          "4. Rede de apoio íntima (familiares e amigos para pedido explícito de socorro).\n"
          "5. Profissionais e serviços de emergência (SAMU 192, CAPS, CVV 188).\n"
          "6. Restrição ativa de meios letais no ambiente domiciliar."
        ),
        "external_links": ["https://cvv.org.br"]
      },
      {
        "version": "v1",
        "level": "crise",
        "title": "Crise Suicida Imediata — Socorro 24 Horas",
        "body_md": (
          "Não fique sozinho sob ideação ativa com planejamento.\n"
          "Ligue 192 (SAMU) ou dirija-se imediatamente à emergência mais próxima.\n"
          "Ligue 188 (CVV) para acolhimento confidencial gratuito 24 horas por dia."
        )
      }
    ]
  },
  {
    "slug": "ansiedade-panico",
    "title": "Ansiedade e Transtorno do Pânico — Da Crise ao Controle",
    "short_title": "Ansiedade & Pânico",
    "description": "Modelo cognitivo do pânico, técnicas TCC de regulação interoceptiva e indicação farmacológica baseada em evidências.",
    "icon": "zap",
    "sort_order": 5,
    "contents": [
      {
        "version": "v1",
        "level": "resumo",
        "title": "O ciclo do medo — compreendendo a crise de pânico",
        "body_md": (
          "O ataque de pânico atinge o ápice em menos de 10 minutos com taquicardia, sudorese e sensação de sufocamento. "
          "O modelo de Clark demonstra que a interpretação catastrófica de sensações físicas benignas alimenta o ciclo ansiogênico."
        ),
        "video_urls": [],
        "external_links": []
      },
      {
        "version": "v1",
        "level": "completo",
        "title": "Técnicas de Desescalada e Farmacoterapia",
        "body_md": (
          "## Técnicas TCC\n"
          "- Respiração diafragmática pausada (técnica 4-7-8).\n"
          "- Técnica de aterramento 5-4-3-2-1 para ancoragem sensorial imediata.\n"
          "- Reestruturação cognitiva desfazendo a ilusão de morte iminente.\n\n"
          "## Farmacologia\n"
          "ISRS (Sertralina, Escitalopram) constituem a 1ª linha. Benzodiazepínicos devem ser restritos a curto prazo."
        ),
        "external_links": []
      },
      {
        "version": "v1",
        "level": "crise",
        "title": "Durante a Crise de Pânico",
        "body_md": (
          "1. Sente-se e apoie os pés firmes no chão.\n"
          "2. Respire contando 4 segundos para inspirar e 6 para expirar.\n"
          "3. Descreva 5 objetos ao redor em voz alta.\n"
          "4. Lembre-se: o pico da crise dura poucos minutos e não causa morte física."
        )
      }
    ]
  },
  {
    "slug": "depressao-saude-mental",
    "title": "Depressão — Muito Além da Tristeza",
    "short_title": "Depressão",
    "description": "Diagnóstico diferencial, PHQ-9 interpretado, especificidades na terceira idade e tratamento integrativo.",
    "icon": "cloud",
    "sort_order": 6,
    "contents": [
      {
        "version": "v1",
        "level": "resumo",
        "title": "Identificando a depressão na prática clínica",
        "body_md": (
          "A depressão maior caracteriza-se por anedonia, lentificação psicomotora e fadiga persistente por mais de duas semanas. "
          "Na pesquisa do Dr. Saraiva na atenção básica (RECHHC, 2022), 56% dos pacientes avaliados apresentavam sintomas depressivos relevantes."
        ),
        "video_urls": [],
        "external_links": []
      },
      {
        "version": "v1",
        "level": "completo",
        "title": "Rastreio e Linhas Terapêuticas",
        "body_md": (
          "Aplicação seriada do PHQ-9 orienta a decisão clínica:\n"
          "- Ativação comportamental progressiva com reinserção social.\n"
          "- ISRS/IRSN mantidos por 6 a 12 meses após remissão clínica completa.\n"
          "- Atenção especial a apresentações somatizadas na terceira idade (dores crônicas sem causa orgânica)."
        ),
        "external_links": []
      },
      {
        "version": "v1",
        "level": "crise",
        "title": "Depressão Grave com Desesperança",
        "body_md": (
          "Se o desânimo paralisar o autocuidado básico ou houver pensamentos de morte, procure a Unidade Básica de Saúde ou CAPS. "
          "Disque 188 (CVV) para escuta acolhedora a qualquer momento."
        )
      }
    ]
  },
  {
    "slug": "tdah-adulto",
    "title": "TDAH no Adulto — Além da Criança Agitada",
    "short_title": "TDAH Adulto",
    "description": "Reconhecimento do TDAH em adultos com ASRS-18, desregulação executiva e intervenções práticas.",
    "icon": "cpu",
    "sort_order": 7,
    "contents": [
      {
        "version": "v1",
        "level": "resumo",
        "title": "Desatenção e impulsividade no cotidiano adulto",
        "body_md": (
          "Em adultos, o TDAH manifesta-se menos como hiperatividade física e mais como inquietude mental, desorganização crônica, "
          "procrastinação severa e alternância entre paralisia e hiperfoco desordenado."
        ),
        "video_urls": [],
        "external_links": []
      },
      {
        "version": "v1",
        "level": "completo",
        "title": "Intervenções Multimodais para Funções Executivas",
        "body_md": (
          "O tratamento eficaz associa psicoestimulantes a adaptações ambientais concretas:\n"
          "- Externalização da memória de trabalho com agendas visuais e blocos Pomodoro.\n"
          "- Estruturação de rotinas com baixo ruído de distração.\n"
          "- Treinamento em habilidades cognitivas focais."
        ),
        "external_links": []
      },
      {
        "version": "v1",
        "level": "crise",
        "title": "Paralisia por Sobrecarga de Tarefas",
        "body_md": (
          "Diante do colapso por excesso de estímulos:\n"
          "1. Pare e anote em papel apenas uma micro-tarefa de 5 minutos.\n"
          "2. Isole-se de notificações digitais temporariamente.\n"
          "3. Respire e execute apenas o primeiro passo motor."
        )
      }
    ]
  },
  {
    "slug": "bem-estar-envelhecimento",
    "title": "Envelhecimento Saudável — Psicodinâmica e Saúde Mental na Terceira Idade",
    "short_title": "Envelhecimento",
    "description": "Baseado na dissertação de mestrado do Dr. Saraiva (UPF 2017) sobre a compreensão psicodinâmica do idoso.",
    "icon": "sun",
    "sort_order": 8,
    "contents": [
      {
        "version": "v1",
        "level": "resumo",
        "title": "A clínica psicodinâmica do envelhecimento",
        "body_md": (
          "A dissertação UPF 2017 do Dr. Saraiva comprova que o envelhecimento requer elaboração contínua de lutos "
          "(do corpo jovem, de papéis ocupacionais e de pares afetivos) e reinvestimento psíquico em novos laços vitais."
        ),
        "video_urls": [],
        "external_links": []
      },
      {
        "version": "v1",
        "level": "completo",
        "title": "Rastreio e Preservação Cognitiva",
        "body_md": (
          "- Aplicação regular de GDS-15 e teste AD-8 para detecção precoce de demência e depressão.\n"
          "- Combate vigoroso ao etarismo clínico ('é próprio da velhice').\n"
          "- Preservação da autonomia e incentivo à convivência intergeracional."
        ),
        "external_links": []
      },
      {
        "version": "v1",
        "level": "crise",
        "title": "Desorientação Aguda no Idoso",
        "body_md": (
          "Confusão mental súbita ou agitação noturna recente indica Delirium de causa orgânica (infecções, intoxicações ou desidratação). "
          "Encaminhe com urgência a um serviço hospitalar."
        )
      }
    ]
  },
  {
    "slug": "estresse-burnout",
    "title": "Estresse Ocupacional e Burnout — Reconhecendo o Esgotamento",
    "short_title": "Burnout",
    "description": "Baseado na pesquisa RECHHC 2022 (300 pacientes, 84% de estresse) — identificação de exaustão e recuperação.",
    "icon": "flame",
    "sort_order": 9,
    "contents": [
      {
        "version": "v1",
        "level": "resumo",
        "title": "Exaustão emocional no trabalho",
        "body_md": (
          "O Burnout decorre de estresse crônico laboral não gerenciado e envolve exaustão, despersonalização e baixa realização. "
          "Na pesquisa do Dr. Saraiva (RECHHC, 2022), 84% dos atendidos na atenção básica relataram estresse acentuado."
        ),
        "video_urls": [],
        "external_links": []
      },
      {
        "version": "v1",
        "level": "completo",
        "title": "Manejo Clínico e Redefinição de Limites",
        "body_md": (
          "A intervenção exige afastamento do estressor nas fases graves, psicoterapia de resgate de valores "
          "e instituição de limites rígidos entre vida pessoal e demandas profissionais."
        ),
        "external_links": []
      },
      {
        "version": "v1",
        "level": "crise",
        "title": "Esgotamento Extremo com Crise de Pânico",
        "body_md": (
          "Se o estresse provocar colapso físico ou crise de choro incontrolável, interrompa as atividades imediatamente, "
          "busque acolhimento médico e ligue 188 (CVV) se houver desamparo emocional."
        )
      }
    ]
  },
  {
    "slug": "saude-mental-adolescente",
    "title": "Saúde Mental na Adolescência — Vulnerabilidade e Acolhimento",
    "short_title": "Saúde Mental Adolescente",
    "description": "Baseado na pesquisa UFRJ DESidades 2024 do Dr. Saraiva sobre racismo, desigualdade e sofrimento infantojuvenil.",
    "icon": "users",
    "sort_order": 10,
    "contents": [
      {
        "version": "v1",
        "level": "resumo",
        "title": "Sofrimento psíquico e determinantes sociais na juventude",
        "body_md": (
          "A pesquisa etnográfica do Dr. Saraiva (UFRJ, 2024) evidencia o impacto de violências estruturais e do racismo "
          "no adoecimento de adolescentes, manifestado frequentemente por isolamento, automutilação e irritabilidade."
        ),
        "video_urls": [],
        "external_links": ["https://revistas.ufrj.br/index.php/desidades"]
      },
      {
        "version": "v1",
        "level": "completo",
        "title": "Rede Intersetorial e Escuta Confidencial",
        "body_md": (
          "- Garantir espaço de consulta individual sem a presença dos pais para temas de autolesão e ideação.\n"
          "- Articulação integrada com escolas, CAPS Infantojuvenil e Conselho Tutelar quando necessário.\n"
          "- Validação e acolhimento sem discursos culpabilizantes."
        ),
        "external_links": []
      },
      {
        "version": "v1",
        "level": "crise",
        "title": "Autolesão Grave na Adolescência",
        "body_md": (
          "Em caso de ferimentos recentes ou ideação de morte explícita, busque atendimento de emergência pediátrica ou SAMU 192. "
          "Mantenha acompanhamento ininterrupto com postura serena."
        )
      }
    ]
  }
]

out_file = Path("/mnt/armazenamento/Projetos/triagem-medica/data/processed/psychoeducation_topics.json")
out_file.parent.mkdir(parents=True, exist_ok=True)
with open(out_file, "w", encoding="utf-8") as f:
    json.dump(topics, f, ensure_ascii=False, indent=2)

print(f"Sucesso: {len(topics)} tópicos gravados em {out_file}")
