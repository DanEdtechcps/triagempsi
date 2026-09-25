import { useMemo, type ReactNode } from "react";
import type { Clinic } from "@/lib/clinics.functions";
import { FONT_PRESETS, type FontPresetKey } from "@/config/font-presets";

/**
 * Applies clinic-specific brand colors (and, optionally, font preset) as CSS
 * custom properties on a scoped wrapper, overriding --primary / --accent /
 * --ring / --clinic-font-heading / --clinic-font-body for everything inside.
 * Accepts any valid CSS color (hex, oklch, hsl…). Falls back to design-system defaults.
 */
export function ClinicTheme({
  clinic,
  children,
}: {
  clinic: Pick<Clinic, "primary_color" | "accent_color" | "landing_font_preset"> | null;
  children: ReactNode;
}) {
  const style = useMemo(() => {
    const s: Record<string, string> = {};
    if (clinic?.primary_color) {
      s["--primary"] = clinic.primary_color;
      s["--ring"] = clinic.primary_color;
    }
    if (clinic?.accent_color) {
      s["--accent"] = clinic.accent_color;
    }
    // Só injeta vars de fonte quando a clínica escolheu um preset não-default —
    // clínicas sem customização geram o mesmo style de sempre, zero diff.
    const fontPreset = clinic?.landing_font_preset as FontPresetKey | undefined;
    if (fontPreset && fontPreset !== "default") {
      const preset = FONT_PRESETS[fontPreset];
      if (preset) {
        s["--clinic-font-heading"] = preset.heading;
        s["--clinic-font-body"] = preset.body;
      }
    }
    return s as React.CSSProperties;
  }, [clinic?.primary_color, clinic?.accent_color, clinic?.landing_font_preset]);

  return (
    <div style={style} className="contents">
      {children}
    </div>
  );
}
