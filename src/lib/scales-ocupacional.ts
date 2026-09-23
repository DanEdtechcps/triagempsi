/**
 * Saúde ocupacional / riscos psicossociais (NR-01).
 *
 * A NR-01 passa a exigir a gestão de riscos psicossociais no trabalho. O
 * instrumento abaixo é uma versão curta em português, de uso livre, inspirada
 * nos domínios do COPSOQ (Copenhagen Psychosocial Questionnaire) e no modelo
 * PRIMA-EF da OMS/OIT: demandas, controle, apoio, relacionamentos, papel,
 * reconhecimento, insegurança e interface trabalho-família.
 *
 * Todos os itens são redigidos na direção do risco (mais pontos = mais risco),
 * o que dispensa itens reversos e mantém a soma simples.
 */

import { OPTS_0_4, type Scale } from "./scale-types";

// ATENÇÃO CLÍNICA (achado #33 da auditoria): soma os 16 itens de domínios
// psicossociais distintos (demandas, controle, apoio etc.) num único
// escore/banda; o COPSOQ original é multidimensional, com subescala e
// corte próprios por domínio. Mesma pendência de revisão clínica já
// registrada pro MBI-HSS (achado #29, scales-official-28.ts) — o
// `licenseNote` abaixo já deixa claro que isto não é o COPSOQ III
// licenciado; não alterar a agregação/cortes sem aval de um profissional.
export const COPSOQ_BR: Scale = {
  code: "COPSOQ-BR",
  name: "COPSOQ-BR (NR-01)",
  fullName: "Rastreio de riscos psicossociais no trabalho",
  domain: "ocupacional",
  instructions:
    "Pensando nas últimas 4 semanas de trabalho, o quanto cada afirmação descreve a sua realidade?",
  timeframe: "Últimas 4 semanas",
  options: OPTS_0_4,
  informantMode: "auto",
  minAge: 16,
  status: "ativa",
  licenseNote:
    "Adaptação livre dos domínios COPSOQ/PRIMA-EF para rastreio coletivo — não substitui o COPSOQ III licenciado.",
  items: [
    { id: "1", text: "Tenho mais trabalho do que consigo dar conta no meu horário" },
    { id: "2", text: "Preciso trabalhar em ritmo acelerado o tempo todo" },
    { id: "3", text: "Meu trabalho me exige emocionalmente mais do que consigo suportar" },
    { id: "4", text: "Levo para casa a tensão e as preocupações do trabalho" },
    { id: "5", text: "Tenho pouca influência sobre como e quando faço minhas tarefas" },
    { id: "6", text: "Não recebo as informações de que preciso para fazer bem o meu trabalho" },
    { id: "7", text: "Recebo ordens contraditórias sobre o que devo fazer" },
    { id: "8", text: "Não sei ao certo até onde vai a minha responsabilidade" },
    { id: "9", text: "Falta apoio das minhas chefias quando o trabalho aperta" },
    { id: "10", text: "Falta apoio dos meus colegas no dia a dia" },
    { id: "11", text: "Meu esforço não é reconhecido nem valorizado" },
    { id: "12", text: "Sinto insegurança sobre a continuidade do meu emprego" },
    { id: "13", text: "O trabalho atrapalha minha vida familiar e meu descanso" },
    { id: "14", text: "Presenciei ou sofri humilhação, assédio ou tratamento hostil no trabalho" },
    { id: "15", text: "Termino a jornada esgotado(a), sem energia para mais nada" },
    { id: "16", text: "Penso frequentemente em pedir demissão por causa do desgaste" },
  ],
  bands: [
    { min: 0, max: 15, label: "Risco psicossocial baixo", level: 0 },
    { min: 16, max: 28, label: "Risco psicossocial moderado", level: 2 },
    { min: 29, max: 44, label: "Risco psicossocial alto", level: 3 },
    { min: 45, max: 64, label: "Risco psicossocial crítico", level: 4 },
  ],
  positiveCutoff: 29,
  riskItems: ["14"],
  triggersScale: "SRQ-20",
};

/** Domínios PRIMA-EF para o relatório agregado da empresa. */
export const COPSOQ_DOMINIOS: { id: string; label: string; items: string[] }[] = [
  { id: "demandas", label: "Demandas e ritmo", items: ["1", "2"] },
  { id: "emocional", label: "Exigência emocional", items: ["3", "4"] },
  { id: "controle", label: "Autonomia e clareza de papel", items: ["5", "6", "7", "8"] },
  { id: "apoio", label: "Apoio social e liderança", items: ["9", "10"] },
  { id: "reconhecimento", label: "Reconhecimento e segurança", items: ["11", "12"] },
  { id: "interface", label: "Interface trabalho-vida", items: ["13"] },
  { id: "assedio", label: "Assédio e violência", items: ["14"] },
  { id: "esgotamento", label: "Esgotamento", items: ["15", "16"] },
];

export const SCALES_OCUPACIONAL: Scale[] = [COPSOQ_BR];
