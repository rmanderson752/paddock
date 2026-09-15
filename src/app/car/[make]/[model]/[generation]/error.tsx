"use client";

import Link from "next/link";

export default function CarDetailError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center">
        <h1 className="font-serif text-2xl mb-2">Failed to load car data</h1>
        <p className="text-sm text-sand-muted mb-6">
          We couldn&apos;t load this car&apos;s details. Please try again.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 text-sm bg-forest text-cream rounded-lg hover:bg-forest-dark transition-colors"
          >
            Try again
          </button>
          <Link
            href="/browse"
            className="px-4 py-2 text-sm border border-surface-border rounded-lg hover:bg-surface-hover transition-colors"
          >
            Browse cars
          </Link>
        </div>
      </div>
    </div>
  );
}
