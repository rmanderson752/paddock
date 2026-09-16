import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

// A plate: a shade deeper than the page with a hairline, squared corners.
export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[4px] border border-surface-border bg-surface px-5 py-5 sm:px-6 sm:py-6",
        className
      )}
    >
      {children}
    </div>
  );
}
