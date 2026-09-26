/**
 * Server Functions — Geração de conteúdo de psicoeducação assistida por IA.
 *
 * Fase 1 (implementada aqui): leitura, quiz e flashcards via Cloudflare
 * Workers AI, rodando dentro do próprio Worker — sem custo por token, sem
 * dependência de cookie de sessão externo.
 * Fase 2 (documentada, não implementada): podcast, infográfico e vídeo via
 * NotebookLM, gerados por um runner externo (`content-pipeline/`) que faz
 * polling nesta mesma fila. Um pedido com formatos de mídia cria um job
 * separado com `engine='notebooklm'` e `status='pendente'`, que fica
 * aguardando esse runner (ainda não existe) — isto é esperado nesta etapa.
 *
 * Nenhuma geração publica sozinha: só `approvePsychoeducationGenerationJob`
 * marca `psychoeducation_contents.is_published = true`.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireGlobalAdmin } from "@/lib/admin-guard.server";
import { runPsychoeducationQC } from "@/lib/psychoeducation-qc";
import { getWorkersAI } from "@/lib/workers-ai.server";
import type { Json } from "@/integrations/supabase/types";

export const TEXT_FORMATS = ["leitura", "quiz", "flashcards"] as const;
export const MEDIA_FORMATS = ["podcast", "infografico", "video"] as const;
export type TextFormat = (typeof TEXT_FORMATS)[number];
export type MediaFormat = (typeof MEDIA_FORMATS)[number];
const ALL_FORMATS = [...TEXT_FORMATS, ...MEDIA_FORMATS] as const;

/** Separa os formatos pedidos entre os dois motores (Fase 1 / Fase 2). */
export function partitionRequestedFormats(formats: readonly string[]): {
  textFormats: TextFormat[];
  mediaFormats: MediaFormat[];
} {
  return {
    textFormats: formats.filter((f): f is TextFormat =>
      (TEXT_FORMATS as readonly string[]).includes(f),
    ),
    mediaFormats: formats.filter((f): f is MediaFormat =>
      (MEDIA_FORMATS as readonly string[]).includes(f),
    ),
  };
}

/**
 * Extrai o primeiro array JSON válido de uma resposta de LLM em texto livre
 * (modelos de texto geram markdown/comentário ao redor do JSON pedido, então
 * `JSON.parse` direto falha na maioria das respostas reais).
 *
 * Aceita `unknown`, não `string`: o Workers AI já foi observado devolvendo
 * `response` num formato que não é string pura para alguns prompts (bug
 * real em produção — "raw.match is not a function"), então qualquer entrada
 * que não seja string ou array precisa virar `null` em vez de estourar.
 */
export function extractJsonArray(raw: unknown): Json[] | null {
  if (Array.isArray(raw)) return raw as Json[];
  if (typeof raw !== "string") return null;

  try {
    const direct = JSON.parse(raw) as unknown;
    if (Array.isArray(direct)) return direct as Json[];
  } catch {
    // segue para a extração por regex abaixo
  }
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as unknown;
    return Array.isArray(parsed) ? (parsed as Json[]) : null;
  } catch {
    return null;
  }
}

export function buildWorkersAiPrompt(sourceMaterial: string, format: TextFormat): string {
  const base =
    "Você é um redator de psicoeducação para uma plataforma clínica de pré-triagem psiquiátrica. " +
    "Tom: acolhedor, técnico-acessível, sem sensacionalismo, sem prometer cura. Nunca diagnostique, " +
    'nunca sugira dose de medicamento, nunca nomeie um médico específico (use "profissional ' +
    'especializado"). Se o assunto tocar em risco/crise, inclua sempre CVV 188 e SAMU 192.\n\n' +
    `Material de referência (diretriz clínica):\n"""\n${sourceMaterial}\n"""\n\n`;

  switch (format) {
    case "leitura":
      return (
        base +
        "Escreva um texto de leitura para o paciente, em português, com 3 a 5 parágrafos curtos."
      );
    case "quiz":
      return (
        base +
        "Gere um quiz de 5 perguntas de múltipla escolha em JSON, como um array de objetos " +
        '{"question": string, "options": string[4], "correct_index": number, "explanation": string}. ' +
        "Responda APENAS com o array JSON, sem texto ao redor."
      );
    case "flashcards":
      return (
        base +
        'Gere 6 flashcards em JSON, como um array de objetos {"front": string, "back": string}. ' +
        "Responda APENAS com o array JSON, sem texto ao redor."
      );
  }
}

