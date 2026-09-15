"use client";

import { cn } from "@/lib/utils";

interface BadgeProps {
  variant: "positive" | "negative";
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        variant === "positive" && "bg-forest-muted text-forest-light",
        variant === "negative" && "bg-maroon-muted text-maroon-light",
        className
      )}
    >
      {children}
    </span>
  );
}
