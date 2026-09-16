import { cn } from "@/lib/utils";

interface LogoMarkProps {
  size?: number;
  className?: string;
}

// The Paddock mark — a stylised paddock gate. Inherits `currentColor`.
export function LogoMark({ size = 22, className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 52 52"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <path
        d="M11 42 L11 13 L26 6 L41 13 L41 42"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

// Wordmark lockup used in the header and on auth pages
export function Wordmark({ size = "md", className }: { size?: "md" | "lg"; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size === "lg" ? 26 : 18} />
      <span
        className={cn(
          "display-serif tracking-[0.08em] uppercase text-sand",
          size === "lg" ? "text-[26px]" : "text-[18px]"
        )}
      >
        Paddock
      </span>
    </span>
  );
}
