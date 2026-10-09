/**
 * Estúdio de validação: TODOS os textos que explicam a tela, num só lugar.
 *
 * Para mudar uma explicação, edite este arquivo e só ele: a tela apenas lê daqui.
 * Escreva como se explicasse a uma pessoa que nunca viu o sistema: frase curta, um assunto por frase,
 * sem sigla sem explicar. Os testes (review-textos.test.ts) avisam se faltar texto para algum tipo ou
 * botão novo, então ao criar um tipo de item em review-studio.ts o erro já aponta o que escrever aqui.
 *
 * Rótulos curtos de botões e abas continuam em review-studio.ts (KIND_LABEL, DECISION_LABEL...).
 */
import type { ReviewDecision, ReviewKind, ReviewerRole } from "./review-studio";

/** O que cada tipo de material é e o que se espera de quem avalia. */
export type AjudaDoTipo = {
  /** O que há nesta aba, em uma frase. */
  oQueE: string;
  /** O que fazer com cada cartão. */
  comoResponder: string;
};

export const AJUDA_POR_TIPO: Record<ReviewKind, AjudaDoTipo> = {
  video: {
    oQueE:
      "Vídeos curtos de psicoeducação (as pílulas) e o vídeo explicativo longo de cada projeto.",
    comoResponder:
      "Assista inteiro. Julgue o texto falado, as imagens e a duração. Se algo estiver errado, use “Ajusto” e escreva o que mudar.",
  },
  frase: {
    oQueE:
      "Cada cartão é a fala de um vídeo curto, com o trecho da obra que a sustenta logo abaixo.",
    comoResponder:
      "Leia a frase e confira se ela está fiel ao trecho. Use “Aprovo” se estiver certa e “Ajusto” se precisar mudar (escreva como).",
  },
  escala: {
    oQueE: "Decisões sobre as escalas clínicas do sistema, como pontos de corte e versões.",
    comoResponder:
      "Leia a pergunta e o contexto. Se houver opções, escolha uma com “Prefiro esta”. Se não houver, use os botões e comente.",
  },
  marca: {
    oQueE: "As propostas de logo e de assinatura do Psiqway, com as imagens de cada uma.",
    comoResponder:
      "Olhe as peças de cada proposta e clique em “Prefiro esta” na que deve seguir para refino. Um comentário ajuda a equipe de design.",
  },
  pendencia: {
    oQueE: "Pontos que a equipe deixou em aberto e que só um médico ou o curador pode resolver.",
    comoResponder:
      "Leia a pergunta. Responda com “Aprovo” (siga o que está proposto), “Ajusto” (siga, com a mudança que o senhor escrever) ou “Não uso”.",
  },
  estilo: {
    oQueE: "Os três estilos visuais possíveis para os vídeos de psicoeducação.",
    comoResponder:
      "Assista ao mesmo vídeo nos três estilos e escolha um com “Prefiro esta”. A escolha vira o padrão das próximas pílulas.",
  },
  infografico: {
    oQueE:
      "O mesmo infográfico feito para cada projeto: Psiqway, Caminhos, Corte 800 e Médico de Família.",
    comoResponder:
      "Compare as quatro imagens. Confira o texto dentro delas (são geradas por IA e podem ter erro). Escolha com “Prefiro esta” ou comente.",
  },
  quiz: {
    oQueE: "O quiz de cada projeto. Dá para respondê-lo aqui mesmo: ele corrige na tela.",
    comoResponder:
      "Abra um quiz e responda como um aluno responderia. Julgue se as perguntas são claras e se a correção clínica está certa.",
  },
  flashcards: {
    oQueE: "Os cartões de estudo de cada projeto (pergunta na frente, resposta atrás).",
    comoResponder:
      "Abra alguns cartões de cada projeto e confira a resposta. Escolha o conjunto que deve seguir ou peça ajuste.",
  },
  slides: {
    oQueE: "Os slides de cada projeto. O Psiqway não tem slides neste piloto.",
    comoResponder:
      "Percorra os slides e compare. Escolha com “Prefiro esta” ou comente o que mudar.",
  },
  mapa: {
    oQueE: "O mapa mental de cada projeto, em forma de lista por tópicos.",
    comoResponder:
      "Compare a estrutura e a profundidade dos tópicos. Escolha o melhor ou comente o que falta.",
  },
  audio: {
    oQueE: "O podcast de cada projeto: uma conversa em áudio sobre o tema.",
    comoResponder:
      "Ouça um trecho de cada um e escolha com “Prefiro esta”. Comente se o tom ou algum dado estiver errado.",
  },
};

