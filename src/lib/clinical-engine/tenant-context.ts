/**
 * Resolvedor e Middleware de Isolamento Estrito de Contexto Multi-Tenant.
 * Inspirado na arquitetura multi-tenant do Cal.com.
 * 
 * Garante que:
 * 1. Toda sessão de triagem possua um TenantContext válido e imutável.
 * 2. Nenhum payload seja gravado ou processado sem a selagem do clinic_id.
 * 3. Qualquer tentativa de vazamento cruzado (cross-tenant leakage) seja bloqueada
 *    com exceção de segurança imediata antes de atingir o banco ou o Supabase.
 */

import type { AssessmentPayload, SealedAssessmentPayload } from "./types";

export interface TenantContext {
  readonly clinic_id: string;
  readonly clinic_slug: string;
  readonly clinic_name: string;
  readonly features: Readonly<Record<string, boolean>>;
}

export class TenantBoundaryViolationError extends Error {
  constructor(activeClinicId: string, targetClinicId: string) {
    super(
      `Violação de fronteira multi-tenant detectada: contexto ativo da sessão é clínica '${activeClinicId}', mas houve tentativa de acessar ou gravar dados da clínica '${targetClinicId}'. Operação bloqueada por segurança RLS.`,
    );
    this.name = "TenantBoundaryViolationError";
  }
}

export class TenantResolutionError extends Error {
  constructor(message: string) {
    super(`Erro de resolução de tenant: ${message}`);
    this.name = "TenantResolutionError";
  }
}

export class MissingTenantContextError extends Error {
  constructor() {
    super(
      "Contexto de clínica ausente ou inválido. Não é permitido finalizar ou persistir uma triagem sem vinculação estrita de clinic_id.",
    );
    this.name = "MissingTenantContextError";
  }
}

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Normaliza e valida o slug de uma clínica.
 */
export function sanitizeTenantSlug(rawSlug: string | null | undefined): string {
  if (!rawSlug || typeof rawSlug !== "string") {
    throw new TenantResolutionError("Slug da clínica não foi informado.");
  }
  const clean = rawSlug.trim().toLowerCase();
  if (!SLUG_REGEX.test(clean)) {
    throw new TenantResolutionError(
      `Slug '${rawSlug}' possui formato inválido. Use apenas letras minúsculas, números e hífens.`,
    );
  }
  return clean;
}

/**
 * Resolve e valida o contexto do tenant para a sessão de triagem.
 */
export function resolveTenantContext(
  slug: string,
  data?: Partial<TenantContext>,
): TenantContext {
  const cleanSlug = sanitizeTenantSlug(slug);

  const clinicId = data?.clinic_id?.trim();
  if (data && !clinicId) {
    throw new TenantResolutionError(
      "O clinic_id fornecido para o contexto da clínica não pode ser vazio.",
    );
  }

  const context: TenantContext = {
    clinic_id: clinicId ?? `clinic_${cleanSlug}`,
    clinic_slug: cleanSlug,
    clinic_name: data?.clinic_name?.trim() || `Clínica ${cleanSlug}`,
    features: Object.freeze({
      whatsapp_notifications: true,
      custom_branding: true,
      audio_screening: false,
      ...(data?.features ?? {}),
    }),
  };

  return Object.freeze(context);
}

/**
 * Middleware de Asserção: Bloqueia qualquer tentativa de gravação ou consulta
 * fora da fronteira da clínica ativa.
 */
export function assertTenantBoundary(
  context: TenantContext,
  targetClinicId: string,
): void {
  if (!context || !context.clinic_id) {
    throw new MissingTenantContextError();
  }

  const normalizedActive = context.clinic_id.trim();
  const normalizedTarget = (targetClinicId || "").trim();

  if (normalizedActive !== normalizedTarget) {
    throw new TenantBoundaryViolationError(normalizedActive, normalizedTarget);
  }
}

/**
 * Sela o payload de avaliação clínica vinculando-o obrigatoriamente ao clinic_id da clínica ativa.
 * Previne injeção de ID cruzado por agentes externos.
 */
export function bindTenantToAssessmentPayload(
  payload: AssessmentPayload,
  context: TenantContext,
): SealedAssessmentPayload {
  if (!context || !context.clinic_id) {
    throw new MissingTenantContextError();
  }

  // Se o payload já continha um clinic_id, valida se coincide com o contexto ativo
  if (payload.clinic_id && payload.clinic_id.trim() !== context.clinic_id.trim()) {
    throw new TenantBoundaryViolationError(
      context.clinic_id,
      payload.clinic_id,
    );
  }

  // Garante que o slug do payload corresponda à clínica ativa
  const payloadSlug = payload.clinic_slug ? payload.clinic_slug.trim().toLowerCase() : "";
  if (payloadSlug && payloadSlug !== context.clinic_slug) {
    throw new TenantResolutionError(
      `Conflito de rota: payload associado ao slug '${payloadSlug}', mas o contexto ativo é '${context.clinic_slug}'.`,
    );
  }

  return {
    ...payload,
    clinic_id: context.clinic_id,
    clinic_slug: context.clinic_slug,
  };
}
