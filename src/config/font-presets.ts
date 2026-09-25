/**
 * Presets de fonte por clínica — conjunto curado, não texto livre.
 *
 * Só existem 5 opções, todas com no máximo 2 famílias e pensadas para
 * font-display: swap. "default" e "editorial-serif" têm custo de rede
 * zero porque Fraunces, Instrument Serif e Inter já são carregadas
 * globalmente em src/routes/__root.tsx — os outros 3 exigem 1 request
 * extra por clínica, nunca mais que 2 famílias.
 */

export type FontPresetKey =
  | "default"
  | "editorial-serif"
  | "modern-sans"
  | "warm-humanist"
  | "bold-grotesk";

export const FONT_PRESET_KEYS: FontPresetKey[] = [
  "default",
  "editorial-serif",
  "modern-sans",
  "warm-humanist",
  "bold-grotesk",
];

export type FontPreset = {
  label: string;
  /** Valor CSS para --clinic-font-heading */
  heading: string;
  /** Valor CSS para --clinic-font-body */
  body: string;
  /** null = reaproveita fontes já carregadas globalmente, sem custo de rede extra */
  googleFontsHref: string | null;
};

export const FONT_PRESETS: Record<FontPresetKey, FontPreset> = {
  default: {
    label: "Fraunces + Inter (padrão)",
    heading: '"Fraunces", Georgia, serif',
    body: '"Inter", system-ui, -apple-system, sans-serif',
    googleFontsHref: null,
  },
  "editorial-serif": {
    label: "Instrument Serif + Inter",
    heading: '"Instrument Serif", "Fraunces", Georgia, serif',
    body: '"Inter", system-ui, -apple-system, sans-serif',
    googleFontsHref: null,
  },
  "modern-sans": {
    label: "Manrope + Inter",
    heading: '"Manrope", system-ui, sans-serif',
    body: '"Inter", system-ui, -apple-system, sans-serif',
    googleFontsHref: "https://fonts.googleapis.com/css2?family=Manrope:wght@600;700&display=swap",
  },
  "warm-humanist": {
    label: "Lora + Karla",
    heading: '"Lora", Georgia, serif',
    body: '"Karla", system-ui, sans-serif',
    googleFontsHref:
      "https://fonts.googleapis.com/css2?family=Lora:wght@600;700&family=Karla:wght@400;500;600&display=swap",
  },
  "bold-grotesk": {
    label: "Space Grotesk + Work Sans",
    heading: '"Space Grotesk", system-ui, sans-serif',
    body: '"Work Sans", system-ui, sans-serif',
    googleFontsHref:
      "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Work+Sans:wght@400;500&display=swap",
  },
};

export function resolveFontPreset(key: string | null | undefined): FontPreset {
  return FONT_PRESETS[(key as FontPresetKey) ?? "default"] ?? FONT_PRESETS.default;
}
