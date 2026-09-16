"use client";

import { cn } from "@/lib/utils";
import { type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

// Understated field: hairline box on the page tone, ink focus ring.
export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "w-full rounded-[3px] border border-surface-border bg-surface-page px-4 py-3 text-[15px] text-sand placeholder:text-sand-faint outline-none transition-colors focus:border-sand disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
}