// `response` é tipado como `unknown` de propósito — o binding do Workers AI
// já foi observado devolvendo algo que não é string pura pra este modelo.
type WorkersAiTextResult = { response?: unknown };

// @cf/meta/llama-3.1-8b-instruct (sem sufixo) foi descontinuado pela
// Cloudflare em 2026-05-30 e passou a resolver silenciosamente para uma
// variante "infire" também descontinuada — todo job caía em "erro". Usar o
// nome exato do catálogo vigente (`wrangler ai models list`), não o alias
// antigo. Llama 3.3 70B fp8-fast: melhor qualidade de português que o 8B
// para texto clínico, e "fast" porque é otimizado pra latência apesar do
// tamanho.
export const WORKERS_AI_TEXT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

// O default do modelo é max_tokens=256 — curto demais até pra um único
// parágrafo de leitura, e cortaria o JSON de quiz/flashcards no meio,
// quebrando o parse. Cada formato tem seu próprio teto generoso.
const MAX_TOKENS_BY_FORMAT: Record<TextFormat, number> = {
  leitura: 900,
  quiz: 1400,
  flashcards: 1200,
};

async function runWorkersAiTextFormat(
  ai: ReturnType<typeof getWorkersAI>,
  sourceMaterial: string,
  format: TextFormat,
): Promise<{ body_md: string | null; data_json: Json[] | null }> {
  const prompt = buildWorkersAiPrompt(sourceMaterial, format);
  const result = (await ai.run(WORKERS_AI_TEXT_MODEL, {
    prompt,
    max_tokens: MAX_TOKENS_BY_FORMAT[format],
  })) as WorkersAiTextResult;
  // response nem sempre é string pura (bug real em produção — ver
  // extractJsonArray) — nunca chama .trim()/.match() sem checar o tipo
  // primeiro.
  const rawResponse = result?.response;

  if (format === "leitura") {
    const text = typeof rawResponse === "string" ? rawResponse : "";
    return { body_md: text.trim(), data_json: null };
  }
  return { body_md: null, data_json: extractJsonArray(rawResponse) };
}

const requestSchema = z
  .object({
    clinic_id: z.string().uuid().nullable().optional(),
    topic_id: z.string().uuid().nullable().optional(),
    topic_title_draft: z.string().trim().min(3).max(160).nullable().optional(),
    // Sem limite máximo de propósito (pedido explícito) — material muito
    // grande estourar o contexto do modelo é um problema do lado da
    // geração (vira status "erro" no job com a mensagem real), não algo
    // que a validação de entrada deva bloquear preventivamente.
    source_material: z
      .string()
      .trim()
      .min(50, { message: "O material precisa ter pelo menos 50 caracteres." }),
    confirmed_no_patient_data: z.literal(true, {
      errorMap: () => ({
        message: "É preciso confirmar que o material não contém dado de paciente.",
      }),
    }),
    requested_formats: z.array(z.enum(ALL_FORMATS)).min(1),
    is_crisis_topic: z.boolean().default(false),
  })
  .refine((v) => Boolean(v.topic_id) || Boolean(v.topic_title_draft), {
    message: "Escolha um tópico existente ou informe o título de um tópico novo.",
    path: ["topic_id"],
  });

/**
 * Extrai uma mensagem legível de um erro de server function.
 *
 * O `inputValidator` usa `schema.parse(raw)` (mesmo padrão de
 * `admin.functions.ts`), e quando a validação falha o `.message` do erro que
 * chega ao cliente é o JSON bruto dos issues do Zod (ex.:
 * `[{"code":"too_big","message":"...",...}]`) — ilegível para o usuário
 * final. Detecta esse formato e mostra só as mensagens; senão, devolve a
 * mensagem original (ou um texto genérico).
 */
