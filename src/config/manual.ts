/**
 * Conteúdo do sistema de ajuda para médicos e do roadmap do projeto.
 * Fonte única usada pela versão online (painel) e pela geração de PDF.
 */

export type ManualBlock =
  | { kind: "p"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "steps"; items: string[] }
  | { kind: "table"; head: string[]; rows: string[][] }
  | { kind: "alert"; text: string };

export type ManualSection = {
  id: string;
  title: string;
  summary: string;
  blocks: ManualBlock[];
};

export const MANUAL_VERSION = "1.1 — Setembro/2026";

export const MANUAL_SECTIONS: ManualSection[] = [
  {
    id: "visao-geral",
    title: "1. Visão geral do sistema",
    summary:
      "O que a pré-triagem faz, o que ela não faz e como se encaixa na primeira consulta.",
    blocks: [
      {
        kind: "p",
        text: "A plataforma coleta, antes da consulta, dados estruturados de identificação, queixa principal e escalas psicométricas de domínio público. O objetivo é reduzir o tempo gasto com anamnese padronizada e chegar à consulta com hipóteses já organizadas.",
      },
      {
        kind: "list",
        items: [
          "Coleta: o paciente (ou familiar/responsável) responde por link público ou convite individual.",
          "Roteamento: a árvore de decisão indica quais escalas aplicar conforme idade e sintomas relatados.",
          "Escore: cálculo automático, faixa de gravidade e sinalização de risco.",
          "Entrega: relatório no painel, PDF clínico, PDF do paciente, e-mail de resultados básicos e aviso por WhatsApp.",
        ],
      },
      {
        kind: "alert",
        text: "A pré-triagem não produz diagnóstico. Todos os resultados são indicativos e exigem confirmação clínica presencial.",
      },
    ],
  },
  {
    id: "fluxo",
    title: "2. Fluxo de trabalho recomendado",
    summary: "Rotina diária sugerida para a equipe clínica.",
    blocks: [
      {
        kind: "steps",
        items: [
          "Abra o painel em “Triagens” no modo Fila de revisão.",
          "Use o atalho “Via de risco” para tratar primeiro os casos sinalizados.",
          "Abra a triagem, leia o resumo em linguagem clara e confira a trilha de decisão.",
          "Registre o parecer médico no campo próprio (fica na auditoria e no histórico).",
          "Marque como “Revisado” e siga para a próxima com o botão “Revisado e próxima”.",
          "Gere o PDF clínico para anexar ao prontuário, quando necessário.",
        ],
      },
      {
        kind: "p",
        text: "Filtros usados com frequência podem ser salvos em “Visualizações salvas” e recuperados em um clique.",
      },
    ],
  },
  {
    id: "risco",
    title: "3. Sinalizações de risco",
    summary: "Como o sistema marca risco e o que fazer em cada caso.",
    blocks: [
      {
        kind: "table",
        head: ["Sinalização", "Origem", "Conduta sugerida"],
        rows: [
          [
            "Via de risco",
            "Item de ideação/autolesão positivo (ex.: PHQ-9 item 9, ASQ)",
            "Contato ativo com o paciente no mesmo dia; avaliar necessidade de encaminhamento imediato",
          ],
          [
            "Faixa grave",
            "Escore acima do corte superior da escala",
            "Priorizar agendamento e revisar comorbidades",
          ],
          [
            "Atenção",
            "Faixa moderada em qualquer escala",
            "Avaliar na consulta; considerar reaplicação em 2–4 semanas",
          ],
        ],
      },
      {
        kind: "alert",
        text: "Em risco agudo, orientar CVV 188 (24h), SAMU 192 ou o serviço de urgência mais próximo. O sistema não substitui contato humano.",
      },
    ],
  },
  {
    id: "escalas",
    title: "4. Escalas disponíveis e quando são acionadas",
    summary: "Resumo do roteamento por idade e sintoma.",
    blocks: [
      {
        kind: "table",
        head: ["Escala", "Domínio", "Acionada quando"],
        rows: [
          ["PHQ-2 / PHQ-9", "Depressão", "Queixa de humor; PHQ-9 após PHQ-2 positivo (14+ anos)"],
          ["GAD-2 / GAD-7", "Ansiedade", "Queixa de ansiedade; GAD-7 após GAD-2 positivo"],
          ["ASQ", "Risco de suicídio", "Qualquer indício de ideação, em todas as faixas"],
          ["GDS-15", "Depressão no idoso", "60 anos ou mais com queixa de humor"],
          ["AUDIT / CAGE", "Álcool", "Queixa ou uso relatado de álcool"],
          ["ASSIST-Lite", "Substâncias (7 classes)", "Ramificação por substância (OMS); AUDIT após álcool ≥ 2; FTND após tabaco; PHQ-2 em alto risco"],
          ["PGSI", "Jogo/apostas", "Queixa de apostas, bets ou jogos"],
          ["OCI-R", "Obsessivo-compulsivo", "Queixa obsessiva, 14+ anos"],
          ["ASRS-18", "TDAH", "Queixa de desatenção/impulsividade em adultos"],
          ["SRQ-20 / GHQ-12", "Sofrimento geral", "Rastreio amplo quando a queixa é inespecífica"],
        ],
      },
      {
        kind: "p",
        text: "A página “Protocolo” traz o simulador interativo da árvore completa, e “Como interpretar” detalha pontos de corte de cada instrumento.",
      },
    ],
  },
  {
    id: "informante",
    title: "5. Quem preencheu: paciente ou familiar",
    summary: "Efeito do informante sobre a leitura dos escores.",
    blocks: [
      {
        kind: "p",
        text: "Toda triagem identifica se foi respondida pelo próprio paciente ou por familiar/responsável (com nome e grau de parentesco).",
      },
      {
        kind: "list",
        items: [
          "Escalas internalizantes (humor, ansiedade) respondidas por terceiros tendem a subnotificar sintomas.",
          "Nesses casos o sistema aplica uma margem de 1 ponto no ponto de corte e sinaliza o ajuste no relatório.",
          "Sempre confirme sintomas internalizantes diretamente com o paciente na consulta.",
        ],
      },
    ],
  },
  {
    id: "psicoeducacao",
    title: "6. Cockpit de Psicoeducação (Materiais)",
    summary: "Devolutiva estruturada e biblioteca clínica para o paciente.",
    blocks: [
      {
        kind: "p",
        text: "A página “Materiais” reúne 10 temas clínicos essenciais (humor, ansiedade, crise, sono, TDAH, oscilações de humor, substâncias, trauma, esgotamento e bem-estar), cada um com uma versão resumida para o paciente e uma versão completa de apoio técnico.",
      },
      {
        kind: "list",
        items: [
          "Busca em tempo real e filtros por tema ou tags clínicas.",
          "Leitura em modal com formatação médica, impressão e botão “Copiar para WhatsApp”.",
          "Materiais são sugeridos automaticamente conforme os escores da triagem (ex.: escore alto em ansiedade sugere o tema correspondente) e também podem ser liberados manualmente pelo profissional no prontuário.",
          "O paciente acompanha os materiais recebidos pelo Portal, e o médico vê no prontuário quais já foram lidos.",
        ],
      },
      {
        kind: "alert",
        text: "O tema “Crise emocional e ideação suicida” é sempre priorizado quando há sinal de risco, com os canais CVV 188 e SAMU 192 em destaque.",
      },
    ],
  },
  {
    id: "multi-clinica",
    title: "7. Múltiplas clínicas (para administração)",
    summary: "Como funciona o atendimento federado a mais de um consultório.",
    blocks: [
      {
        kind: "p",
        text: "A plataforma atende mais de uma clínica de forma isolada: cada consultório tem sua própria marca, cores, equipe e base de triagens, sem que uma clínica veja dados da outra.",
      },
      {
        kind: "list",
        items: [
          "Médicos e equipe só enxergam a clínica à qual estão vinculados.",
          "O Administrador Geral da plataforma tem um seletor de clínica (“TenantSwitcher”) no topo do painel, permitindo alternar entre “Todas as Clínicas” (visão consolidada) e cada consultório individualmente.",
          "Cada clínica tem seu próprio link público de triagem (ex.: “/saraiva/triagem”, “/lumina/triagem”).",
        ],
      },
    ],
  },
  {
    id: "painel",
    title: "8. Recursos do painel",
    summary: "Onde encontrar cada função.",
    blocks: [
      {
        kind: "table",
        head: ["Área", "Para que serve"],
        rows: [
          ["Triagens", "Fila de revisão, filtros, busca, ordenação, paginação e PDFs"],
          ["Protocolo", "Árvore de decisão e simulador de roteamento"],
          ["Como interpretar", "Pontos de corte, faixas e leitura clínica"],
          ["Contatos", "Cadastro e envio de convites por WhatsApp"],
          ["E-mails", "Status de entrega, pré-visualização e reenvio"],
          ["Auditoria", "Quem acessou, alterou ou enviou, e quando"],
          ["Materiais", "Cockpit de Psicoeducação — biblioteca clínica para o paciente e a equipe"],
          ["Ajuda", "Este manual, online e em PDF"],
        ],
      },
    ],
  },
  {
    id: "privacidade",
    title: "9. Privacidade e LGPD",
    summary: "Boas práticas obrigatórias no uso dos dados.",
    blocks: [
      {
        kind: "list",
        items: [
          "O consentimento LGPD é registrado com data/hora antes do início do questionário.",
          "O acesso é isolado por clínica; cada profissional vê apenas as triagens da sua unidade.",
          "Toda leitura de detalhe, parecer e envio fica registrado na auditoria.",
          "Não compartilhe PDFs clínicos por canais não seguros; use o prontuário da instituição.",
        ],
      },
    ],
  },
  {
    id: "problemas",
    title: "10. Problemas comuns",
    summary: "Soluções rápidas antes de acionar o suporte.",
    blocks: [
      {
        kind: "table",
        head: ["Situação", "O que fazer"],
        rows: [
          ["Paciente não recebeu o link", "Reenvie por WhatsApp na tela de Contatos ou na triagem"],
          ["Link expirado", "Convites valem 30 dias; gere um novo convite"],
          ["E-mail não chegou", "Verifique o status na aba E-mails e use “Reenviar”"],
          ["Triagem incompleta", "O paciente pode reabrir o link enquanto o convite estiver válido"],
          ["Esqueci a senha", "Use “Esqueci minha senha” na tela de acesso"],
        ],
      },
    ],
  },
];

