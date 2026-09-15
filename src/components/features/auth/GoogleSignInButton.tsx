import Link from "next/link";

interface GoogleSignInButtonProps {
  /** Same-origin path to return to after signing in */
  redirectTo?: string;
  label?: string;
}

// Plain link into the OAuth start route — works without JavaScript and needs
// no client state. The route validates the redirect path.
export function GoogleSignInButton({ redirectTo, label = "Continue with Google" }: GoogleSignInButtonProps) {
  const href = redirectTo
    ? `/api/auth/google?redirect=${encodeURIComponent(redirectTo)}`
    : "/api/auth/google";

  return (
    <Link
      href={href}
      prefetch={false}
      className="flex w-full items-center justify-center gap-2.5 rounded-full border-[0.5px] border-surface-border bg-surface-page px-4 py-2.5 text-sm font-medium text-sand transition-colors hover:border-surface-border-hover hover:bg-surface-hover"
    >
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.5 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.7 17.7 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z" />
        <path fill="#FBBC05" d="M10.5 28.6A14.5 14.5 0 0 1 9.7 24c0-1.6.3-3.2.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6.1z" />
        <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.3 0-11.6-4.2-13.5-10l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
      </svg>
      {label}
    </Link>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.5px] text-sand-faint">
      <span className="h-px flex-1 bg-surface-border" />
      or
      <span className="h-px flex-1 bg-surface-border" />
    </div>
  );
}
