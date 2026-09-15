import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border-[0.5px] border-surface-border bg-surface px-4 py-3 sm:px-5 sm:py-4",
        className
      )}
    >
      {children}
    </div>
  );
}
