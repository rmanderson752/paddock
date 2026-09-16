"use client";

import { cn } from "@/lib/utils";

interface NavPillProps {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

// Tracked-capital tab; the active one is underlined in ink, not filled.
export function NavPill({ active, children, onClick, className }: NavPillProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "label-caps pb-1.5 border-b transition-colors duration-200",
        active
          ? "border-sand text-sand"
          : "border-transparent text-sand-subtle hover:text-sand",
        className
      )}
    >
      {children}
    </button>
  );
}
