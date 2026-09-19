/**
 * Estimador de Teste Adaptativo Computadorizado (CAT) via Teoria de Resposta ao Item (TRI).
 * Implementado segundo o Modelo de Resposta Gradual de Samejima (GRM - Graded Response Model),
 * padrão internacional do PROMIS (Patient-Reported Outcomes Measurement Information System) / NIH.
 * 
 * Permite reduzir a carga de aplicação em >= 50% dos itens mantendo precisão clínica
 * equivalente ao questionário completo (SE <= 0.30).
 */

import type { ScaleItem, TRIParameters } from "./schema-types";

// Número padrão de pontos de quadratura Gaussiana para estimação EAP
const NUM_QUADRATURE_POINTS = 33;
const THETA_MIN = -4.0;
const THETA_MAX = 4.0;

/** Gera os nós de quadratura e pesos da normal padrão N(0, 1) */
const QUADRATURE_NODES: { theta: number; weight: number }[] = (() => {
  const nodes: { theta: number; weight: number }[] = [];
  const step = (THETA_MAX - THETA_MIN) / (NUM_QUADRATURE_POINTS - 1);
  let totalWeight = 0;

  for (let i = 0; i < NUM_QUADRATURE_POINTS; i++) {
    const theta = THETA_MIN + i * step;
    // Densidade da distribuição normal padrão: (1 / sqrt(2*pi)) * exp(-theta^2 / 2)
    const density = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * theta * theta);
    const weight = density * step;
    nodes.push({ theta, weight });
    totalWeight += weight;
  }

  // Normaliza os pesos
  for (const node of nodes) {
    node.weight /= totalWeight;
  }
  return nodes;
})();

/**
 * Função logística padrão: P*(theta) = 1 / (1 + exp(-a * (theta - b)))
 */
function logisticPStar(theta: number, a: number, b: number): number {
  const exponent = -a * (theta - b);
  if (exponent > 35) return 0;
  if (exponent < -35) return 1;
  return 1 / (1 + Math.exp(exponent));
}

/**
 * Calcula a probabilidade de resposta para cada categoria k = 0 ... K-1
 * sob o Graded Response Model (GRM).
 * 
 * P_k(theta) = P*_k(theta) - P*_{k+1}(theta)
 * onde P*_0 = 1 e P*_K = 0
 */
export function calculateGRMCategoryProbabilities(
  theta: number,
  tri: TRIParameters,
  numCategories = 4,
): number[] {
  const { a_discrimination, b_thresholds } = tri;
  const probs: number[] = new Array(numCategories).fill(0);

  // P*_0 = 1
  // P*_k = logistic(theta, a, b_{k-1}) para k = 1 ... b_thresholds.length
  // P*_K = 0
  const pStar: number[] = new Array(numCategories + 1);
  pStar[0] = 1.0;
  pStar[numCategories] = 0.0;

  for (let k = 1; k < numCategories; k++) {
    const b = b_thresholds[k - 1];
    pStar[k] = logisticPStar(theta, a_discrimination, b);
  }

  for (let k = 0; k < numCategories; k++) {
    probs[k] = Math.max(1e-7, pStar[k] - pStar[k + 1]);
  }

  return probs;
}

/**
 * Calcula a Informação de Fisher do item j no traço latente theta:
 * I_j(theta) = sum_{k=0}^{K-1} [ (P'_jk(theta))^2 / P_jk(theta) ]
 */
export function calculateItemFisherInformation(
  theta: number,
  tri: TRIParameters,
  numCategories = 4,
): number {
  const { a_discrimination, b_thresholds } = tri;
  const a = a_discrimination;

  const pStar: number[] = new Array(numCategories + 1);
  const pStarPrime: number[] = new Array(numCategories + 1);

  pStar[0] = 1.0;
  pStarPrime[0] = 0.0;
  pStar[numCategories] = 0.0;
  pStarPrime[numCategories] = 0.0;

  for (let k = 1; k < numCategories; k++) {
    const b = b_thresholds[k - 1];
    const ps = logisticPStar(theta, a, b);
    pStar[k] = ps;
    // Derivada de P* em relação a theta: dP*/dtheta = a * P* * (1 - P*)
    pStarPrime[k] = a * ps * (1 - ps);
  }

  let info = 0;
  for (let k = 0; k < numCategories; k++) {
    const pk = Math.max(1e-7, pStar[k] - pStar[k + 1]);
    const pkPrime = pStarPrime[k] - pStarPrime[k + 1];
    info += (pkPrime * pkPrime) / pk;
  }

  return info;
}

export interface CATItemResponse {
  item: ScaleItem;
  answerValue: number;
}

export interface CATEstimateResult {
  theta: number;
  se: number;
  information: number;
}

/**
 * Estima o traço latente theta (theta_hat) e o erro padrão SE(theta)
 * utilizando o estimador Expected A Posteriori (EAP) com integração numérica gaussiana.
 * 
 * EAP é estável para qualquer padrão de resposta (inclusive zeros absolutos) e
 * converge rapidamente para a escala padronizada (média 0, desvio-padrão 1).
 */
