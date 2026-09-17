/** Normaliza telefone brasileiro para o formato E.164 (ex.: +5511999998888). */
export function toE164BR(raw: string): string | null {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return null;
  let d = digits;
  if (d.startsWith("00")) d = d.slice(2);
  if (!d.startsWith("55")) {
    if (d.length === 10 || d.length === 11) d = "55" + d;
  }
  if (d.length < 12 || d.length > 13) return null;
  return "+" + d;
}

/** Link wa.me com mensagem pré-preenchida. */
export function waLink(phoneE164: string, message: string) {
  return `https://wa.me/${phoneE164.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}
