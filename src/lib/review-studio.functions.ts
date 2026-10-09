/**
 * Server Functions do Estúdio de validação.
 *
 * Acesso por LINK PESSOAL: cada avaliador tem um token secreto (guardado só como hash). O token vai no
 * CORPO de requisições POST (nunca na URL, para não cair em log). Quem avalia NÃO é usuário do sistema
 * e não tem papel em user_roles: as tabelas review_* não são concedidas a anon/authenticated e todo
 * acesso passa por aqui, via service_role, depois de validar o token (ver migração 20261008100000).
 */

import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  authenticateReviewer,
  requireDecisor,
  type Reviewer,
  type ReviewerRow,
} from "./review-access";
import {
  DECISION_KINDS,
  REVIEW_DECISIONS,
  buildExport,
  decisionProblem,
  responseProblem,
  visibleResponses,
  type ReviewFinalDecision,
  type ReviewerResumo,
  type ReviewItem,
  type ReviewResponse,
} from "./review-studio";

// As tabelas review_* ainda não estão em integrations/supabase/types.ts (arquivo gerado a partir do
// banco depois que a migração for aplicada) — por isso o cliente sem tipos aqui.
async function admin(): Promise<SupabaseClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
}

async function reviewerFromToken(db: SupabaseClient, token: unknown): Promise<Reviewer> {
  const reviewer = await authenticateReviewer(token, async (hash) => {
    const { data } = await db
      .from("review_reviewers")
      .select("id, name, role, is_active, revoked_at")
      .eq("token_hash", hash)
      .maybeSingle();
    return (data as ReviewerRow | null) ?? null;
  });
  // Registro de último acesso; se falhar, não derruba a requisição.
  await db
    .from("review_reviewers")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", reviewer.id);
  return reviewer;
}

type RespRow = Omit<ReviewResponse, "reviewer_name"> & {
  review_reviewers: { name: string } | null;
};

const RESP_COLS =
  "item_id, reviewer_id, decision, choice, comment, revision, updated_at, review_reviewers(name)";

function toResponse(r: RespRow): ReviewResponse {
  const { review_reviewers: rv, ...rest } = r;
  return { ...rest, reviewer_name: rv?.name ?? "Avaliador" };
}

type DecRow = Omit<ReviewFinalDecision, "decided_by_name"> & {
  review_reviewers: { name: string } | null;
};

const DEC_COLS =
  "item_id, decision, choice, rationale, decided_at, votes_snapshot, review_reviewers(name)";

function toDecision(d: DecRow): ReviewFinalDecision {
  const { review_reviewers: rv, ...rest } = d;
  return { ...rest, decided_by_name: rv?.name ?? "Decisor" };
}

export type ReviewCatalog = {
  me: Reviewer;
  items: ReviewItem[];
  /** Respostas visíveis a este avaliador (cego até responder: ver visibleResponses). */
  responses: ReviewResponse[];
  /** Só para o decisor (aba Decidir): todas as respostas. Nulo para os demais. */
  all_responses: ReviewResponse[] | null;
  decisions: ReviewFinalDecision[];
  /** Só para o decisor (Resumo, “quem já participou”). Nulo para os demais. */
  reviewers: ReviewerResumo[] | null;
};

const tokenInput = z.object({ token: z.string().max(200) });

async function loadAll(db: SupabaseClient) {
  const [itemsRes, respRes, decRes] = await Promise.all([
    db
      .from("review_items")
      .select("id, kind, ref, title, project, section, version, body, media_url, sort_order")
      .eq("is_active", true)
      .order("kind", { ascending: true })
      .order("sort_order", { ascending: true }),
    db.from("review_responses").select(RESP_COLS),
    db.from("review_decisions").select(DEC_COLS).is("superseded_at", null),
  ]);
  if (itemsRes.error) throw new Error("Falha ao carregar o catálogo de validação.");
  if (respRes.error) throw new Error("Falha ao carregar as respostas.");
  if (decRes.error) throw new Error("Falha ao carregar as decisões.");
  return {
    items: (itemsRes.data ?? []) as ReviewItem[],
    responses: ((respRes.data ?? []) as unknown as RespRow[]).map(toResponse),
    decisions: ((decRes.data ?? []) as unknown as DecRow[]).map(toDecision),
  };
}

async function loadReviewers(db: SupabaseClient): Promise<ReviewerResumo[]> {
  const { data, error } = await db
    .from("review_reviewers")
    .select("id, name, role, last_seen_at")
    .eq("is_active", true)
    .is("revoked_at", null);
  if (error) throw new Error("Falha ao carregar os avaliadores.");
  return (data ?? []) as ReviewerResumo[];
}

