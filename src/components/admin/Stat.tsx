type StatProps = {
  label: string;
  value: number;
  icon: React.ReactNode;
};

export function Stat({ label, value, icon }: StatProps) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-border bg-background/80 p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        {icon}
      </div>
      <div className="mt-2 font-serif text-xl sm:text-2xl font-bold">{value}</div>
    </div>
  );
}