/* ------------------------------- Roadmap -------------------------------- */

export type RoadmapStatus = "pronto" | "andamento" | "planejado" | "ideia";

export type RoadmapItem = {
  title: string;
  status: RoadmapStatus;
  detail: string;
  value?: string;
};

export type RoadmapPhase = {
  id: string;
  title: string;
  horizon: string;
  items: RoadmapItem[];
};

export const ROADMAP_STATUS_LABEL: Record<RoadmapStatus, string> = {
  pronto: "Entregue",
  andamento: "Em andamento",
  planejado: "Planejado",
  ideia: "Oportunidade",
};

export const ROADMAP_VERSION = "Revisão de Setembro/2026";

export const ROADMAP: RoadmapPhase[] = [
  {
    id: "base",
    title: "Fase 1 — Base clínica e coleta",
    horizon: "Concluída",
    items: [
      {
        title: "Questionário público e por convite",
        status: "pronto",
        detail:
          "Fluxo de uma pergunta por tela, consentimento LGPD registrado e retomada por link com validade de 30 dias.",
      },
      {
        title: "Motor de escalas de domínio público",
        status: "pronto",
        detail:
          "PHQ-2/9, GAD-2/7, ASQ, AUDIT, CAGE, ASSIST-Lite (OMS, escore por substância), PGSI, OCI-R, ASRS-18, SRQ-20, GHQ-12, GDS-15 com escore, faixa e sinalização de risco.",
      },
      {
        title: "Árvore de decisão por idade e sintoma",
        status: "pronto",
        detail:
          "Roteamento por faixa etária (criança a idoso) com escalonamento dinâmico entre instrumentos de rastreio e confirmação.",
      },
      {
        title: "Identificação do informante",
        status: "pronto",
        detail:
          "Paciente x familiar/responsável, com ajuste de sensibilidade nas escalas internalizantes e destaque no relatório.",
      },
      {
        title: "White label multi-clínica federada",
        status: "pronto",
        detail:
          "Marca, cores, textos e isolamento de dados por clínica. Hoje atende Saraiva Clínica de Psiquiatria e Instituto Lumina de Saúde Mental & Neurociências, com seletor de clínica para o Administrador Geral.",
      },
    ],
  },
  {
    id: "painel",
    title: "Fase 2 — Painel do profissional",
    horizon: "Concluída",
    items: [
      {
        title: "Fila de revisão e detalhe da triagem",
        status: "pronto",
        detail:
          "Tabela densa com semáforo de risco, atalhos por gravidade, navegação Anterior/Próxima e marcação de revisado.",
      },
      {
        title: "Filtros, busca, ordenação e visualizações salvas",
        status: "pronto",
        detail: "Inclui intervalo de datas, informante, escala acionada e status.",
      },
      {
        title: "Parecer médico e auditoria",
        status: "pronto",
        detail:
          "Notas clínicas versionadas e registro de quem acessou, alterou ou enviou, com data e hora.",
      },
      {
        title: "Relatórios em PDF",
        status: "pronto",
        detail:
          "PDF do paciente (sem diagnóstico) e PDF clínico com trilha de decisão, escores e respostas item a item.",
      },
      {
        title: "Métricas de informante",
        status: "pronto",
        detail: "Proporção paciente x familiar por período.",
      },
      {
        title: "Cockpit de Psicoeducação",
        status: "pronto",
        detail:
          "Biblioteca de 10 temas clínicos com sugestão automática por escore, liberação manual pelo médico e acompanhamento de leitura pelo paciente no Portal.",
      },
      {
        title: "Micro-interações e atalhos de teclado",
        status: "pronto",
        detail:
          "Transições suaves nas etapas do questionário e na fila de revisão (respeitando 'reduzir movimento'), além de atalhos J/L, R e Shift+R para revisão rápida.",
      },
    ],
  },
  {
    id: "seguranca",
    title: "Fase 2b — Segurança e isolamento por consultório",
    horizon: "Concluída",
    items: [
      {
        title: "Escopo de acesso por clínica em todas as rotas do painel",
        status: "pronto",
        detail:
          "RLS no banco e verificação adicional no servidor: cada profissional só enxerga triagens, contatos, e-mails e auditoria do próprio consultório.",
      },
      {
        title: "Mensagem clara de acesso negado",
        status: "pronto",
        detail:
          "Quando o registro está fora do escopo, o painel mostra um aviso explicativo com retorno seguro, no lugar de erro técnico.",
      },
      {
        title: "Validação de destinatários em envios",
        status: "pronto",
        detail:
          "WhatsApp e e-mail só aceitam contatos, convites, telefones e endereços vinculados à triagem e ao consultório do usuário.",
      },
      {
        title: "Auditoria filtrável com exportação CSV",
        status: "pronto",
        detail:
          "Filtro por período e por tipo de ação, com exportação em CSV (UTF-8) dos registros exibidos.",
      },
    ],
  },

  {
    id: "comunicacao",
    title: "Fase 3 — Comunicação",
    horizon: "Em andamento",
    items: [
      {
        title: "Convites e avisos por WhatsApp",
        status: "pronto",
        detail:
          "Disparo pelo painel com link pronto, histórico de mensagens e registro em auditoria.",
      },
      {
        title: "E-mail de resultados básicos",
        status: "andamento",
        detail:
          "Template pronto, pré-visualização com dados reais, tela de status e reenvio. Falta concluir a verificação do domínio de envio (SPF/DKIM) para disparo automático.",
        value: "Bloqueante para automação total do pós-triagem.",
      },
      {
        title: "WhatsApp automatizado via API oficial",
        status: "planejado",
        detail:
          "Hoje o envio é assistido (link pronto). A API oficial permite disparo e status de entrega sem ação manual.",
        value: "Reduz trabalho da secretaria e aumenta taxa de resposta.",
      },
      {
        title: "Lembretes automáticos de questionário pendente",
        status: "planejado",
        detail: "Régua de 24h/72h para quem recebeu o convite e não concluiu.",
        value: "Principal alavanca para elevar a taxa de conclusão.",
      },
    ],
  },
  {
    id: "ajuda",
    title: "Fase 4 — Suporte ao médico",
    horizon: "Atual",
    items: [
      {
        title: "Manual online e em PDF",
        status: "pronto",
        detail:
          "Central de ajuda no painel com download em PDF para distribuição interna.",
      },
      {
        title: "Protocolo e simulador de roteamento",
        status: "pronto",
        detail: "Visualização de como cada perfil percorre a árvore de decisão.",
      },
      {
        title: "Roadmap vivo no sistema",
        status: "pronto",
        detail: "Esta página, disponível online e em PDF para o contratante.",
      },
      {
        title: "Treinamento em vídeo curto",
        status: "ideia",
        detail: "Três vídeos de 2 minutos: fila, leitura de escores, parecer.",
        value: "Acelera a adesão de novos profissionais.",
      },
    ],
  },
  {
    id: "proximos",
    title: "Fase 5 — Próximos passos de maior impacto",
    horizon: "3 a 6 meses",
    items: [
      {
        title: "Reaplicação e acompanhamento longitudinal",
        status: "planejado",
        detail:
          "Comparar escores da mesma pessoa ao longo do tempo, com gráfico de evolução por escala.",
        value: "Transforma a triagem em instrumento de monitoramento de resposta ao tratamento.",
      },
      {
        title: "Agenda e vinculação à consulta",
        status: "planejado",
        detail: "Associar cada triagem ao horário agendado e ao profissional responsável.",
        value: "Fecha o ciclo entre triagem e atendimento.",
      },
      {
        title: "Exportação e relatórios gerenciais",
        status: "planejado",
        detail: "CSV/Excel e indicadores de demanda, gravidade e tempo de resposta.",
        value: "Dá visão de operação ao contratante.",
      },
      {
        title: "Resumo clínico assistido por IA",
        status: "ideia",
        detail:
          "Rascunho de anamnese a partir das respostas, sempre revisado e assinado pelo médico.",
        value: "Maior ganho de tempo por consulta, com revisão humana obrigatória.",
      },
      {
        title: "Encaminhamento estruturado",
        status: "ideia",
        detail:
          "Sugestão de fluxo (psicoterapia, psiquiatria, urgência) e registro do desfecho.",
        value: "Permite medir se a triagem melhorou o encaminhamento.",
      },
      {
        title: "Acessibilidade e versão em áudio",
        status: "ideia",
        detail: "Leitura das perguntas para baixa alfabetização e baixa visão.",
        value: "Amplia o público atendível.",
      },
      {
        title: "Integração com prontuário eletrônico",
        status: "ideia",
        detail: "Envio do PDF clínico ou dados estruturados para o sistema da clínica.",
        value: "Elimina retrabalho de digitação.",
      },
    ],
  },
];
