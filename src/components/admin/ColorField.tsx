import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ColorFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
};

export function ColorField({ id, label, value, onChange }: ColorFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded-xl border border-input bg-background p-1"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 flex-1 text-xs font-mono"
        />
      </div>
    </div>
  );
}
