"use client";

import { cn } from "@/lib/utils";

interface NavPillProps {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function NavPill({ active, children, onClick, className }: NavPillProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
        active
          ? "bg-forest text-cream border border-forest"
          : "border-[0.5px] border-surface-border text-sand-subtle hover:text-sand hover:border-surface-border-hover",
        className
      )}
    >
      {children}
    </button>
  );
}
