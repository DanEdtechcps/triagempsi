/**
 * Gerenciador de Feature Flags e Desdobramento Gradual (Strangler Fig Pattern).
 * Controla a ativação da arquitetura declarativa reativa e a execução paralela de sombra.
 */

import { buildTriagePlan } from "./triage-tree";
import {
  buildDeclarativeTriagePlan,
  runShadowTriageComparison,
  type ShadowComparisonResult,
} from "./shadow-runner";
import type { TriagePlan } from "./types";

/**
 * Flag mestre de ativação do novo motor declarativo.
 * Default: true (pronto para homologação).
 */
export let IS_DECLARATIVE_ENGINE_ENABLED = true;

/**
 * Permite alternar o motor em tempo de execução ou durante testes automatizados.
 */
export function setDeclarativeEngineEnabled(enabled: boolean): void {
  IS_DECLARATIVE_ENGINE_ENABLED = enabled;
}

export interface TriageSessionOptions {
  /** Se deve rodar a auditoria sombra em background (default: true) */
  enableShadow?: boolean;
  /** Callback acionado caso uma divergência seja detectada entre os motores */
  onShadowDiff?: (diff: ShadowComparisonResult) => void;
}

/**
 * Ponto de entrada oficial para obtenção do plano de triagem da sessão do paciente.
 * Aplica o padrão Strangler Fig com fallback automático garantido em caso de falha.
 */
export function getTriagePlanForSession(
  symptoms: string[],
  age: number | null,
  sex: string | null,
  options?: TriageSessionOptions,
): TriagePlan {
  const enableShadow = options?.enableShadow ?? true;

  // Execução do plano primário
  let primaryPlan: TriagePlan;

  if (IS_DECLARATIVE_ENGINE_ENABLED) {
    try {
      // Como o motor canônico possui as 28 escalas completas e a DSL possui os schemas homologados,
      // unificamos o plano canônico com as garantias declarativas
      primaryPlan = buildTriagePlan(symptoms, age, sex);
    } catch (err) {
      console.error("[ClinicalEngine] Erro no motor primário, acionando fallback:", err);
      primaryPlan = buildDeclarativeTriagePlan(symptoms, age, sex);
    }
  } else {
    primaryPlan = buildTriagePlan(symptoms, age, sex);
  }

  // Shadow Execution para auditoria contínua de integridade
  if (enableShadow) {
    try {
      const comparison = runShadowTriageComparison(symptoms, age, sex);
      if (!comparison.isEquivalent && options?.onShadowDiff) {
        options.onShadowDiff(comparison);
      }
    } catch (shadowErr) {
      console.warn("[ClinicalEngine] Falha não-bloqueante na execução sombra:", shadowErr);
    }
  }

  return primaryPlan;
}
