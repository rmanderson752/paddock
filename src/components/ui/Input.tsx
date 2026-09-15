"use client";

import { cn } from "@/lib/utils";
import { type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "w-full rounded-[10px] border-[0.5px] border-surface-border bg-surface px-4 py-3.5 text-[15px] text-sand placeholder:text-sand-faint outline-none transition-colors focus:border-surface-border-hover",
        className
      )}
      {...props}
    />
  );
}
