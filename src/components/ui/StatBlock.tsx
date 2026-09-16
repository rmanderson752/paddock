import { cn } from "@/lib/utils";

interface StatBlockProps {
  label: string;
  value: string;
  subtext?: string;
  valueClassName?: string;
  className?: string;
}

// Ledger cell: tracked label above a serif figure, divided by a hairline.
export function StatBlock({ label, value, subtext, valueClassName, className }: StatBlockProps) {
  return (
    <div className={cn("border-t border-surface-border pt-3", className)}>
      <div className="label-caps text-sand-subtle mb-1.5">{label}</div>
      <div className={cn("display-serif numerals text-[22px] text-sand", valueClassName)}>
        {value}
      </div>
      {subtext && (
        <div className="text-[11px] text-sand-faint mt-1">{subtext}</div>
      )}
    </div>
  );
}
