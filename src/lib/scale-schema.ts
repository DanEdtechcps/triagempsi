/**
 * Validação de runtime (Zod) para o tipo `Scale` (src/lib/scale-types.ts).
 *
 * O tipo TypeScript por si só não impede uma escala mal formada de entrar em
 * `ALL_SCALES` — os achados #34, #35 e #43 da auditoria clínica nasceram
 * exatamente de inconsistências entre arquivos de escala que o compilador
 * não pega (campo opcional preenchido diferente entre escalas, banda que não
 * cobre todo o intervalo possível, item de risco referenciando id errado).
 * `validateScales` centraliza essas checagens — hoje fragmentadas em vários
 * arquivos de teste — e roda uma vez, no import de `scales-data.ts`, sobre
 * `ALL_SCALES` inteiro.
 */

import { z } from "zod";
import type { Scale, ScaleBand, ScaleItem, SubscaleDef } from "./scale-types";

export const LikertOptionSchema = z.object({
  label: z.string().min(1, "label não pode ser vazio"),
  value: z.number().int("value deve ser um inteiro"),
});

const ScaleItemSchema = z.object({
  id: z.string().min(1, "id do item não pode ser vazio"),
  text: z.string().min(1, "text do item não pode ser vazio"),
  options: z.array(LikertOptionSchema).min(1).optional(),
  branchGroup: z.string().min(1).optional(),
  isGateway: z.boolean().optional(),
});

const scaleBandFields = {
  min: z.number().int().nonnegative(),
  max: z.number().int().nonnegative(),
  label: z.string().min(1),
  // 0 = mínimo .. 4 = grave (ver comentário do tipo ScaleBand)
  level: z.number().int().min(0).max(4),
};

const ScaleBandSchema = z
  .object(scaleBandFields)
  .refine((b) => b.max >= b.min, { message: "banda com max menor que min", path: ["max"] });

const SubscaleBandSchema = z
  .object({ ...scaleBandFields, recommendation: z.string().min(1).optional() })
  .refine((b) => b.max >= b.min, { message: "banda com max menor que min", path: ["max"] });

const SubscaleDefSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  items: z.array(z.string().min(1)).min(1),
  bands: z.array(SubscaleBandSchema).min(1),
});

const SCALE_DOMAINS = [
  "depressao",
  "ansiedade",
  "risco",
  "trauma",
  "alcool",
  "somatico",
  "geral",
  "tdah",
  "obsessivo",
  "bipolar",
  "tabaco",
  "perinatal",
  "alimentar",
  "sono",
  "neurodesenvolvimento",
  "cognitivo",
  "ocupacional",
] as const;

/**
 * Bandas (ou bandas de subescala) precisam cobrir 0..max sem buraco nem
 * sobreposição — mesma regra já testada isoladamente em scoring.test.ts,
 * agora centralizada aqui para rodar sobre toda escala/subescala no import.
 */
function bandCoverageError(bands: { min: number; max: number }[]): string | null {
  // Lista vazia já é reportada pelo .min(1) do campo `bands`/`sub.bands` —
  // aqui só evita acessar sorted[0] fora dos limites.
  if (bands.length === 0) return null;
  const sorted = [...bands].sort((a, b) => a.min - b.min);
  if (sorted[0].min !== 0) {
    return `primeira banda deveria começar em 0 (começa em ${sorted[0].min})`;
  }
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].min !== sorted[i - 1].max + 1) {
      return `banda índice ${i} não é contígua à anterior (esperado min=${sorted[i - 1].max + 1}, obtido min=${sorted[i].min})`;
    }
  }
  return null;
}

