import { createFileRoute } from "@tanstack/react-router";

/** Serve a miniatura da landing (bucket privado) em uma URL pública para os crawlers. */
export const Route = createFileRoute("/api/public/og-landing")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: row } = await supabaseAdmin
          .from("landing_settings")
          .select("share_image_path, share_image_version")
          .limit(1)
          .maybeSingle();

        const path = row?.share_image_path as string | undefined;
        if (!path) return new Response("Not found", { status: 404 });

        const { data, error } = await supabaseAdmin.storage.from("landing").download(path);
        if (error || !data) return new Response("Not found", { status: 404 });

        const version = String((row as any)?.share_image_version ?? 1);
        const requested = new URL(request.url).searchParams.get("v");
        const etag = `"og-${version}"`;
        if (request.headers.get("if-none-match") === etag) {
          return new Response(null, { status: 304, headers: { ETag: etag } });
        }

        return new Response(await data.arrayBuffer(), {
          headers: {
            "Content-Type": data.type || "image/jpeg",
            ETag: etag,
            // URL versionada (?v=N) pode ser cacheada por muito tempo; sem versão, cache curto.
            "Cache-Control": requested
              ? "public, max-age=31536000, immutable"
              : "public, max-age=300",
          },
        });
      },
    },
  },
});
