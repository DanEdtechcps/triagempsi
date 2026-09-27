import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Endpoint interno SÓ pra hospedar as peças de demonstração do Corte 800 na
 * página de revisão externa (`/revisao/pre-lancamento-conteudo-ia`) — o
 * Corte 800/saraiva-lms não tem storage em nuvem configurado (ver
 * 09_saraiva_lms/documentos/INTEGRACAO_ESTEIRA_CONTEUDO_IA.md), e o usuário
 * pediu pra "colocar tudo na triagem medica" já que é a mesma pessoa
 * (Dr. Saraiva) avaliando as duas trilhas.
 *
 * Deliberadamente SEPARADO de psychoeducation-media-upload.ts: aquele exige
 * um job_id em psychoeducation_generation_jobs (fila de aprovação clínica
 * real, pra paciente) — misturar conteúdo do Corte 800 ali confundiria o
 * painel administrativo da clínica. Este endpoint só grava no Storage, sem
 * tocar em nenhuma tabela — puramente hospedagem pra revisão externa.
 *
 * Mesma autenticação por token compartilhado (PSYCHOEDUCATION_RUNNER_TOKEN).
 */
const bodySchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  filename: z.string().regex(/^[A-Za-z0-9._-]+$/),
  content_type: z.string().min(1).max(100),
  base64: z.string().min(16),
});

export const Route = createFileRoute("/api/internal/corte800-media-upload")({
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

        const bytes = Buffer.from(data.base64, "base64");
        if (bytes.byteLength > 200_000_000) {
          return Response.json({ error: "Arquivo excede 200MB." }, { status: 413 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const path = `corte800/${data.slug}/${data.filename}`;
        const { error: uploadError } = await supabaseAdmin.storage
          .from("psychoeducation-media")
          .upload(path, bytes, { contentType: data.content_type, upsert: true });
        if (uploadError) {
          return Response.json({ error: "Falha no upload para o Storage." }, { status: 500 });
        }

        return Response.json({
          ok: true,
          media_url: `/api/public/psychoeducation-asset?path=${encodeURIComponent(path)}`,
        });
      },
    },
  },
});
