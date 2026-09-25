import { Label } from "@/components/ui/label";
import { FONT_PRESET_KEYS, FONT_PRESETS, type FontPresetKey } from "@/config/font-presets";

type FontPresetPickerProps = {
  value: FontPresetKey;
  onChange: (v: FontPresetKey) => void;
};

/** Seletor visual dos presets de fonte curados — nunca um campo de texto livre. */
export function FontPresetPicker({ value, onChange }: FontPresetPickerProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Fonte da landing</Label>
      <div className="grid gap-2 sm:grid-cols-2">
        {FONT_PRESET_KEYS.map((key) => {
          const preset = FONT_PRESETS[key];
          const selected = value === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                selected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <div style={{ fontFamily: preset.heading }} className="text-base font-semibold">
                Aa — {preset.label.split(" + ")[0]}
              </div>
              <div
                style={{ fontFamily: preset.body }}
                className="mt-1 text-xs text-muted-foreground"
              >
                {preset.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
