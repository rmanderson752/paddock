"use client";

import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
}

// Squared, tracked capitals — a boutique button, not a web button.
export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-[3px] label-caps transition-colors duration-200 disabled:opacity-50",
        variant === "primary" && "bg-forest text-cream hover:bg-forest-dark",
        variant === "secondary" &&
          "border border-surface-border-hover text-sand hover:bg-surface-hover",
        variant === "ghost" && "text-sand-subtle hover:text-sand",
        size === "sm" && "px-4 py-2",
        size === "md" && "px-6 py-3",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