/** O que cada botão de resposta significa (os rótulos estão em DECISION_LABEL). */
export const EXPLICACAO_DA_RESPOSTA: Record<ReviewDecision, string> = {
  aprovo: "Está bom como está.",
  ajusto: "Serve, mas precisa de uma mudança. Escreva a mudança no comentário.",
  nao_uso: "Não deve ser usado.",
  prefiro: "Entre as opções do cartão, esta é a que deve seguir.",
  sem_opiniao: "Prefiro não opinar neste item.",
};

export const PASSOS = [
  {
    titulo: "Escolha uma aba",
    texto:
      "Cada aba é um tipo de material: frases, vídeos, marca, quiz e assim por diante. Comece por onde quiser.",
  },
  {
    titulo: "Veja o material e responda",
    texto:
      "Use os botões de cada cartão. Se pedir ajuste, escreva o que mudar. Quando houver opções, clique em “Prefiro esta”.",
  },
  {
    titulo: "Pronto: já está salvo",
    texto:
      "Cada resposta é salva na hora, com o seu nome. Pode fechar a página e voltar depois, pelo mesmo link.",
  },
] as const;

/** Quem vê o quê, por papel. */
export const QUEM_VE_O_QUE: Record<ReviewerRole, string[]> = {
  avaliador: [
    "Em cada item, a opinião dos outros só aparece depois que o senhor registra a sua. Assim ninguém influencia ninguém.",
    "A decisão final de cada item aparece no próprio cartão, para todos.",
    "Os resultados gerais e a ata ficam com o médico curador.",
  ],
  decisor: [
    "O senhor vê as respostas de todos nos cartões, no Resumo e na aba Decidir.",
    "O senhor registra a decisão final de cada item. Se mais de uma pessoa decidir o mesmo item, vale a última, e o histórico fica guardado.",
    "Nada é publicado sem a decisão final.",
  ],
};

export const TITULOS = {
  comoFunciona: "Como funciona (1 minuto)",
  soFalta: "Mostrar só o que falta eu responder",
  progresso: (feitos: number, total: number, pct: number) =>
    `O senhor respondeu ${feitos} de ${total} itens (${pct}%)`,
  comecar: "Comece por qualquer aba acima. Sugestão: a primeira com itens sem resposta.",
} as const;

/** Bloco “Resultados” do Resumo (só o decisor vê os números de todos). */
export const RESULTADOS = {
  titulo: "Resultados até agora",
  explicacao:
    "Aqui o senhor acompanha quem já respondeu, onde há divergência e o que ainda espera decisão. Para ver as opiniões de um item, abra a aba dele. Para decidir, use a aba Decidir.",
  participacaoTitulo: "Quem já participou",
  participacaoVazia: "Ninguém respondeu ainda.",
  semResposta: "ainda não respondeu",
  aguardandoDecisao: (n: number) =>
    n === 0
      ? "Nenhum item está esperando decisão."
      : `${n} ${n === 1 ? "item tem" : "itens têm"} respostas e ainda esperam a sua decisão.`,
  irParaDecidir: "Ir para Decidir",
  baixarAta: "Na aba Decidir, o botão “Baixar ata, planilha e cópia” guarda tudo fora do sistema.",
  divergenciaTitulo: "Onde os avaliadores divergem",
  nenhumaDivergencia: "Nenhuma divergência até agora.",
} as const;

