import { createFileRoute } from "@tanstack/react-router";

/**
 * Endpoint de PRÉVIA pra revisão externa (ex.: médico curador do conteúdo,
 * antes de aprovar publicação) — não é o mesmo caminho do paciente.
 *
 * `psychoeducation_generated_assets` nunca tem GRANT pra `anon` de propósito
 * (ver migração 20260927010000, comentário explícito: "os assets crus da
 * fila continuam privados mesmo depois de aprovados"). Em vez de abrir essa
 * tabela, este endpoint roda com `service_role` no servidor e devolve só um
 * subconjunto curado de campos, e só pra jobs em aguardando_aprovacao/
 * aprovado — nunca pendente/gerando/erro (não expõe estado interno da fila).
 *
 * A "segurança" aqui é por obscuridade de URL (link não listado, page com
 * `noindex`), igual ao pedido do usuário — não tem autenticação de sessão
 * porque quem revisa (ex.: Dr. Saraiva) não é necessariamente usuário do
 * sistema. Não expor isso em nenhuma navegação nem sitemap.
 */
export const Route = createFileRoute("/api/public/psychoeducation-preview")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const jobId = new URL(request.url).searchParams.get("job_id");
        if (!jobId || !/^[0-9a-f-]{36}$/i.test(jobId)) {
          return Response.json({ error: "job_id inválido." }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: job, error: jobError } = await supabaseAdmin
          .from("psychoeducation_generation_jobs")
          .select("id, status, topic_id, psychoeducation_topics(slug, title)")
          .eq("id", jobId)
          .in("status", ["aguardando_aprovacao", "aprovado"])
          .maybeSingle();
        if (jobError || !job) {
          return Response.json({ error: "Prévia não encontrada." }, { status: 404 });
        }

        const { data: assets, error: assetsError } = await supabaseAdmin
          .from("psychoeducation_generated_assets")
          .select("kind, media_url, data_json, body_md, status")
          .eq("job_id", jobId);
        if (assetsError) {
          return Response.json({ error: "Falha ao carregar prévia." }, { status: 500 });
        }

        return Response.json({
          job_id: job.id,
          topic: job.psychoeducation_topics,
          assets: assets ?? [],
        });
      },
    },
  },
});