export function humanizeServerFnError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    try {
      const issues = JSON.parse(trimmed) as Array<{ message?: string }>;
      const messages = issues.map((i) => i.message).filter((m): m is string => Boolean(m));
      if (messages.length > 0) return messages.join(" ");
    } catch {
      // não era JSON de issues do Zod — cai no retorno padrão abaixo
    }
  }
  return raw || "Não foi possível concluir a operação.";
}

export type PsychoeducationGenerationJob = {
  id: string;
  clinic_id: string | null;
  topic_id: string | null;
  topic_title_draft: string | null;
  requested_formats: string[];
  engine: string;
  status: string;
  qc_notes: string[] | null;
  error_message: string | null;
  created_at: string;
};

export const requestPsychoeducationGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => requestSchema.parse(raw))
  .handler(async ({ data, context }): Promise<{ jobIds: string[] }> => {
    await requireGlobalAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { recordAudit } = await import("@/lib/audit.server");
    const actorEmail = (context.claims as { email?: string })?.email ?? null;

    const { textFormats, mediaFormats } = partitionRequestedFormats(data.requested_formats);
    const jobIds: string[] = [];

    if (textFormats.length > 0) {
      const { data: job, error: insertError } = await supabaseAdmin
        .from("psychoeducation_generation_jobs")
        .insert({
          clinic_id: data.clinic_id ?? null,
          topic_id: data.topic_id ?? null,
          topic_title_draft: data.topic_title_draft ?? null,
          source_material: data.source_material,
          confirmed_no_patient_data: true,
          requested_formats: textFormats,
          engine: "workers_ai",
          status: "gerando",
          requested_by: context.userId,
        })
        .select("id")
        .single();
      if (insertError || !job) {
        console.error("requestPsychoeducationGeneration insert (workers_ai)", insertError);
        throw new Error("Não foi possível criar o job de geração de texto.");
      }
      jobIds.push(job.id);
      await runTextGenerationJob(job.id, data.source_material, textFormats, data.is_crisis_topic);
    }

    if (mediaFormats.length > 0) {
      // Fase 2 (não implementada nesta etapa): fica "pendente" aguardando o
      // runner externo (content-pipeline/) que ainda não existe. Ver plano.
      const { data: job, error: insertError } = await supabaseAdmin
        .from("psychoeducation_generation_jobs")
        .insert({
          clinic_id: data.clinic_id ?? null,
          topic_id: data.topic_id ?? null,
          topic_title_draft: data.topic_title_draft ?? null,
          source_material: data.source_material,
          confirmed_no_patient_data: true,
          requested_formats: mediaFormats,
          engine: "notebooklm",
          status: "pendente",
          requested_by: context.userId,
        })
        .select("id")
        .single();
      if (insertError || !job) {
        console.error("requestPsychoeducationGeneration insert (notebooklm)", insertError);
        throw new Error("Não foi possível criar o job de geração de mídia.");
      }
      jobIds.push(job.id);
    }

    await recordAudit({
      action: "psychoeducation_generation_requested",
      clinicId: data.clinic_id ?? null,
      actorUserId: context.userId,
      actorEmail,
      entityType: "psychoeducation_generation_job",
      entityId: jobIds[0] ?? null,
      details: { jobIds, requested_formats: data.requested_formats },
    });

    return { jobIds };
  });