/**
 * Valor máximo que um item pode contribuir ao escore, resolvido do mesmo
 * jeito que `getItemOptions` (scales-data.ts): opções do próprio item têm
 * prioridade; na ausência delas, cai para `scale.options`.
 *
 * Retorna `null` quando nem o item nem a escala declaram opções resolvíveis
 * pelo tipo `Scale` — caso real do AUDIT e AUDIT-C, cujas opções verdadeiras
 * vivem em mapas externos (`AUDIT_OPTIONS`/`AUDIT_C_OPTIONS` em
 * scales-data.ts) fora do tipo `Scale` e, portanto, invisíveis para este
 * schema. Quando isso acontece, a checagem de soma total (abaixo) é pulada
 * para aquela escala — não é um dado inválido, é um limite conhecido do
 * tipo atual (ver achado novo documentado no PR desta mudança).
 */
function resolvedItemMax(
  scale: Pick<Scale, "options">,
  item: Pick<ScaleItem, "options">,
): number | null {
  const opts = item.options ?? (scale.options.length > 0 ? scale.options : null);
  if (!opts || opts.length === 0) return null;
  return Math.max(...opts.map((o) => o.value));
}

export const ScaleSchema = z
  .object({
    code: z.string().min(1),
    name: z.string().min(1),
    fullName: z.string().min(1),
    domain: z.enum(SCALE_DOMAINS),
    instructions: z.string().min(1),
    timeframe: z.string().min(1).optional(),
    options: z.array(LikertOptionSchema),
    items: z.array(ScaleItemSchema).min(1),
    bands: z.array(ScaleBandSchema).min(1),
    positiveCutoff: z.number().int().nonnegative().optional(),
    triggersScale: z.string().min(1).optional(),
    informantMode: z.enum(["auto", "hetero", "ambos"]).optional(),
    minAge: z.number().int().nonnegative().optional(),
    maxAge: z.number().int().nonnegative().optional(),
    quietIfOutOfRange: z.boolean().optional(),
    status: z.enum(["ativa", "estrutura"]).optional(),
    licenseNote: z.string().min(1).optional(),
    riskItems: z.array(z.string().min(1)).optional(),
    reverseYes: z.array(z.string().min(1)).optional(),
    reverseNo: z.array(z.string().min(1)).optional(),
    subscales: z.array(SubscaleDefSchema).optional(),
  })
  .superRefine((scale, ctx) => {
    const itemIds = scale.items.map((i) => i.id);
    const dupItemIds = [...new Set(itemIds.filter((id, idx) => itemIds.indexOf(id) !== idx))];
    if (dupItemIds.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["items"],
        message: `ids de item duplicados: ${dupItemIds.join(", ")}`,
      });
    }

    if (scale.minAge != null && scale.maxAge != null && scale.minAge > scale.maxAge) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minAge"],
        message: `minAge (${scale.minAge}) maior que maxAge (${scale.maxAge})`,
      });
    }

    const bandErr = bandCoverageError(scale.bands);
    if (bandErr) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bands"],
        message: `bandas não cobrem 0..max contiguamente: ${bandErr}`,
      });
    }
    const topBandMax = Math.max(...scale.bands.map((b) => b.max));

    // Item com options: values precisam ser compatíveis com a banda mais
    // alta declarada — nenhuma opção isolada pode valer mais que o escore
    // máximo da própria escala.
    for (const item of scale.items) {
      if (!item.options) continue;
      const maxVal = Math.max(...item.options.map((o) => o.value));
      if (maxVal > topBandMax) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items"],
          message: `item "${item.id}" tem opção com value ${maxVal}, maior que o máximo da banda mais alta (${topBandMax})`,
        });
      }
    }

    // Cobertura completa: soma dos valores máximos de cada item deve bater
    // com o máximo da banda mais alta — só roda quando todo item tem opções
    // resolvíveis pelo tipo Scale (ver resolvedItemMax).
    const resolvedMaxes = scale.items.map((item) => resolvedItemMax(scale, item));
    if (resolvedMaxes.every((v): v is number => v != null)) {
      const sum = resolvedMaxes.reduce((a, b) => a + b, 0);
      if (sum !== topBandMax) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["bands"],
          message: `soma dos valores máximos dos itens (${sum}) não bate com o máximo da banda mais alta (${topBandMax})`,
        });
      }
    }

    for (const riskId of scale.riskItems ?? []) {
      if (!itemIds.includes(riskId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["riskItems"],
          message: `riskItems referencia item inexistente: "${riskId}"`,
        });
      }
    }

    // Ramificação: todo grupo referenciado por branchGroup precisa ter
    // exatamente uma pergunta-porta (isGateway); e isGateway sem
    // branchGroup não faz sentido (não há grupo para encerrar).
    const branchGroups = new Set(
      scale.items.map((i) => i.branchGroup).filter((g): g is string => typeof g === "string"),
    );
    for (const group of branchGroups) {
      const gateways = scale.items.filter((i) => i.branchGroup === group && i.isGateway);
      if (gateways.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items"],
          message: `grupo de ramificação "${group}" não tem pergunta-porta (isGateway)`,
        });
      } else if (gateways.length > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items"],
          message: `grupo de ramificação "${group}" tem mais de uma pergunta-porta: ${gateways
            .map((i) => i.id)
            .join(", ")}`,
        });
      }
    }
    for (const item of scale.items) {
      if (item.isGateway && !item.branchGroup) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items"],
          message: `item "${item.id}" marcado isGateway sem branchGroup`,
        });
      }
    }

    // Subescalas: itens referenciados precisam existir na escala, e as
    // bandas de cada subescala seguem a mesma regra de cobertura/soma.
    for (const sub of scale.subscales ?? []) {
      const missing = sub.items.filter((id) => !itemIds.includes(id));
      if (missing.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["subscales"],
          message: `subescala "${sub.key}" referencia item inexistente: ${missing.join(", ")}`,
        });
        continue;
      }

      const subBandErr = bandCoverageError(sub.bands);
      if (subBandErr) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["subscales"],
          message: `subescala "${sub.key}": bandas não cobrem 0..max contiguamente: ${subBandErr}`,
        });
      }

      const subTopMax = Math.max(...sub.bands.map((b) => b.max));
      const subItems = scale.items.filter((i) => sub.items.includes(i.id));
      const subResolved = subItems.map((item) => resolvedItemMax(scale, item));
      if (subResolved.every((v): v is number => v != null)) {
        const sum = subResolved.reduce((a, b) => a + b, 0);
        if (sum !== subTopMax) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["subscales"],
            message: `subescala "${sub.key}": soma dos valores máximos dos itens (${sum}) não bate com o máximo da banda mais alta (${subTopMax})`,
          });
        }
      }
    }
  });

