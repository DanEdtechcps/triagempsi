import { createFileRoute } from "@tanstack/react-router";

/**
 * Serve podcast/infográfico/vídeo gerados (bucket `psychoeducation-media`,
 * privado) numa URL pública — mesmo padrão de clinic-asset.ts. Só o runner
 * externo (role `psychoeducation_runner`, ver migração
 * 20260927020000_psychoeducation_runner_role_and_media_bucket.sql) escreve
 * nesse bucket; esta rota só lê via `supabaseAdmin` e repassa. `path` é
 * validado por allowlist estrita — nunca vira leitura arbitrária de arquivo.
 */
const PATH_PATTERN = /^(podcast|infografico|video)\/[A-Za-z0-9._-]+$/;

export const Route = createFileRoute("/api/public/psychoeducation-asset")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const path = new URL(request.url).searchParams.get("path");
        if (!path || !PATH_PATTERN.test(path)) {
          return new Response("Not found", { status: 404 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage
          .from("psychoeducation-media")
          .download(path);
        if (error || !data) return new Response("Not found", { status: 404 });

        return new Response(await data.arrayBuffer(), {
          headers: {
            "Content-Type": data.type || "application/octet-stream",
            // O nome do arquivo já inclui job_id + timestamp, nunca é
            // reescrito no mesmo path — pode cachear como imutável.
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