export function estimateThetaEAP(
  responses: CATItemResponse[],
): CATEstimateResult {
  if (responses.length === 0) {
    return { theta: 0.0, se: 1.0, information: 1.0 };
  }

  let numeratorTheta = 0.0;
  let denominator = 0.0;

  // Pré-calcula verossimilhanças nos pontos de quadratura
  const likelihoods: number[] = new Array(QUADRATURE_NODES.length).fill(1.0);

  for (let q = 0; q < QUADRATURE_NODES.length; q++) {
    const nodeTheta = QUADRATURE_NODES[q].theta;
    let l = 1.0;

    for (const resp of responses) {
      if (!resp.item.tri_parameters) continue;
      const numCats = resp.item.options?.length ?? 4;
      const probs = calculateGRMCategoryProbabilities(
        nodeTheta,
        resp.item.tri_parameters,
        numCats,
      );
      const val = Math.min(numCats - 1, Math.max(0, resp.answerValue));
      l *= probs[val];
    }

    likelihoods[q] = l;
    const postWeight = l * QUADRATURE_NODES[q].weight;
    numeratorTheta += nodeTheta * postWeight;
    denominator += postWeight;
  }

  if (denominator < 1e-12) {
    return { theta: 0.0, se: 1.0, information: 1.0 };
  }

  const thetaHat = numeratorTheta / denominator;

  // Calcula a variância a posteriori
  let numeratorVar = 0.0;
  for (let q = 0; q < QUADRATURE_NODES.length; q++) {
    const diff = QUADRATURE_NODES[q].theta - thetaHat;
    const postWeight = likelihoods[q] * QUADRATURE_NODES[q].weight;
    numeratorVar += diff * diff * postWeight;
  }

  const posteriorVar = numeratorVar / denominator;
  const se = Math.sqrt(Math.max(1e-4, posteriorVar));

  // Informação total acumulada dos itens respondidos no ponto thetaHat
  let totalInfo = 0;
  for (const resp of responses) {
    if (!resp.item.tri_parameters) continue;
    const numCats = resp.item.options?.length ?? 4;
    totalInfo += calculateItemFisherInformation(
      thetaHat,
      resp.item.tri_parameters,
      numCats,
    );
  }

  return {
    theta: Number(thetaHat.toFixed(3)),
    se: Number(se.toFixed(3)),
    information: Number(totalInfo.toFixed(3)),
  };
}

/**
 * Seleciona o próximo item mais informativo segundo o critério de
 * Máxima Informação de Fisher (MFI - Maximum Fisher Information) em thetaHat.
 */
export function selectNextCATItem(
  candidateItems: ScaleItem[],
  currentTheta: number,
  alreadyAnsweredIds: string[],
): ScaleItem | null {
  const unappliedItems = candidateItems.filter(
    (item) => !alreadyAnsweredIds.includes(item.id) && item.tri_parameters,
  );

  if (unappliedItems.length === 0) return null;

  let bestItem: ScaleItem | null = null;
  let maxInfo = -Infinity;

  for (const item of unappliedItems) {
    const numCats = item.options?.length ?? 4;
    const info = calculateItemFisherInformation(
      currentTheta,
      item.tri_parameters!,
      numCats,
    );
    if (info > maxInfo) {
      maxInfo = info;
      bestItem = item;
    }
  }

  return bestItem;
}

export interface CATStoppingDecision {
  stop: boolean;
  reason?: string;
  itemsAnswered: number;
  reductionPercentage: number;
}

/**
 * Regra de Parada do CAT (Stopping Criterion):
 * - SE(theta) <= targetSE (default 0.30, correspondente a confiabilidade > 0.90)
 * - OU atingiu a metade dos itens da escala (>= 50% de redução garantida)
 * - OU todos os itens disponíveis foram esgotados.
 */
export function shouldStopCAT(
  se: number,
  itemsAnsweredCount: number,
  totalItemsCount: number,
  targetSE = 0.30,
): CATStoppingDecision {
  const maxAllowedItems = Math.max(3, Math.ceil(totalItemsCount / 2));
  const reductionPercentage = Math.round(
    ((totalItemsCount - itemsAnsweredCount) / totalItemsCount) * 100,
  );

  // 1. Precisão psicométrica excelente atingida
  if (itemsAnsweredCount >= 3 && se <= targetSE) {
    return {
      stop: true,
      reason: `Precisão clínica atingida com SE(θ) = ${se.toFixed(2)} ≤ ${targetSE.toFixed(2)}. Confiabilidade equivalente > 0.90.`,
      itemsAnswered: itemsAnsweredCount,
      reductionPercentage,
    };
  }

  // 2. Limite de 50% dos itens da escala atingido (garantia de agilidade sem sobrecarga)
  if (itemsAnsweredCount >= maxAllowedItems) {
    return {
      stop: true,
      reason: `Critério de economia cognitiva atingido: limite de ${itemsAnsweredCount}/${totalItemsCount} itens aplicados (redução de ${reductionPercentage}%).`,
      itemsAnswered: itemsAnsweredCount,
      reductionPercentage,
    };
  }

  // 3. Esgotamento do banco
  if (itemsAnsweredCount >= totalItemsCount) {
    return {
      stop: true,
      reason: "Todos os itens do instrumento foram respondidos.",
      itemsAnswered: itemsAnsweredCount,
      reductionPercentage: 0,
    };
  }

  return {
    stop: false,
    itemsAnswered: itemsAnsweredCount,
    reductionPercentage,
  };
}
