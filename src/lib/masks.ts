/**
 * Utilitários de máscaras, formatação e validação de campos de formulário (pt-BR).
 */

/**
 * Extrai apenas dígitos numéricos de uma string.
 */
export function onlyDigits(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/\D/g, "");
}

/**
 * Aplica máscara dinâmica de telefone brasileiro:
 * - Fixo (10 dígitos): (XX) XXXX-XXXX
 * - Celular (11 dígitos): (XX) XXXXX-XXXX
 * - Suporta colar com código de país +55 ou 55.
 */
export function maskPhoneBR(value: string | null | undefined): string {
  if (!value) return "";
  let digits = onlyDigits(value);

  // Normaliza se colado com DDI brasileiro (55)
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    digits = digits.slice(2);
  }

  // Limita ao tamanho máximo de telefone BR (DDD + 9 dígitos)
  digits = digits.slice(0, 11);

  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Valida se um telefone brasileiro possui formato plausível:
 * - Vazio é válido quando o campo for opcional (required = false).
 * - Quando preenchido, deve ter 10 ou 11 dígitos com DDD válido (11 a 99).
 * - Para celulares de 11 dígitos, o primeiro dígito do número móvel deve ser 9.
 */
export function isValidPhoneBR(value: string | null | undefined, required = false): boolean {
  if (!value || value.trim() === "") return !required;
  let digits = onlyDigits(value);
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  if (digits.length !== 10 && digits.length !== 11) return false;
  const ddd = parseInt(digits.slice(0, 2), 10);
  if (ddd < 11 || ddd > 99) return false;
  if (digits.length === 11 && digits[2] !== "9") return false;
  return true;
}

/**
 * Validação de e-mail com checagem estrutural básica e ausência de espaços.
 */
export function isValidEmail(value: string | null | undefined, required = true): boolean {
  if (!value || value.trim() === "") return !required;
  const trimmed = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed);
}

/**
 * Formata data ISO (AAAA-MM-DD) para formato brasileiro (DD/MM/AAAA)
 * com proteção estrita contra desvios de fuso horário UTC (bug do dia anterior).
 */
export function formatDateBR(value: string | null | undefined): string {
  if (!value) return "—";
  const trimmed = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (match) {
    const [, y, m, d] = match;
    return `${d}/${m}/${y}`;
  }
  const dateObj = new Date(trimmed);
  if (!Number.isNaN(dateObj.getTime())) {
    return dateObj.toLocaleDateString("pt-BR");
  }
  return value;
}
