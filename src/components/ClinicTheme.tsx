import { useMemo, type ReactNode } from "react";
import type { Clinic } from "@/lib/clinics.functions";

/**
 * Applies clinic-specific brand colors as CSS custom properties on a scoped wrapper,
 * overriding --primary / --accent / --ring for everything inside.
 * Accepts any valid CSS color (hex, oklch, hsl…). Falls back to design-system defaults.
 */
export function ClinicTheme({
  clinic,
  children,
}: {
  clinic: Pick<Clinic, "primary_color" | "accent_color"> | null;
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
    return s as React.CSSProperties;
  }, [clinic?.primary_color, clinic?.accent_color]);

  return (
    <div style={style} className="contents">
      {children}
    </div>
  );
}
