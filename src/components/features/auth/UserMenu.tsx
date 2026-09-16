"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { logout } from "@/lib/auth/actions";

interface UserMenuProps {
  name: string | null;
  email: string;
  avatarUrl?: string | null;
  isAdmin?: boolean;
}

export function UserMenu({ name, email, avatarUrl, isAdmin }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = (name ?? email)
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 label-caps text-sand-subtle hover:text-sand transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- external Google avatar, unknown host
          <img
            src={avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="w-7 h-7 rounded-full object-cover bg-forest"
          />
        ) : (
          <span className="w-7 h-7 rounded-full bg-forest flex items-center justify-center text-[11px] font-medium text-cream">
            {initials}
          </span>
        )}
        <span className="hidden lg:inline">{name ?? email}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-52 rounded-[4px] border border-surface-border bg-surface-page py-1 shadow-[0_12px_40px_-12px_rgba(21,32,27,0.25)] z-50">
          <div className="px-4 py-2 border-b border-surface-border">
            <div className="text-sm text-sand truncate">{name ?? "User"}</div>
            <div className="text-[11px] text-sand-subtle truncate">{email}</div>
          </div>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-sand-subtle hover:text-sand hover:bg-surface-hover transition-colors"
          >
            Profile
          </Link>
          <Link
            href="/portfolio"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-sand-subtle hover:text-sand hover:bg-surface-hover transition-colors"
          >
            My Portfolio
          </Link>
          <Link
            href="/watchlist"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-sand-subtle hover:text-sand hover:bg-surface-hover transition-colors"
          >
            Watchlist
          </Link>
          <Link
            href="/alerts"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-sand-subtle hover:text-sand hover:bg-surface-hover transition-colors"
          >
            Alerts
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-sand-subtle hover:text-sand hover:bg-surface-hover transition-colors border-t border-surface-border"
            >
              Admin
            </Link>
          )}
          <form action={logout}>
            <button
              type="submit"
              className="w-full text-left px-4 py-2 text-sm text-sand-subtle hover:text-sand hover:bg-surface-hover transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
