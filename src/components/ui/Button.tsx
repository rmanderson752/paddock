"use client";

import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
}

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
        "inline-flex items-center justify-center rounded-full font-medium transition-colors",
        variant === "primary" &&
          "bg-forest text-cream hover:bg-forest-dark",
        variant === "secondary" &&
          "border-[0.5px] border-surface-border text-sand-subtle hover:border-surface-border-hover hover:text-sand",
        variant === "ghost" &&
          "text-sand-subtle hover:text-sand hover:bg-surface-hover",
        size === "sm" && "px-3 py-1.5 text-xs",
        size === "md" && "px-4 py-2 text-sm",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
