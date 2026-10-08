-- ====================================================================
-- ESTÚDIO DE VALIDAÇÃO - TriagemPsi
-- ====================================================================
-- Onde o médico curador (decisor) e os sócios (avaliadores) VEEM, COMPARAM,
-- ESCOLHEM e OPINAM sobre o conteúdo produzido (vídeos, frases ligadas à obra,
-- escalas, marca, pendências), com a resposta SALVA por avaliador e uma
-- DECISÃO FINAL registrada pelo decisor.
--
-- ACESSO: por LINK PESSOAL, não por usuário do sistema. Cada avaliador tem um
-- token aleatório de 256 bits; aqui só se guarda o HASH (SHA-256). Quem avalia
-- não é equipe clínica e NÃO ganha nenhum papel em user_roles (portanto nenhum
-- acesso a triagens de pacientes). Nenhuma tabela é concedida a anon nem a
-- authenticated: todo acesso passa por server functions (service_role) que
-- validam o token. RLS fica ligado como defesa em profundidade (sem policy =
-- ninguém além do service_role lê ou escreve).
--
-- O catálogo pode conter trechos de obra protegida por direitos autorais:
-- por isso o conteúdo NUNCA vai para o git — é carregado por
-- scripts/seed-review-catalog.ts a partir de uma pasta local. Sem dado de paciente.
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.review_reviewers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  email         text NULL,
  role          text NOT NULL CHECK (role IN ('decisor', 'avaliador')),
  token_hash    text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  is_active     boolean NOT NULL DEFAULT true,
  revoked_at    timestamptz NULL,
  last_seen_at  timestamptz NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.review_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        text NOT NULL CHECK (kind IN ('video', 'frase', 'escala', 'marca', 'pendencia', 'estilo')),
  ref         text NOT NULL,
  title       text NOT NULL,
  project     text NULL,
  section     text NULL,
  version     text NOT NULL DEFAULT 'v2',
  body        jsonb NOT NULL DEFAULT '{}'::jsonb,
  media_url   text NULL,
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT review_items_kind_ref_version_key UNIQUE (kind, ref, version)
);

-- UMA resposta atual por avaliador e por item (upsert).
CREATE TABLE IF NOT EXISTS public.review_responses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id      uuid NOT NULL REFERENCES public.review_items(id) ON DELETE CASCADE,
  reviewer_id  uuid NOT NULL REFERENCES public.review_reviewers(id) ON DELETE CASCADE,
  decision     text NOT NULL CHECK (decision IN ('aprovo', 'ajusto', 'nao_uso', 'prefiro', 'sem_opiniao')),
  choice       text NULL CHECK (choice IS NULL OR char_length(choice) <= 40),
  comment      text NULL CHECK (comment IS NULL OR char_length(comment) <= 4000),
  revision     integer NOT NULL DEFAULT 1,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT review_responses_item_reviewer_key UNIQUE (item_id, reviewer_id)
);

-- Histórico append-only de cada mudança de resposta (auditoria).
CREATE TABLE IF NOT EXISTS public.review_response_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id      uuid NOT NULL REFERENCES public.review_items(id) ON DELETE CASCADE,
  reviewer_id  uuid NOT NULL REFERENCES public.review_reviewers(id) ON DELETE CASCADE,
  decision     text NOT NULL,
  choice       text NULL,
  comment      text NULL,
  revision     integer NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Decisão FINAL por item, gravada pelo decisor, com a foto dos votos naquele momento.
-- Histórico preservado: ao decidir de novo, a anterior recebe superseded_at.
CREATE TABLE IF NOT EXISTS public.review_decisions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id        uuid NOT NULL REFERENCES public.review_items(id) ON DELETE CASCADE,
  decided_by     uuid NOT NULL REFERENCES public.review_reviewers(id),
  decision       text NOT NULL CHECK (decision IN ('aprovado', 'ajustar', 'descartado', 'escolhido')),
  choice         text NULL CHECK (choice IS NULL OR char_length(choice) <= 40),
  rationale      text NOT NULL CHECK (char_length(rationale) BETWEEN 3 AND 4000),
  votes_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  decided_at     timestamptz NOT NULL DEFAULT now(),
  superseded_at  timestamptz NULL
);

-- Só UMA decisão atual por item.
CREATE UNIQUE INDEX IF NOT EXISTS review_decisions_current_per_item
  ON public.review_decisions (item_id) WHERE superseded_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_review_items_kind_sort ON public.review_items(kind, sort_order);
CREATE INDEX IF NOT EXISTS idx_review_responses_item ON public.review_responses(item_id);
CREATE INDEX IF NOT EXISTS idx_review_events_item ON public.review_response_events(item_id, created_at);

-- RLS ligado em tudo, SEM policy: só o service_role (que ignora RLS) acessa.
ALTER TABLE public.review_reviewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_response_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_decisions ENABLE ROW LEVEL SECURITY;

-- Nada para anon nem authenticated (o Supabase concede por padrão em tabelas novas do schema public).
REVOKE ALL ON public.review_reviewers FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.review_items FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.review_responses FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.review_response_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.review_decisions FROM PUBLIC, anon, authenticated;

GRANT ALL ON public.review_reviewers TO service_role;
GRANT ALL ON public.review_items TO service_role;
GRANT ALL ON public.review_responses TO service_role;
GRANT ALL ON public.review_response_events TO service_role;
GRANT ALL ON public.review_decisions TO service_role;

-- Grava a decisão FINAL de um item de forma atômica: a decisão atual vira "substituída" e a nova entra
-- na mesma transação (uma falha no meio nunca deixa o item sem decisão atual). Só o service_role executa.
CREATE OR REPLACE FUNCTION public.review_record_decision(
  p_item       uuid,
  p_decided_by uuid,
  p_decision   text,
  p_choice     text,
  p_rationale  text,
  p_snapshot   jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.review_reviewers
    WHERE id = p_decided_by AND role = 'decisor' AND is_active AND revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'somente o decisor ativo pode gravar a decisao final';
  END IF;

  UPDATE public.review_decisions
     SET superseded_at = now()
   WHERE item_id = p_item AND superseded_at IS NULL;

  INSERT INTO public.review_decisions (item_id, decided_by, decision, choice, rationale, votes_snapshot)
  VALUES (p_item, p_decided_by, p_decision, p_choice, p_rationale, COALESCE(p_snapshot, '[]'::jsonb))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.review_record_decision(uuid, uuid, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_record_decision(uuid, uuid, text, text, text, jsonb) TO service_role;