/** Catálogo + respostas visíveis a este avaliador + decisões finais. POST para o token não ir na URL. */
export const listReviewCatalog = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => tokenInput.parse(raw))
  .handler(async ({ data }): Promise<ReviewCatalog> => {
    const db = await admin();
    const me = await reviewerFromToken(db, data.token);
    const all = await loadAll(db);
    return {
      me,
      items: all.items,
      responses: visibleResponses(all.responses, me.id),
      all_responses: me.role === "decisor" ? all.responses : null,
      decisions: all.decisions,
      reviewers: me.role === "decisor" ? await loadReviewers(db) : null,
    };
  });

const saveInput = z.object({
  token: z.string().max(200),
  item_id: z.string().uuid(),
  decision: z.enum(REVIEW_DECISIONS),
  choice: z.string().trim().max(40).nullish(),
  comment: z.string().trim().max(4000).nullish(),
});

/** Grava (ou atualiza) a resposta do avaliador e registra o evento no histórico. */
export const saveReviewResponse = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => saveInput.parse(raw))
  .handler(async ({ data }): Promise<ReviewResponse> => {
    const problem = responseProblem(data.decision, data.choice, data.comment);
    if (problem) throw new Error(problem);

    const db = await admin();
    const me = await reviewerFromToken(db, data.token);

    const { data: existing } = await db
      .from("review_responses")
      .select("revision")
      .eq("item_id", data.item_id)
      .eq("reviewer_id", me.id)
      .maybeSingle();
    const revision = ((existing as { revision?: number } | null)?.revision ?? 0) + 1;

    const { data: saved, error } = await db
      .from("review_responses")
      .upsert(
        {
          item_id: data.item_id,
          reviewer_id: me.id,
          decision: data.decision,
          choice: data.choice ?? null,
          comment: data.comment ?? null,
          revision,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "item_id,reviewer_id" },
      )
      .select(RESP_COLS)
      .single();
    if (error || !saved) throw new Error("Não foi possível salvar a resposta. Tente de novo.");

    // Histórico append-only. Se falhar, a resposta atual já está salva: registra e segue.
    const { error: evError } = await db.from("review_response_events").insert({
      item_id: data.item_id,
      reviewer_id: me.id,
      decision: data.decision,
      choice: data.choice ?? null,
      comment: data.comment ?? null,
      revision,
    });
    if (evError)
      console.error("[review-studio] falha ao gravar evento de histórico", evError.message);

    return toResponse(saved as unknown as RespRow);
  });

const decisionInput = z.object({
  token: z.string().max(200),
  item_id: z.string().uuid(),
  decision: z.enum(DECISION_KINDS),
  choice: z.string().trim().max(40).nullish(),
  rationale: z.string().trim().max(4000),
});

/** Decisão FINAL do item. Só o decisor. Guarda a foto dos votos e substitui a decisão anterior (atômico). */
export const saveReviewDecision = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => decisionInput.parse(raw))
  .handler(async ({ data }): Promise<ReviewFinalDecision> => {
    const db = await admin();
    const me = await reviewerFromToken(db, data.token);
    requireDecisor(me);
    const problem = decisionProblem(data.decision, data.choice, data.rationale);
    if (problem) throw new Error(problem);

    const { data: rows, error: rErr } = await db
      .from("review_responses")
      .select(RESP_COLS)
      .eq("item_id", data.item_id);
    if (rErr) throw new Error("Falha ao ler os votos deste item.");
    const snapshot = ((rows ?? []) as unknown as RespRow[]).map((r) => ({
      reviewer: r.review_reviewers?.name ?? "Avaliador",
      decision: r.decision,
      choice: r.choice,
      comment: r.comment,
    }));

    const { error } = await db.rpc("review_record_decision", {
      p_item: data.item_id,
      p_decided_by: me.id,
      p_decision: data.decision,
      p_choice: data.choice ?? null,
      p_rationale: data.rationale,
      p_snapshot: snapshot,
    });
    if (error) throw new Error("Não foi possível gravar a decisão. Tente de novo.");

    const { data: dec } = await db
      .from("review_decisions")
      .select(DEC_COLS)
      .eq("item_id", data.item_id)
      .is("superseded_at", null)
      .single();
    return toDecision(dec as unknown as DecRow);
  });

/** Exportação completa (CSV, ata em Markdown e JSON) para guardar fora do banco. Só o decisor. */
export const exportReviewData = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => tokenInput.parse(raw))
  .handler(async ({ data }): Promise<{ csv: string; ata: string; json: string }> => {
    const db = await admin();
    const me = await reviewerFromToken(db, data.token);
    requireDecisor(me);
    const all = await loadAll(db);
    const geradoEm = new Date().toISOString();
    const { csv, ata } = buildExport(all.items, all.responses, all.decisions, geradoEm);
    return {
      csv,
      ata,
      json: JSON.stringify({ gerado_em: geradoEm, ...all }, null, 1),
    };
  });
