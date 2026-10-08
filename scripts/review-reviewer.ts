#!/usr/bin/env bun
/**
 * Gerencia os LINKS PESSOAIS do Estúdio de validação (tabela review_reviewers).
 *
 *   bun scripts/review-reviewer.ts create --nome "Dr. José Saraiva" --papel decisor [--email x@y.z]   # simula
 *   bun scripts/review-reviewer.ts create --nome "..." --papel avaliador --apply                     # grava e imprime o link
 *   bun scripts/review-reviewer.ts list                                                              # quem tem acesso
 *   bun scripts/review-reviewer.ts revoke --id <uuid> --apply                                        # derruba o link
 *
 * Gravar exige SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente (secret manager; nunca em arquivo
 * rastreado). O link só é impresso UMA vez, na criação: no banco fica apenas o hash do token.
 * REVIEW_BASE_URL define o endereço do site (padrão https://psiqway.com.br).
 */
import { createClient } from "@supabase/supabase-js";
import { createSupabaseFetch } from "../src/integrations/supabase/api-key-fetch";
import { generateReviewToken, hashReviewToken, reviewLink } from "../src/lib/review-token";

function arg(nome: string): string | undefined {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function cliente() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.");
  // Chaves no formato novo (sb_secret_) não são JWT: o projeto as envia com este fetch (ver api-key-fetch.ts).
  return createClient(url, key, {
    global: { fetch: createSupabaseFetch(key) },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function main() {
  const comando = process.argv[2];
  const aplicar = process.argv.includes("--apply");

  if (comando === "create") {
    const nome = arg("nome")?.trim();
    const papel = arg("papel");
    if (!nome) throw new Error('Informe --nome "Fulano".');
    if (papel !== "decisor" && papel !== "avaliador") {
      throw new Error("--papel deve ser decisor ou avaliador.");
    }
    if (!aplicar) {
      console.log(`Simulação: criaria o link de "${nome}" (${papel}). Use --apply para gravar.`);
      return;
    }
    const token = generateReviewToken();
    const { error } = await cliente()
      .from("review_reviewers")
      .insert({
        name: nome,
        email: arg("email") ?? null,
        role: papel,
        token_hash: await hashReviewToken(token),
      });
    if (error) throw new Error(`Falha ao gravar: ${error.message}`);
    console.log(`Link pessoal de ${nome} (${papel}). Guarde agora: não será mostrado de novo.\n`);
    console.log(reviewLink(process.env.REVIEW_BASE_URL ?? "https://psiqway.com.br", token));
    return;
  }

  if (comando === "list") {
    const { data, error } = await cliente()
      .from("review_reviewers")
      .select("id, name, role, is_active, revoked_at, last_seen_at, created_at")
      .order("created_at");
    if (error) throw new Error(error.message);
    console.table(data);
    return;
  }

  if (comando === "revoke") {
    const id = arg("id");
    if (!id) throw new Error("Informe --id <uuid> (veja com o comando list).");
    if (!aplicar) {
      console.log(`Simulação: revogaria o link ${id}. Use --apply para gravar.`);
      return;
    }
    const { error } = await cliente()
      .from("review_reviewers")
      .update({ is_active: false, revoked_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
    console.log(`Link ${id} revogado.`);
    return;
  }

  throw new Error("Use: create | list | revoke (veja o cabeçalho do arquivo).");
}

if (import.meta.main) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
