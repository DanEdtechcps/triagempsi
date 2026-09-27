-- ====================================================================
-- NOVOS TÓPICOS DE PSICOEDUCAÇÃO — material do Dr. Saraiva (rascunho)
-- ====================================================================
-- Origem: 29 documentos convertidos de PDF→Markdown em
-- data/saraiva-material/oms-e-evidencias/ (guias da OMS/UNICEF, manual de
-- treinamento de cuidadores CST, evidência acadêmica de grupoterapia/TCI +
-- material autoral do próprio Dr. Saraiva sobre Terapia Comunitária
-- Integrativa). Conteúdo digerido por 3 agentes de pesquisa em paralelo
-- (nunca lido em bruto por um humano ou por uma única passada de IA) e
-- redigido em linguagem de paciente a partir desses resumos.
--
-- RASCUNHO — is_active/is_published = false até revisão humana explícita.
-- Nada aqui fica visível a paciente algum até alguém marcar como
-- publicado. Ver documentação viva/ pra detalhes da pesquisa que embasou.
--
-- Nota de licença: parte do material-fonte (Caregiver Skills Training da
-- OMS/UNICEF/Autism Speaks) é CC BY-NC-SA 3.0 IGO — uso não-comercial com
-- atribuição. Nenhum texto foi copiado literalmente (tudo parafraseado em
-- linguagem própria), mas isso deve ser levado em conta antes de decidir
-- publicar em uma plataforma paga.
-- ====================================================================

DO $$
DECLARE
  v_topic_id uuid;
