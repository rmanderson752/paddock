"use client";

import Link from "next/link";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <h1 className="display-serif text-[36px] text-sand mb-3">Something went wrong</h1>
        <p className="text-sm text-sand-muted mb-6">
          An unexpected error occurred. Please try again.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="label-caps rounded-[3px] bg-forest px-5 py-3 text-cream hover:bg-forest-dark transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="label-caps rounded-[3px] border border-surface-border-hover px-5 py-3 text-sand hover:bg-surface-hover transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
