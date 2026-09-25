import { createFileRoute } from "@tanstack/react-router";

/**
 * Serve logo/hero image de clínica (bucket `landing`, privado) numa URL
 * pública, igual ao padrão já usado por og-landing.ts para a miniatura da
 * landing comercial. `path` é validado por allowlist estrita — só objetos
 * dentro de logos/ ou hero/, sem separador de diretório extra — para nunca
 * virar uma primitiva de leitura arbitrária de arquivo no bucket.
 */
const PATH_PATTERN = /^(logos|hero)\/[A-Za-z0-9._-]+$/;

export const Route = createFileRoute("/api/public/clinic-asset")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const path = new URL(request.url).searchParams.get("path");
        if (!path || !PATH_PATTERN.test(path)) {
          return new Response("Not found", { status: 404 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("landing").download(path);
        if (error || !data) return new Response("Not found", { status: 404 });

        return new Response(await data.arrayBuffer(), {
          headers: {
            "Content-Type": data.type || "image/jpeg",
            // O nome do arquivo já inclui clinic_id + timestamp — nunca é
            // reescrito no mesmo path, então pode cachear como imutável.
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
