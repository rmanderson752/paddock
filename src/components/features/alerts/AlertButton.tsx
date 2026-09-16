"use client";

import { useState, useRef, useEffect, useActionState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createAlert, type AlertActionResult, type AlertType } from "@/lib/auth/alert-actions";
import { formatPrice } from "@/lib/utils";

interface AlertButtonProps {
  generationId: string;
  carName: string;
  /** Current average, used as the default target price */
  referencePrice: number;
  isAuthenticated: boolean;
  returnPath: string;
}

const options: { value: AlertType; label: string; hint: string }[] = [
  { value: "sale", label: "Any new sale", hint: "Flag the next completed sale" },
  { value: "threshold_below", label: "Sells below", hint: "A sale at or under your target" },
  { value: "threshold_above", label: "Sells above", hint: "A sale at or over your target" },
];

export function AlertButton({
  generationId,
  carName,
  referencePrice,
  isAuthenticated,
  returnPath,
}: AlertButtonProps) {
  const [open, setOpen] = useState(false);
  const [alertType, setAlertType] = useState<AlertType>("sale");
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  const [state, formAction, isPending] = useActionState(
    async (prev: AlertActionResult | null, formData: FormData) => {
      const result = await createAlert(prev, formData);
      if (result.success) {
        setSaved(true);
        setOpen(false);
      }
      return result;
    },
    null
  );

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  function handleToggle() {
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(returnPath)}`);
      return;
    }
    setOpen((v) => !v);
  }

  const needsPrice = alertType !== "sale";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleToggle}
        className={`inline-flex items-center gap-2 label-caps transition-colors ${
          saved ? "text-forest" : "text-sand-subtle hover:text-sand"
        }`}
        title={saved ? "Alert set — manage on the Alerts page" : "Set a price alert"}
        aria-expanded={open}
      >
        <Bell size={13} strokeWidth={1.5} className={saved ? "fill-current" : ""} />
        {saved ? "Alert set" : "Set alert"}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-3 w-80 max-w-[calc(100vw-2rem)] rounded-[4px] border border-surface-border bg-surface-page p-5 shadow-[0_16px_48px_-16px_rgba(21,32,27,0.3)] z-40">
          <div className="label-caps text-brass mb-1">Price alert</div>
          <div className="display-serif text-[18px] text-sand mb-4 truncate">{carName}</div>

          <form action={formAction} className="space-y-3">
            <input type="hidden" name="generationId" value={generationId} />
            <input type="hidden" name="alertType" value={alertType} />

            <div className="space-y-1.5">
              {options.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-2.5 rounded-[3px] border px-3 py-2.5 cursor-pointer transition-colors ${
                    alertType === opt.value
                      ? "border-forest bg-forest-muted"
                      : "border-surface-border hover:border-surface-border-hover"
                  }`}
                >
                  <input
                    type="radio"
                    name="alertTypeChoice"
                    value={opt.value}
                    checked={alertType === opt.value}
                    onChange={() => setAlertType(opt.value)}
                    className="mt-0.5 accent-[#0f3d31]"
                  />
                  <span>
                    <span className="block text-[13px] text-sand">{opt.label}</span>
                    <span className="block text-[10px] text-sand-faint">{opt.hint}</span>
                  </span>
                </label>
              ))}
            </div>

            {needsPrice && (
              <div>
                <label htmlFor="thresholdPrice" className="block text-[11px] text-sand-subtle mb-1">
                  Target price (USD)
                </label>
                <Input
                  id="thresholdPrice"
                  name="thresholdPrice"
                  type="number"
                  min="1"
                  step="1"
                  defaultValue={Math.round(referencePrice / 100)}
                  className="py-2 text-[14px]"
                  required
                />
                <div className="text-[10px] text-sand-faint mt-1">
                  12-mo average is {formatPrice(referencePrice)}
                </div>
              </div>
            )}

            {state?.error && (
              <div className="rounded-lg bg-maroon-muted px-3 py-2 text-[12px] text-sand">{state.error}</div>
            )}

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isPending} className="flex-1">
                {isPending ? "Saving..." : "Save alert"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
