"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { toggleWatchlist } from "@/lib/auth/watchlist-actions";
import { useRouter } from "next/navigation";

interface WatchlistStarProps {
  generationId: string;
  initialWatched: boolean;
  isAuthenticated: boolean;
  size?: number;
  className?: string;
}

export function WatchlistStar({
  generationId,
  initialWatched,
  isAuthenticated,
  size = 14,
  className = "",
}: WatchlistStarProps) {
  const [watched, setWatched] = useState(initialWatched);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault(); // Prevent link navigation if inside a link
    e.stopPropagation();

    if (!isAuthenticated) {
      const here = typeof window !== "undefined" ? window.location.pathname : "/";
      router.push(`/login?redirect=${encodeURIComponent(here)}`);
      return;
    }

    setLoading(true);
    const result = await toggleWatchlist(generationId);
    if (result.success) {
      setWatched(result.watched);
      // Server-rendered lists (watchlist, alerts) should reflect the change
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`shrink-0 transition-colors ${
        watched
          ? "text-brass hover:text-brass/70"
          : "text-sand-faint hover:text-brass"
      } ${loading ? "opacity-50" : ""} ${className}`}
      title={watched ? "Remove from watchlist" : "Add to watchlist"}
      aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}
      aria-pressed={watched}
    >
      <Star
        size={size}
        strokeWidth={1.25}
        className={watched ? "fill-brass" : "fill-none"}
      />
    </button>
  );
}