/** Roda a geração Workers AI de um job e grava o resultado + QC. */
async function runTextGenerationJob(
  jobId: string,
  sourceMaterial: string,
  formats: TextFormat[],
  isCrisisTopic: boolean,
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  try {
    const ai = getWorkersAI();
    const allNotes: string[] = [];
    let hasCriticalIssues = false;

    for (const format of formats) {
      const { body_md, data_json } = await runWorkersAiTextFormat(ai, sourceMaterial, format);
      const textForQc = body_md ?? JSON.stringify(data_json ?? "");
      const qc = runPsychoeducationQC(textForQc, { isCrisisTopic });
      allNotes.push(...qc.notes.map((n) => `[${format}] ${n}`));
      hasCriticalIssues = hasCriticalIssues || qc.hasCriticalIssues;

      const { error: assetError } = await supabaseAdmin
        .from("psychoeducation_generated_assets")
        .insert({ job_id: jobId, kind: format, body_md, data_json });
      if (assetError) throw new Error(`Falha ao gravar asset ${format}: ${assetError.message}`);
    }

    await supabaseAdmin
      .from("psychoeducation_generation_jobs")
      .update({
        status: "aguardando_aprovacao",
        qc_notes: allNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (hasCriticalIssues) {
      console.warn(`psychoeducation job ${jobId} chegou a aguardando_aprovacao com QC crítico`);
    }
  } catch (error) {
    console.error("runTextGenerationJob", error);
    await supabaseAdmin
      .from("psychoeducation_generation_jobs")
      .update({
        status: "erro",
        error_message: error instanceof Error ? error.message : String(error),
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  }
}

export type PsychoeducationTopicOption = { id: string; title: string; slug: string };

export const listPsychoeducationTopicsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PsychoeducationTopicOption[]> => {
    await requireGlobalAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("psychoeducation_topics")
      .select("id, title, slug")
      .order("sort_order", { ascending: true });
    if (error) throw new Error("Não foi possível carregar os tópicos.");
    return data ?? [];
  });

export const listPsychoeducationGenerationJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ clinic_id: z.string().uuid().nullable().optional() }).parse(raw ?? {}),
  )
  .handler(async ({ data, context }): Promise<PsychoeducationGenerationJob[]> => {
    await requireGlobalAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("psychoeducation_generation_jobs")
      .select(
        "id, clinic_id, topic_id, topic_title_draft, requested_formats, engine, status, qc_notes, error_message, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(50);
    if (data.clinic_id) query = query.eq("clinic_id", data.clinic_id);
    const { data: jobs, error } = await query;
    if (error) throw new Error("Não foi possível carregar os jobs de geração.");
    return jobs ?? [];
  });

export type PsychoeducationGeneratedAsset = {
  id: string;
  job_id: string;
  kind: string;
  body_md: string | null;
  data_json: Json | null;
  media_url: string | null;
  status: string;
};

export const listPsychoeducationGeneratedAssets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ job_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }): Promise<PsychoeducationGeneratedAsset[]> => {
    await requireGlobalAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: assets, error } = await supabaseAdmin
      .from("psychoeducation_generated_assets")
      .select("id, job_id, kind, body_md, data_json, media_url, status")
      .eq("job_id", data.job_id);
    if (error) throw new Error("Não foi possível carregar os materiais gerados.");
    return assets ?? [];
  });

export const approvePsychoeducationGenerationJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ job_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await requireGlobalAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { recordAudit } = await import("@/lib/audit.server");

    const { data: job, error: jobError } = await supabaseAdmin
      .from("psychoeducation_generation_jobs")
      .select("id, clinic_id, topic_id, topic_title_draft, status")
      .eq("id", data.job_id)
      .maybeSingle();
    if (jobError || !job) throw new Error("Job de geração não encontrado.");
    if (job.status !== "aguardando_aprovacao") {
      throw new Error("Este job não está aguardando aprovação.");
    }

    const { data: assets, error: assetsError } = await supabaseAdmin
      .from("psychoeducation_generated_assets")
      .select("id, kind, body_md, data_json, media_url")
      .eq("job_id", data.job_id);
    if (assetsError || !assets || assets.length === 0) {
      throw new Error("Nenhum material encontrado para este job.");
    }

    let topicId = job.topic_id;
    if (!topicId) {
      if (!job.topic_title_draft) throw new Error("Job sem tópico definido.");
      const slug = job.topic_title_draft
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const { data: topic, error: topicError } = await supabaseAdmin
        .from("psychoeducation_topics")
        .insert({ slug, title: job.topic_title_draft })
        .select("id")
        .single();
      if (topicError || !topic) throw new Error("Não foi possível criar o tópico novo.");
      topicId = topic.id;
    }

    const leitura = assets.find((a) => a.kind === "leitura");
    const { data: content, error: contentError } = await supabaseAdmin
      .from("psychoeducation_contents")
      .insert({
        topic_id: topicId,
        level: "completo",
        title: job.topic_title_draft ?? "Conteúdo gerado por IA",
        body_md: leitura?.body_md ?? "Conteúdo gerado sem texto de leitura — ver assets.",
        is_published: true,
      })
      .select("id")
      .single();
    if (contentError || !content) throw new Error("Não foi possível publicar o conteúdo.");

    await supabaseAdmin
      .from("psychoeducation_generated_assets")
      .update({ status: "aprovado", content_id: content.id })
      .eq("job_id", data.job_id);

    await supabaseAdmin
      .from("psychoeducation_generation_jobs")
      .update({
        status: "aprovado",
        reviewed_by: context.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.job_id);

    await recordAudit({
      action: "psychoeducation_generation_approved",
      clinicId: job.clinic_id,
      actorUserId: context.userId,
      actorEmail: (context.claims as { email?: string })?.email ?? null,
      entityType: "psychoeducation_generation_job",
      entityId: data.job_id,
      details: { content_id: content.id },
    });

    return { ok: true };
  });

export const rejectPsychoeducationGenerationJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({ job_id: z.string().uuid(), reason: z.string().trim().max(500).optional() })
      .parse(raw),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await requireGlobalAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { recordAudit } = await import("@/lib/audit.server");

    const { data: job } = await supabaseAdmin
      .from("psychoeducation_generation_jobs")
      .select("clinic_id")
      .eq("id", data.job_id)
      .maybeSingle();

    await supabaseAdmin
      .from("psychoeducation_generation_jobs")
      .update({
        status: "rejeitado",
        rejection_reason: data.reason ?? null,
        reviewed_by: context.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.job_id);
    await supabaseAdmin
      .from("psychoeducation_generated_assets")
      .update({ status: "rejeitado" })
      .eq("job_id", data.job_id);

    await recordAudit({
      action: "psychoeducation_generation_rejected",
      clinicId: job?.clinic_id ?? null,
      actorUserId: context.userId,
      actorEmail: (context.claims as { email?: string })?.email ?? null,
      entityType: "psychoeducation_generation_job",
      entityId: data.job_id,
      details: { reason: data.reason ?? null },
    });

    return { ok: true };
  });

export const retryPsychoeducationGenerationJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ job_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await requireGlobalAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: job, error: jobError } = await supabaseAdmin
      .from("psychoeducation_generation_jobs")
      .select("id, engine, status, source_material, requested_formats")
      .eq("id", data.job_id)
      .maybeSingle();
    if (jobError || !job) throw new Error("Job de geração não encontrado.");
    if (job.status !== "erro") throw new Error("Só é possível reprocessar jobs com status 'erro'.");

    if (job.engine === "notebooklm") {
      // Fase 2: a geração de verdade roda no runner externo
      // (content-pipeline/), não aqui. Só reabre o job pra fila que o
      // runner consulta (status pendente/gerando) — nunca apaga assets já
      // gravados com sucesso por um formato anterior, já que
      // notebooklm_client.py é idempotente por formato (adota trabalho em
      // andamento em vez de recriar).
      await supabaseAdmin
        .from("psychoeducation_generation_jobs")
        .update({ status: "pendente", error_message: null, updated_at: new Date().toISOString() })
        .eq("id", job.id);
      return { ok: true };
    }

    if (job.engine !== "workers_ai") {
      throw new Error(`Motor desconhecido: ${job.engine}`);
    }

    // Fase 1: limpa qualquer asset parcial de uma tentativa anterior antes
    // de regerar — evita colidir com a UNIQUE (job_id, kind) se algum
    // formato já tinha sido gravado antes do erro.
    await supabaseAdmin.from("psychoeducation_generated_assets").delete().eq("job_id", job.id);
    await supabaseAdmin
      .from("psychoeducation_generation_jobs")
      .update({ status: "gerando", error_message: null, updated_at: new Date().toISOString() })
      .eq("id", job.id);

    // is_crisis_topic não é persistido no job — na pior hipótese o texto
    // regerado ainda passa pela detecção por palavra-chave do QC (ver
    // CRISIS_KEYWORDS em psychoeducation-qc.ts), só perde o reforço extra
    // de quando o admin marcou o tópico como crise explicitamente.
    await runTextGenerationJob(
      job.id,
      job.source_material,
      job.requested_formats as TextFormat[],
      false,
    );

    return { ok: true };
  });
