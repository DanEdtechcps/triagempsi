/**
 * Motor Reativo de Grafos (DAG) e Reações Cruzadas (x-reactions).
 * Inspirado na arquitetura reativa do Formily (Alibaba).
 *
 * Permite que escalas e itens disparem eventos puramente funcionais no Edge,
 * recalculando dependências e injetando/removendo escalas de forma determinística
 * e estritamente acíclica (garantia matemática de DAG sem loops infinitos).
 */

import type { SchemaScoreResult, EvaluationContext } from "./schema-types";
import { isMaleSex } from "./triage-tree";

export type ReactionAction = "INJECT_SCALE" | "TRIGGER_SAFETY_PLAN" | "REMOVE_SCALE";

export interface ScaleReaction {
  id?: string;
  source: string;
  condition: (result: SchemaScoreResult) => boolean;
  action: ReactionAction;
  target?: string;
  priority?: number;
  description?: string;
}

export interface ReactionLog {
  timestamp: number;
  reactionId: string;
  source: string;
  action: ReactionAction;
  target?: string;
  description?: string;
}

export interface DAGState {
  flow: string[];
  completed: string[];
  safetyPlanTriggered: boolean;
  logs: ReactionLog[];
}

export class ReactiveTriageDAG {
  private reactions: ScaleReaction[] = [];

  constructor(initialReactions?: ScaleReaction[]) {
    if (initialReactions) {
      for (const reaction of initialReactions) {
        this.addReaction(reaction);
      }
    }
  }

  /**
   * Adiciona uma reação com validação estrita de aciclicidade (DAG).
   * Lança erro caso a reação crie dependência circular (ex: A -> B -> A).
   */
  public addReaction(reaction: ScaleReaction): void {
    const candidateReactions = [...this.reactions, reaction];
    const cycle = ReactiveTriageDAG.detectCycle(candidateReactions);

    if (cycle) {
      throw new Error(
        `Ciclo inválido detectado no DAG de triagem: ${cycle.join(" -> ")}. O grafo deve permanecer acíclico.`,
      );
    }

    this.reactions.push(reaction);
  }

  public getReactions(): ReadonlyArray<ScaleReaction> {
    return this.reactions;
  }

  /**
   * Dispara a avaliação de reações após a conclusão de uma escala.
   * Retorna um novo estado (imutável) com a fila de fluxo e flags atualizadas.
   */
  public dispatch(
    result: SchemaScoreResult,
    currentState: DAGState,
    context?: EvaluationContext,
  ): DAGState {
    const nextCompleted = currentState.completed.includes(result.scale_code)
      ? currentState.completed
      : [...currentState.completed, result.scale_code];

    let nextFlow = [...currentState.flow];
    let nextSafetyPlan = currentState.safetyPlanTriggered;
    const nextLogs = [...currentState.logs];

    // Ordena reações por prioridade descendente
    const matchingReactions = this.reactions
      .filter((r) => r.source === result.scale_code)
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    const currentIndex = nextFlow.indexOf(result.scale_code);
    let insertIndex = currentIndex >= 0 ? currentIndex + 1 : nextFlow.length;

    for (const reaction of matchingReactions) {
      if (!reaction.condition(result)) {
        continue;
      }

      const reactionId =
        reaction.id ?? `${reaction.source}->${reaction.action}->${reaction.target ?? "SAFETY"}`;

      if (reaction.action === "TRIGGER_SAFETY_PLAN") {
        nextSafetyPlan = true;

        if (reaction.target) {
          const target = reaction.target;
          if (!nextFlow.includes(target) && !nextCompleted.includes(target)) {
            // Em emergência, injeta logo no próximo índice
            nextFlow.splice(insertIndex, 0, target);
            insertIndex++;
          }
        }

        nextLogs.push({
          timestamp: Date.now(),
          reactionId,
          source: reaction.source,
          action: reaction.action,
          target: reaction.target,
          description:
            reaction.description ??
            `Plano de segurança ativado devido a sinalização de risco em ${reaction.source}`,
        });
      } else if (reaction.action === "INJECT_SCALE" && reaction.target) {
        const target = reaction.target;

        // Trava biológica masculina: impede injeção indevida de EPDS em homens
        if (target === "EPDS" && isMaleSex(context?.sex)) {
          continue;
        }

        if (!nextFlow.includes(target) && !nextCompleted.includes(target)) {
          nextFlow.splice(insertIndex, 0, target);
          insertIndex++;

          nextLogs.push({
            timestamp: Date.now(),
            reactionId,
            source: reaction.source,
            action: reaction.action,
            target,
            description:
              reaction.description ??
              `Escala ${target} injetada no fluxo a partir do resultado de ${reaction.source}`,
          });
        }
      } else if (reaction.action === "REMOVE_SCALE" && reaction.target) {
        const target = reaction.target;
        if (nextFlow.includes(target)) {
          nextFlow = nextFlow.filter((s) => s !== target);

          nextLogs.push({
            timestamp: Date.now(),
            reactionId,
            source: reaction.source,
            action: reaction.action,
            target,
            description:
              reaction.description ??
              `Escala ${target} removida do fluxo por regra de exclusão de ${reaction.source}`,
          });
        }
      }
    }

    return {
      flow: nextFlow,
      completed: nextCompleted,
      safetyPlanTriggered: nextSafetyPlan,
      logs: nextLogs,
    };
  }

  /**
   * Algoritmo de Detecção de Ciclos em Grafos Direcionados (DFS).
   * Considera apenas reações onde action === 'INJECT_SCALE' ou 'TRIGGER_SAFETY_PLAN' com target.
   * Retorna o caminho do ciclo (ex: ['A', 'B', 'A']) ou null se acíclico.
   */
  public static detectCycle(reactions: ScaleReaction[]): string[] | null {
    const adj = new Map<string, string[]>();

    for (const r of reactions) {
      if (r.target && (r.action === "INJECT_SCALE" || r.action === "TRIGGER_SAFETY_PLAN")) {
        if (!adj.has(r.source)) {
          adj.set(r.source, []);
        }
        adj.get(r.source)!.push(r.target);
      }
    }

    const visited = new Set<string>();
    const recStack = new Set<string>();
    const path: string[] = [];

    function dfs(node: string): string[] | null {
      visited.add(node);
      recStack.add(node);
      path.push(node);

      const neighbors = adj.get(node) ?? [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          const cycle = dfs(neighbor);
          if (cycle) return cycle;
        } else if (recStack.has(neighbor)) {
          const cycleStart = path.indexOf(neighbor);
          return [...path.slice(cycleStart), neighbor];
        }
      }

      recStack.delete(node);
      path.pop();
      return null;
    }

    for (const node of adj.keys()) {
      if (!visited.has(node)) {
        const cycle = dfs(node);
        if (cycle) return cycle;
      }
    }

    return null;
  }
}
