CREATE TABLE public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  invitation_id uuid REFERENCES public.invitations(id) ON DELETE SET NULL,
  assessment_id uuid REFERENCES public.assessments(id) ON DELETE SET NULL,
  to_phone text NOT NULL,
  kind text NOT NULL DEFAULT 'invite',
  body text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  provider_sid text,
  error text,
  sent_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.whatsapp_messages TO authenticated;
GRANT ALL ON public.whatsapp_messages TO service_role;

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY whatsapp_messages_staff_read ON public.whatsapp_messages
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND (ur.clinic_id IS NULL OR ur.clinic_id = whatsapp_messages.clinic_id)));

CREATE TRIGGER whatsapp_messages_updated_at
BEFORE UPDATE ON public.whatsapp_messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX whatsapp_messages_clinic_created_idx ON public.whatsapp_messages (clinic_id, created_at DESC);

ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS whatsapp_status text;