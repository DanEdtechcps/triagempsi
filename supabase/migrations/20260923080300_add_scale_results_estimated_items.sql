-- Migration: 20260923080300_add_scale_results_estimated_items.sql
--
-- O corte adaptativo (completeAdaptiveAnswers) preenche itens não
-- respondidos com um valor estimado (mediana das respostas dadas) e grava
-- indistinguível de uma resposta real — afeta o escore numérico exibido no
-- painel/PDF e as contas de mudança confiável (RCI/MCID) longitudinais.
-- Esta coluna guarda quais itens foram estimados, não respondidos de fato.

ALTER TABLE public.scale_results
  ADD COLUMN IF NOT EXISTS estimated_items text[] NOT NULL DEFAULT '{}';
