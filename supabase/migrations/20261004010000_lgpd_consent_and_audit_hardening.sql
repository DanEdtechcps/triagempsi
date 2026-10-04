-- LGPD, parte 1: prova de consentimento + auditoria sem PHI e imutável.
--
-- 1) Consentimento: assessments já tem consent_lgpd/consent_at/consent_ip, mas o
--    IP nunca foi gravado e o TEXTO aceito não era guardado (se a clínica mudar
--    o consent_copy depois, perde-se o que o paciente leu). Passamos a guardar
--    o texto e o hash, mais o horário de recebimento no servidor.
-- 2) audit_logs guardava nome/telefone de pacientes em `details`. Auditoria é
--    lida por toda a equipe da clínica: não deve conter PHI. Limpamos o legado
--    e instalamos um gatilho que remove essas chaves em qualquer INSERT futuro
--    (defesa em profundidade: vale mesmo se algum código novo esquecer).
-- 3) audit_logs passa a ser append-only (UPDATE/DELETE/TRUNCATE bloqueados).
--
-- Só adiciona colunas/gatilhos; nenhuma migração já aplicada é editada.

-- 1) Consentimento -----------------------------------------------------------
ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS consent_copy        text,
  ADD COLUMN IF NOT EXISTS consent_copy_sha256 text,
  ADD COLUMN IF NOT EXISTS consent_server_at   timestamptz;

COMMENT ON COLUMN public.assessments.consent_copy IS
  'Texto de consentimento exatamente como estava na clínica no momento do envio.';
COMMENT ON COLUMN public.assessments.consent_server_at IS
  'Horário em que o SERVIDOR recebeu o envio (consent_at pode vir do cliente).';

-- 2) Auditoria sem PHI --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_strip_phi(p_action text, p_details jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  d jsonb := p_details;
BEGIN
  IF d IS NULL OR jsonb_typeof(d) <> 'object' THEN
    RETURN d;
  END IF;
  d := d - 'respondent_name' - 'contact_name' - 'informant_name' - 'phone' - 'to_phone';
  IF p_action = 'contact_created' THEN
    d := d - 'name';
  END IF;
  IF d ? 'preenchido_por' THEN
    d := jsonb_set(
      d, '{preenchido_por}',
      to_jsonb(CASE WHEN d->>'preenchido_por' ILIKE 'familiar%'
                    THEN 'familiar/responsável' ELSE 'o próprio paciente' END)
    );
  END IF;
  RETURN d;
END;
$$;

-- Limpa o legado ANTES de tornar a tabela imutável.
UPDATE public.audit_logs
   SET details = public.audit_strip_phi(action, details)
 WHERE details IS DISTINCT FROM public.audit_strip_phi(action, details);

CREATE OR REPLACE FUNCTION public.audit_logs_sanitize_trg()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.details := public.audit_strip_phi(NEW.action, NEW.details);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_logs_sanitize_phi ON public.audit_logs;
CREATE TRIGGER audit_logs_sanitize_phi
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.audit_logs_sanitize_trg();

-- 3) Append-only ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_logs_block_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs é append-only: % bloqueado', TG_OP
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS audit_logs_no_update_delete ON public.audit_logs;
CREATE TRIGGER audit_logs_no_update_delete
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.audit_logs_block_mutation();

DROP TRIGGER IF EXISTS audit_logs_no_truncate ON public.audit_logs;
CREATE TRIGGER audit_logs_no_truncate
  BEFORE TRUNCATE ON public.audit_logs
  FOR EACH STATEMENT EXECUTE FUNCTION public.audit_logs_block_mutation();

REVOKE UPDATE, DELETE, TRUNCATE ON public.audit_logs FROM anon, authenticated;