BEGIN

  -- 11. Grupos de Apoio e Terapia Comunitária
  INSERT INTO public.psychoeducation_topics (slug, title, short_title, description, icon, sort_order, is_active)
  VALUES (
    'grupos-apoio-terapia-comunitaria',
    'Grupos de Apoio e Terapia Comunitária',
    'Terapia em Grupo',
    'Como funcionam as rodas de conversa e a terapia em grupo, e por que a ciência mostra que elas ajudam.',
    'Users',
    11,
    false  -- RASCUNHO: ativar só após revisão humana
  ) ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, short_title = EXCLUDED.short_title
  RETURNING id INTO v_topic_id;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf, is_published)
  VALUES (
    v_topic_id,
    'v1',
    'resumo',
    'Terapia em grupo e rodas de conversa: como funcionam',
    'Você já ouviu falar em "terapia em grupo" ou em "rodas de conversa" e ficou com dúvida sobre como isso funciona na prática? A ideia é simples: um pequeno grupo de pessoas se reúne, com a mediação de um profissional de saúde, para compartilhar experiências parecidas — seja tristeza, ansiedade, uma doença crônica ou dificuldades do dia a dia.

Diferente do que muita gente imagina, ninguém é obrigado a falar, e o sigilo do que é dito ali é uma regra combinada desde o início. Pesquisas mostram que participar de grupos assim pode reduzir sintomas de depressão e ansiedade, diminuir a sensação de isolamento e ajudar a encontrar caminhos práticos para lidar com problemas — muitas vezes com resultados parecidos aos de um acompanhamento individual, especialmente logo após o término do grupo. É uma abordagem já usada há décadas na saúde pública brasileira, inclusive dentro do SUS.',
    'A terapia em grupo reúne pessoas com experiências parecidas, mediadas por um profissional, com sigilo garantido. Reduz isolamento e ajuda com sintomas leves a moderados de ansiedade e depressão.',
    false
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf, is_published)
  VALUES (
    v_topic_id,
    'v1',
    'completo',
    'Terapia Comunitária Integrativa e grupoterapia: o que esperar e o que a evidência mostra',
    '## O que é uma roda de terapia em grupo

Uma sessão de terapia em grupo — muitas vezes chamada de "roda" quando segue o modelo da Terapia Comunitária Integrativa (TCI) — costuma seguir uma estrutura simples: acolhimento e combinação de regras (sigilo, respeito, ninguém obrigado a falar), escolha de um tema a partir de relatos breves de cada participante, aprofundamento do tema com perguntas do grupo, um momento em que outros participantes contam como lidaram com situações parecidas, e um encerramento que reconhece a participação de todos.

A Terapia Comunitária Integrativa foi criada no Brasil por Adalberto de Paula Barreto e, desde 2010, faz parte da Política Nacional de Práticas Integrativas e Complementares do Ministério da Saúde — já formou dezenas de milhares de terapeutas comunitários no país.

## Regras básicas que tornam o espaço seguro

- Sigilo: o que é dito na roda não sai dali.
- Ninguém é obrigado a falar — pode-se apenas escutar.
- Fala-se sempre em primeira pessoa, sem dar conselhos aos outros.
- Não há julgamento sobre o que é compartilhado.

## O que a ciência diz

Estudos mostram eficácia moderada a robusta da terapia em grupo para depressão, ansiedade e sofrimento emocional, com melhores resultados em terapia cognitivo-comportamental em grupo, grupos psicoeducativos e terapia interpessoal em grupo. O efeito costuma ser mais forte logo depois que o grupo termina, podendo ser importante manter algum acompanhamento depois. Como qualquer abordagem, nem todo mundo se beneficia da mesma forma — participação irregular e desistência ao longo do tempo são desafios reais e conhecidos.

## Medos comuns antes da primeira sessão

É normal sentir vergonha ou medo de ser julgado antes de participar de um grupo pela primeira vez — muitas pessoas relatam esse receio, e é especialmente comum sentir-se mais reservado no início. Isso não impede a participação: ninguém é forçado a falar, e o ambiente é construído justamente para reduzir esse desconforto aos poucos.

## Como buscar um grupo

Grupos de apoio e de Terapia Comunitária Integrativa costumam estar disponíveis em Unidades Básicas de Saúde, CAPS (Centros de Atenção Psicossocial) e associações comunitárias. Pergunte ao seu profissional de saúde se há um grupo disponível na sua região.',
    'A Terapia Comunitária Integrativa (criada por Adalberto de Paula Barreto, parte da política do SUS) segue uma estrutura de acolhimento, escolha de tema, aprofundamento e encerramento, sempre com sigilo. Evidência científica mostra bons resultados para depressão e ansiedade leves a moderadas.',
    false
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;


  -- 12. Cuidando de quem cuida
  INSERT INTO public.psychoeducation_topics (slug, title, short_title, description, icon, sort_order, is_active)
  VALUES (
    'cuidando-de-quem-cuida',
    'Cuidando de quem cuida',
    'Apoio ao Cuidador',
    'Orientações práticas para cuidadores de crianças e adolescentes com necessidades de desenvolvimento, e por que cuidar de si também importa.',
    'HeartHandshake',
    12,
    false  -- RASCUNHO: ativar só após revisão humana
  ) ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, short_title = EXCLUDED.short_title
  RETURNING id INTO v_topic_id;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf, is_published)
  VALUES (
    v_topic_id,
    'v1',
    'resumo',
    'Cuidando de quem cuida: por que sua saúde mental também importa',
    'Cuidar de uma criança ou adolescente que precisa de mais atenção — seja por um atraso no desenvolvimento, dificuldade de comunicação ou um momento difícil — é uma tarefa que exige paciência e, muitas vezes, deixa o cuidador exausto.

A própria Organização Mundial da Saúde reconhece que cuidar da sua saúde mental como cuidador não é luxo, é parte do cuidado que você oferece: quando você está bem, a criança sob seus cuidados também tende a se desenvolver melhor. Dormir, comer, manter uma amizade, pedir ajuda e aceitar que a situação é difícil — sem se culpar — são atitudes que protegem tanto você quanto quem você cuida. Se o cansaço, a tristeza ou a irritação estão te dominando, isso é um sinal para buscar apoio, não uma falha sua.',
    'Cuidar de alguém que precisa de mais atenção pesa. A OMS reconhece que a saúde mental do cuidador é parte do cuidado — dormir, comer, ter apoio e pedir ajuda protegem você e quem você cuida.',
    false
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;

  INSERT INTO public.psychoeducation_contents (topic_id, version, level, title, body_md, summary_pdf, is_published)
  VALUES (
    v_topic_id,
    'v1',
    'completo',
    'Guia prático para cuidadores: comunicação, rotina e autocuidado',
    '## Conectando-se com a criança no dia a dia

- **Entre no mundo dela**: observe do que a criança gosta e participe da brincadeira dela, em vez de impor uma atividade.
- **Fique de frente e na altura da criança**: isso ajuda a criança a perceber que você está presente e disponível.
- **Responda a qualquer tentativa de comunicação**, mesmo que não seja clara — um olhar, um gesto, uma palavra — e dê tempo para a criança tentar se expressar antes de resolver por ela.
- **Elogie na hora**: quando a criança faz algo bom ou tenta se comunicar, reagir na hora com atenção e um sorriso ensina mais rápido do que corrigir o que ela faz errado.
- **Ensine em pequenos passos**: divida tarefas do dia a dia (vestir-se, escovar os dentes) em etapas bem pequenas, ajudando só o necessário.

## Reconhecendo sinais antes de uma crise

Perceber cedo que a criança está começando a ficar incomodada — antes de uma crise se instalar — ajuda muito. Sinais de que algo está incomodando costumam aparecer antes da crise em si; organizar o ambiente e avisar com antecedência sobre trocas de atividade ajuda a evitar que a situação se agrave. Se uma crise acontecer, mantenha a calma e espere a criança se acalmar antes de agir — só depois disso vale pensar no que motivou aquele comportamento.

## Cuidando de você

- Durma e alimente-se bem sempre que possível.
- Mantenha alguma atividade que te dá prazer, mesmo que pequena.
- Mantenha contato social — cuidar de si não é egoísmo, é parte de cuidar bem do outro.
- Cuidadores de crianças com necessidades de desenvolvimento costumam ter mais dificuldade de acesso a apoio, principalmente quando também enfrentam dificuldades financeiras — se essa é a sua realidade, o cansaço que você sente tem explicação, não é uma falha sua.
- Pedir ajuda — da família, de grupos de apoio, de profissionais de saúde — é parte de cuidar bem: cuidadores com rede de apoio enfrentam menos sobrecarga.

## Resolvendo problemas do dia a dia, passo a passo

1. Escolha um problema real e atual sobre o qual você tem algum controle.
2. Liste o máximo de soluções possíveis, sem julgar nenhuma delas ainda.
3. Elimine as que não são viáveis.
4. Pense nos prós e contras das que sobraram.
5. Escolha uma e monte um plano bem específico.

## Quando buscar ajuda

Se cuidar de alguém está te deixando esgotado(a), triste demais ou sem esperança, isso também merece cuidado profissional — procurar ajuda para você é tão importante quanto cuidar do outro. Em caso de sofrimento intenso, ligue para o CVV 188 (gratuito, 24h) ou o SAMU 192.',
    'Guia prático de comunicação com a criança, reconhecimento de sinais antes de uma crise, e autocuidado do cuidador — incluindo quando e como buscar ajuda profissional.',
    false
  ) ON CONFLICT (topic_id, version, level) DO NOTHING;

END $$;
