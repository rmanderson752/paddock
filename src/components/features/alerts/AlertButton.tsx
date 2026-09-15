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
        className={`inline-flex items-center gap-1.5 rounded-full border-[0.5px] px-3 py-1 text-[11px] font-medium transition-colors ${
          saved
            ? "border-forest bg-forest text-cream"
            : "border-surface-border text-sand-subtle hover:border-surface-border-hover hover:text-sand"
        }`}
        title={saved ? "Alert set — manage on the Alerts page" : "Set a price alert"}
        aria-expanded={open}
      >
        <Bell size={12} className={saved ? "fill-current" : ""} />
        {saved ? "Alert set" : "Set alert"}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border-[0.5px] border-surface-border bg-surface p-4 shadow-xl z-40">
          <div className="text-sm font-medium text-sand mb-0.5">Price alert</div>
          <div className="text-[11px] text-sand-subtle mb-3 truncate">{carName}</div>

          <form action={formAction} className="space-y-3">
            <input type="hidden" name="generationId" value={generationId} />
            <input type="hidden" name="alertType" value={alertType} />

            <div className="space-y-1.5">
              {options.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-2 rounded-lg border-[0.5px] px-3 py-2 cursor-pointer transition-colors ${
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
                    className="mt-0.5 accent-[#12503f]"
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
