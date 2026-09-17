import { passwordStrength } from "@/lib/password";
import { Check, X } from "lucide-react";

export function PasswordStrengthMeter({ value }: { value: string }) {
  const { score, label, rules } = passwordStrength(value);
  if (!value) return null;

  return (
    <div className="space-y-2" aria-live="polite">
      <div className="flex items-center gap-2">
        <div className="flex h-1.5 flex-1 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={
                "h-full flex-1 rounded-full transition-colors " +
                (i < score
                  ? score <= 1
                    ? "bg-destructive"
                    : score === 2
                      ? "bg-amber-500"
                      : "bg-primary"
                  : "bg-muted")
              }
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <ul className="space-y-1">
        {rules.map((r) => (
          <li
            key={r.label}
            className={
              "flex items-center gap-1.5 text-xs " +
              (r.ok ? "text-muted-foreground" : "text-foreground")
            }
          >
            {r.ok ? (
              <Check className="h-3.5 w-3.5 text-primary" aria-hidden />
            ) : (
              <X className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            )}
            {r.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
