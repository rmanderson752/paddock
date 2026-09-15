import { cn } from "@/lib/utils";

interface StatBlockProps {
  label: string;
  value: string;
  subtext?: string;
  valueClassName?: string;
  className?: string;
}

export function StatBlock({ label, value, subtext, valueClassName, className }: StatBlockProps) {
  return (
    <div className={cn("rounded-lg bg-surface p-3", className)}>
      <div className="text-[11px] uppercase tracking-[0.5px] text-sand-subtle mb-0.5">
        {label}
      </div>
      <div className={cn("text-[15px] font-medium text-sand", valueClassName)}>
        {value}
      </div>
      {subtext && (
        <div className="text-[10px] text-sand-faint mt-0.5">{subtext}</div>
      )}
    </div>
  );
}
