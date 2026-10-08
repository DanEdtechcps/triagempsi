-- Estúdio de validação: novos tipos de item para materiais de psicoeducação
-- (infográfico, quiz, flashcards, slides, mapa mental, áudio).
-- Só AMPLIA a lista aceita em review_items.kind; os seis tipos anteriores continuam válidos.
-- A migração 20261008100000_review_studio.sql já foi aplicada em produção e não é editada.

ALTER TABLE public.review_items
  DROP CONSTRAINT IF EXISTS review_items_kind_check;

ALTER TABLE public.review_items
  ADD CONSTRAINT review_items_kind_check CHECK (
    kind IN (
      'video', 'frase', 'escala', 'marca', 'pendencia', 'estilo',
      'infografico', 'quiz', 'flashcards', 'slides', 'mapa', 'audio'
    )
  );
