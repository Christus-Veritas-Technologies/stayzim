"use client";

import { cn } from "@stayzim/ui/lib/utils";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

import { PLAN_ORDER, PLANS, type PlanKey } from "@/lib/lodge";

/** "growth" (from a landing page link) → "GROWTH"; anything else → Growth, the plan most lodges want. */
export function planFromParam(value: string | null | undefined): PlanKey {
  const upper = value?.toUpperCase();
  return upper === "STARTER" || upper === "PRO" ? upper : "GROWTH";
}

/** Three plan cards in a row, one picked: sign-up and the start screen. */
export function PlanPicker({ value, onChange, disabled = false }: { value: PlanKey; onChange: (plan: PlanKey) => void; disabled?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Plan" className="grid grid-cols-3 gap-2">
      {PLAN_ORDER.map((key) => {
        const plan = PLANS[key];
        const picked = key === value;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={picked}
            disabled={disabled}
            onClick={() => onChange(key)}
            className={cn(
              "relative flex min-w-0 flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-[border-color,background-color,box-shadow] duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-60",
              picked ? "border-brand bg-brand-wash shadow-[0_0_0_1px_var(--color-brand)]" : "border-input bg-white hover:border-[#cfd8dd]",
            )}
          >
            {picked ? (
              <motion.span
                layoutId="plan-picker-check"
                transition={{ type: "spring", stiffness: 500, damping: 34 }}
                className="absolute top-2 right-2 flex size-4 items-center justify-center rounded-full bg-brand text-white"
              >
                <Check className="size-3" strokeWidth={3} />
              </motion.span>
            ) : null}
            <span className={cn("text-[13.5px] font-semibold", picked ? "text-brand-dark" : "text-ink")}>{plan.name}</span>
            <span className="text-[12.5px] text-muted">
              <strong className="font-semibold text-ink">${plan.price}</strong>/mo
            </span>
          </button>
        );
      })}
    </div>
  );
}
