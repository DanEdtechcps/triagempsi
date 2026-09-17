-- Keepalive e Heartbeat para evitar suspensão automática do Supabase
-- Ativa a extensão pg_cron nativa do PostgreSQL
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Tabela de heartbeat
CREATE TABLE IF NOT EXISTS public._keepalive (
  id int PRIMARY KEY DEFAULT 1,
  last_ping timestamptz NOT NULL DEFAULT now(),
  ping_count bigint NOT NULL DEFAULT 1
);

-- RLS: Leitura permitida para tráfego anônimo (pings HTTP da API REST)
ALTER TABLE public._keepalive ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "keepalive_read" ON public._keepalive;
CREATE POLICY "keepalive_read" ON public._keepalive FOR SELECT TO anon, authenticated USING (true);

-- Registro inicial
INSERT INTO public._keepalive (id, last_ping, ping_count)
VALUES (1, now(), 1)
ON CONFLICT (id) DO NOTHING;

-- Função de heartbeat
CREATE OR REPLACE FUNCTION public.heartbeat()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public._keepalive
  SET last_ping = now(), ping_count = ping_count + 1
  WHERE id = 1;
END;
$$;

-- Agenda job diário às 04:00 AM UTC no banco
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('supabase-daily-keepalive') WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'supabase-daily-keepalive'
    );
    PERFORM cron.schedule('supabase-daily-keepalive', '0 4 * * *', 'SELECT public.heartbeat();');
  END IF;
END $$;
