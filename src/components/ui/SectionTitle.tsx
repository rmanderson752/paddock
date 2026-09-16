import { cn } from "@/lib/utils";

interface SectionTitleProps {
  children: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}

// Editorial section header: tracked capitals over a brass-tipped hairline.
export function SectionTitle({ children, aside, className }: SectionTitleProps) {
  return (
    <div className={cn("mb-5", className)}>
      <div className="flex items-baseline justify-between gap-4 mb-2.5">
        <h2 className="label-caps text-sand">{children}</h2>
        {aside && <div className="hidden sm:block text-[11px] text-sand-subtle shrink-0">{aside}</div>}
      </div>
      <div className="rule-brass" />
    </div>
  );
}
