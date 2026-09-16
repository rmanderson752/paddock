"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";

interface AdminAction {
  key: string;
  title: string;
  description: string;
  endpoint: string;
  label: string;
  busyLabel: string;
}

const actions: AdminAction[] = [
  {
    key: "refresh",
    title: "Refresh data from Bring a Trailer",
    description: "Scrapes every configured model page for new results, then recomputes stats and the search index. Takes a couple of minutes — this is what the scheduled job runs.",
    endpoint: "/api/admin/refresh-data",
    label: "Refresh now",
    busyLabel: "Refreshing… (≈2 min)",
  },
  {
    key: "extract",
    title: "Extract listing details",
    description: "Fetches up to 25 missing Bring a Trailer listing pages, then has Claude extract structured details for up to 50 sales that don't have them yet. Runs automatically as part of every refresh.",
    endpoint: "/api/admin/extract-details",
    label: "Extract pending",
    busyLabel: "Extracting… (≈1–2 min)",
  },
  {
    key: "stats",
    title: "Recompute stats & indices",
    description: "Rebuilds generation stats and category indices from the sales table",
    endpoint: "/api/admin/refresh-stats",
    label: "Recompute",
    busyLabel: "Computing...",
  },
  {
    key: "fts",
    title: "Rebuild search index",
    description: "Rebuilds the FTS5 full-text search index after adding or renaming cars",
    endpoint: "/api/admin/rebuild-fts",
    label: "Rebuild",
    busyLabel: "Rebuilding...",
  },
];

export function AdminActions() {
  const [busy, setBusy] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const router = useRouter();

  async function run(action: AdminAction) {
    setBusy(action.key);
    setMessages((m) => ({ ...m, [action.key]: "" }));
    try {
      const res = await fetch(action.endpoint, { method: "POST" });
      const data = await res.json();
      setMessages((m) => ({ ...m, [action.key]: data.message ?? data.error ?? "Done" }));
      if (res.ok) router.refresh();
    } catch {
      setMessages((m) => ({ ...m, [action.key]: "Request failed" }));
    }
    setBusy(null);
  }

  return (
    <Card>
      <div className="divide-y divide-surface-border">
        {actions.map((action) => (
          <div key={action.key} className="py-3 first:pt-0 last:pb-0 space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[14px] text-sand">{action.title}</div>
                <div className="text-[12px] text-sand-faint mt-0.5">{action.description}</div>
              </div>
              <button
                onClick={() => run(action)}
                disabled={busy !== null}
                className="shrink-0 label-caps rounded-[3px] bg-forest px-4 py-2.5 text-cream hover:bg-forest-dark transition-colors disabled:opacity-50"
              >
                {busy === action.key ? action.busyLabel : action.label}
              </button>
            </div>
            {messages[action.key] && (
              <div className="text-[12px] text-forest">{messages[action.key]}</div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
