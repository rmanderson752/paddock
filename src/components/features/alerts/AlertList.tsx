"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, BellOff, Trash2 } from "lucide-react";
import { formatPrice, formatDate } from "@/lib/utils";
import { deleteAlert, setAlertActive } from "@/lib/auth/alert-actions";
import type { AlertWithStatus } from "@/lib/alerts";

interface AlertListProps {
  alerts: AlertWithStatus[];
}

function conditionLabel(alert: AlertWithStatus): string {
  if (alert.alertType === "sale") return "Any new sale";
  const price = formatPrice(alert.thresholdPrice ?? 0);
  return alert.alertType === "threshold_below" ? `Sells below ${price}` : `Sells above ${price}`;
}

export function AlertList({ alerts }: AlertListProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete(id: string) {
    setBusy(id);
    await deleteAlert(id);
    setBusy(null);
    router.refresh();
  }

  async function handleToggle(alert: AlertWithStatus) {
    setBusy(alert.id);
    await setAlertActive(alert.id, !alert.isActive);
    setBusy(null);
    router.refresh();
  }

  if (alerts.length === 0) {
    return (
      <div className="border-y border-surface-border py-12 text-center">
        <p className="display-serif text-[20px] italic text-sand-muted">No alerts yet.</p>
        <p className="mt-3 text-[13px] text-sand-subtle">
          Open any car and choose <span className="label-caps text-sand">Set alert</span> to watch for a sale or a target price.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="divide-y divide-surface-border border-y border-surface-border">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`flex items-center gap-4 py-4 ${alert.isActive ? "" : "opacity-60"}`}
          >
            <div
              className={`w-2 h-2 rounded-full shrink-0 ${
                alert.triggered ? "bg-forest-light" : "bg-sand-faint"
              }`}
              title={alert.triggered ? "Condition met" : "Watching"}
            />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <Link
                  href={`/car/${alert.car.make.slug}/${alert.car.model.slug}/${alert.car.slug}`}
                  className="display-serif text-[18px] text-sand hover:underline decoration-[0.5px] underline-offset-4"
                >
                  {alert.car.make.name} {alert.car.name}
                </Link>
                <span className="label-caps text-sand-subtle">{conditionLabel(alert)}</span>
              </div>
              <div className="text-[12px] text-sand-faint mt-1">
                {alert.triggered ? (
                  <span className="text-forest font-medium">Condition met · </span>
                ) : alert.isActive ? (
                  <span>Watching · </span>
                ) : (
                  <span>Paused · </span>
                )}
                {alert.detail} · set {formatDate(alert.createdAt)}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => handleToggle(alert)}
                disabled={busy === alert.id}
                className="w-8 h-8 flex items-center justify-center rounded-full text-sand-faint hover:text-sand hover:bg-surface-hover transition-colors disabled:opacity-50"
                title={alert.isActive ? "Pause alert" : "Resume alert"}
              >
                {alert.isActive ? <BellOff size={14} /> : <Bell size={14} />}
              </button>
              <button
                onClick={() => handleDelete(alert.id)}
                disabled={busy === alert.id}
                className="w-8 h-8 flex items-center justify-center rounded-full text-sand-faint hover:text-sand hover:bg-surface-hover transition-colors disabled:opacity-50"
                title="Delete alert"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