/** Aba Decidir (só o decisor). */
export const DECIDIR = {
  explicacao:
    "Aqui o senhor transforma as opiniões em decisão final. Cada cartão mostra as respostas de todos. Escolha o resultado, escreva a justificativa (obrigatória) e grave.",
  soComVotos: "Só o que tem votos e ainda não decidi",
  vazio:
    "Nada esperando decisão agora. Quando alguém responder um item, ele aparece aqui. Para rever o que já foi decidido, desligue o filtro acima.",
  baixar: "Baixar ata, planilha e cópia",
  baixarAjuda:
    "A ata (texto), a planilha (CSV) e a cópia completa (JSON) servem para guardar as decisões fora do sistema e aplicá-las depois.",
} as const;

export const LISTA = {
  nadaPendente: "Nada pendente aqui. Obrigado!",
  rascunho: "Tudo aqui é rascunho: nada é publicado sem a decisão final.",
} as const;

export const SEM_LINK = {
  titulo: "Falta o seu link pessoal",
  texto:
    "Abra o link completo que o senhor recebeu: ele termina com #t=… e é o que identifica o senhor. Se não tiver mais o link, peça um novo a quem o enviou.",
} as const;

/** Como se chega a uma decisão quando não dá para reunir todo mundo. */
export const COMO_DECIDIMOS = [
  "Cada pessoa responde quando puder, no seu tempo. Não precisa de reunião.",
  "Quando todos concordam, o decisor aprova tudo de uma vez, na aba Decidir.",
  "Quando há divergência, quem divergiu escreveu o motivo (o comentário é obrigatório em “Ajusto”). O decisor lê os motivos e decide, com justificativa.",
  "O que ficar sem resposta não trava o resto: cada item anda sozinho.",
  "A ata guarda quem votou o quê e por que cada decisão foi tomada.",
] as const;

/** Os quatro projetos: cada um é um produto, com público e identidade próprios. */
export const PROJETOS_TEXTO = {
  titulo: "Projeto",
  todos: "Todos os projetos",
  geral: "Geral",
  geralDescricao: "Escalas, pendências e outros pontos que valem para a plataforma toda.",
  explicacao:
    "O Estúdio reúne quatro projetos. Cada um é um produto, com público e regras próprios: o material de um não é alternativa ao de outro. Abra um projeto para ver só o que é dele e a identidade dele.",
  identidadeTitulo: "Identidade do projeto",
  identidadeAjuda:
    "É o que vale para tudo que este projeto publica. Cada material abaixo é avaliado contra ela. Confirme ou peça ajuste.",
  paraQuem: "Para quem",
  e: "O projeto é",
  naoE: "O projeto não é",
  semIdentidade: "Este projeto ainda não tem identidade cadastrada.",
  abrir: "Abrir este projeto",
  respondidos: (feitos: number, total: number) => `${feitos} de ${total} respondidos`,
  itens: (n: number) => `${n} ${n === 1 ? "item" : "itens"}`,
} as const;

/** Aprovação em lote do que está em consenso total. */
export const LOTE = {
  titulo: (n: number) => `Consenso: ${n} ${n === 1 ? "item" : "itens"} em que todos concordam`,
  explicacao:
    "Todos os que votaram aprovaram (ou escolheram a mesma opção), com pelo menos 2 pessoas. Dá para decidir todos de uma vez. Cada decisão guarda os votos e pode ser alterada depois.",
  botao: (n: number) => (n === 1 ? "Aprovar este" : `Aprovar os ${n} de uma vez`),
  confirmar: (n: number) =>
    `Gravar a decisão final de ${n} ${n === 1 ? "item" : "itens"} com consenso? Cada uma fica na ata e pode ser alterada depois.`,
  justificativa: (votos: number) => `Consenso: os ${votos} que votaram concordaram.`,
  andamento: (feitos: number, total: number) => `Gravando ${feitos} de ${total}…`,
  pronto: (n: number) => `${n} ${n === 1 ? "decisão gravada" : "decisões gravadas"}.`,
  falha:
    "Não foi possível gravar todos. Os que já foram gravados continuam valendo; tente de novo.",
  demais: "Os demais precisam do seu olhar: têm ajuste, rejeição, divergência ou poucos votos.",
} as const;
