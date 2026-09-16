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
        "inline-flex items-center gap-1 rounded-[2px] px-2 py-1 label-caps numerals",
        variant === "positive" && "bg-forest-muted text-forest-light",
        variant === "negative" && "bg-maroon-muted text-maroon-light",
        className
      )}
    >
      {children}
    </span>
  );
}