export type ScaleSchemaInput = z.input<typeof ScaleSchema>;

/**
 * Valida uma lista de escalas contra `ScaleSchema` mais a unicidade de
 * `code` entre elas (`Object.fromEntries` em `SCALE_BY_CODE` sobrescreve
 * colisões silenciosamente — esta checagem é o que falta pra pegar isso).
 * Lança um único erro agregando todos os problemas encontrados, em vez de
 * parar no primeiro — falha alta e completa, para quem for corrigir não
 * precisar rodar a validação várias vezes.
 */
export function validateScales(scales: readonly Scale[]): void {
  const problems: string[] = [];

  for (const scale of scales) {
    const result = ScaleSchema.safeParse(scale);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const path = issue.path.length > 0 ? issue.path.join(".") : "(raiz)";
        problems.push(`[${scale.code ?? "?"}] ${path}: ${issue.message}`);
      }
    }
  }

  const codeCounts = new Map<string, number>();
  for (const scale of scales) {
    codeCounts.set(scale.code, (codeCounts.get(scale.code) ?? 0) + 1);
  }
  for (const [code, count] of codeCounts) {
    if (count > 1) {
      problems.push(`code duplicado entre escalas de ALL_SCALES: "${code}" aparece ${count} vezes`);
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `Validação de escalas falhou (${problems.length} problema(s)):\n` + problems.join("\n"),
    );
  }
}

export type { Scale, ScaleBand, ScaleItem, SubscaleDef };
