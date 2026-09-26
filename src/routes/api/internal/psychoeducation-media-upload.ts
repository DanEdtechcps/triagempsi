import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Endpoint interno usado SÓ pelo runner externo da Fase 2
 * (`content-pipeline/`, fora do Cloudflare Worker) para subir mídia gerada
 * pelo NotebookLM (podcast/infográfico/vídeo) e registrar o asset.
 *
 * Por quê existe: a role de banco dedicada do runner
 * (`psychoeducation_runner`, ver migração
 * 20260926044909_psychoeducation_runner_role_and_media_bucket.sql) só fala
 * Postgres direto — não consegue chamar a API HTTP do Supabase Storage
 * (que exige um JWT com claim de role reconhecido pelo PostgREST/Storage,
 * não uma credencial de Postgres). Em vez de dar `service_role` ao runner
 * pra resolver isso (reintroduziria o mesmo risco que a role dedicada foi
 * criada pra evitar), o upload de mídia passa por este endpoint — que já
 * roda dentro do Worker confiável, com `service_role` usado exatamente
 * onde já era usado antes desta feature.
 *
 * Autenticação: token compartilhado fixo (`PSYCHOEDUCATION_RUNNER_TOKEN`,
 * secret do Cloudflare — nunca em `wrangler.json` vars), não uma sessão de
 * usuário. Não expõe nenhum dado — só aceita a gravação de um asset já
 * aprovado a existir pelo próprio fluxo (job_id precisa existir e estar
 * com engine='notebooklm').
 */
const bodySchema = z.object({
  job_id: z.string().uuid(),
  kind: z.enum(["podcast", "infografico", "video"]),
  content_type: z.string().min(1).max(100),
  base64: z.string().min(16),
});

const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "image/png": "png",
  "image/jpeg": "jpg",
  "video/mp4": "mp4",
};

export const Route = createFileRoute("/api/internal/psychoeducation-media-upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env.PSYCHOEDUCATION_RUNNER_TOKEN;
        const auth = request.headers.get("authorization") ?? "";
        if (!token || auth !== `Bearer ${token}`) {
          return new Response("Unauthorized", { status: 401 });
        }

        let data: z.infer<typeof bodySchema>;
        try {
          data = bodySchema.parse(await request.json());
        } catch {
          return Response.json({ error: "Payload inválido." }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: job, error: jobError } = await supabaseAdmin
          .from("psychoeducation_generation_jobs")
          .select("id, engine")
          .eq("id", data.job_id)
          .maybeSingle();
        if (jobError || !job || job.engine !== "notebooklm") {
          return Response.json({ error: "Job inválido para upload de mídia." }, { status: 404 });
        }

        const bytes = Buffer.from(data.base64, "base64");
        if (bytes.byteLength > 200_000_000) {
          return Response.json({ error: "Arquivo excede 200MB." }, { status: 413 });
        }
        const ext = EXT_BY_CONTENT_TYPE[data.content_type] ?? "bin";
        const path = `${data.kind}/${data.job_id}-${Date.now()}.${ext}`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from("psychoeducation-media")
          .upload(path, bytes, { contentType: data.content_type, upsert: true });
        if (uploadError) {
          return Response.json({ error: "Falha no upload para o Storage." }, { status: 500 });
        }

        const mediaUrl = `/api/public/psychoeducation-asset?path=${encodeURIComponent(path)}`;
        const { error: assetError } = await supabaseAdmin.from("psychoeducation_generated_assets").upsert(
          { job_id: data.job_id, kind: data.kind, media_url: mediaUrl },
          { onConflict: "job_id, kind" },
        );
        if (assetError) {
          return Response.json({ error: "Upload ok, mas falhou ao registrar o asset." }, { status: 500 });
        }

        return Response.json({ ok: true, media_url: mediaUrl });
      },
    },
  },
});
