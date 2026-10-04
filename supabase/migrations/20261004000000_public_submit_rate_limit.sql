-- Limite de requisições do envio público de triagem (anti-abuso).
--
-- O endpoint submitAssessment é público (sem login) e grava PHI. Sem limite,
-- qualquer um pode inundar uma clínica com triagens falsas. Esta migração só
-- CRIA objetos novos (tabela + função); nada existente é alterado.
--
-- Janela fixa por chave: a chave é montada no servidor com HASH do IP (nunca o
-- IP cru) + clínica + balde ('geral' | 'risco'). A função é atômica
-- (INSERT ... ON CONFLICT) para não perder contagem sob concorrência.
-- Acesso: SOMENTE service_role (a server function usa supabaseAdmin).

CREATE TABLE IF NOT EXISTS public.public_submit_rate (
  key           text        NOT NULL,
  window_start  timestamptz NOT NULL,
  count         integer     NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

ALTER TABLE public.public_submit_rate ENABLE ROW LEVEL SECURITY;
-- Sem nenhuma policy: anon/authenticated não leem nem escrevem.
REVOKE ALL ON public.public_submit_rate FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS public_submit_rate_window_idx
  ON public.public_submit_rate (window_start);

-- Registra +1 na janela atual e devolve se ainda está dentro do limite.
-- Também faz a limpeza oportunista de janelas antigas (> 1 dia).
CREATE OR REPLACE FUNCTION public.check_public_rate_limit(
  p_key            text,
  p_limit          integer,
  p_window_seconds integer
)
RETURNS TABLE (allowed boolean, current_count integer, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_window timestamptz;
  v_count  integer;
BEGIN
  IF p_limit < 1 OR p_window_seconds < 1 THEN
    RAISE EXCEPTION 'parametros invalidos';
  END IF;

  v_window := to_timestamp(
    floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds
  );

  INSERT INTO public.public_submit_rate AS r (key, window_start, count)
  VALUES (p_key, v_window, 1)
  ON CONFLICT (key, window_start)
  DO UPDATE SET count = r.count + 1
  RETURNING r.count INTO v_count;

  DELETE FROM public.public_submit_rate WHERE window_start < now() - interval '1 day';

  RETURN QUERY SELECT
    v_count <= p_limit,
    v_count,
    GREATEST(1, ceil(extract(epoch FROM (v_window + make_interval(secs => p_window_seconds) - now())))::integer);
END;
$$;

REVOKE ALL ON FUNCTION public.check_public_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_public_rate_limit(text, integer, integer) TO service_role;
