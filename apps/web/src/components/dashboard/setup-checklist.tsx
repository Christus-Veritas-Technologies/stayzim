"use client";

import { buttonVariants } from "@stayzim/ui/components/button";
import { ProgressRing } from "@stayzim/ui/components/progress";
import { cn } from "@stayzim/ui/lib/utils";
import { motion } from "framer-motion";
import { CircleCheck, CircleDashed } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { useLodge } from "@/components/dashboard/lodge-provider";
import { useShareLink } from "@/components/dashboard/share";
import { EASE_OUT } from "@/components/motion";
import { setupSteps, type SetupStep } from "@/lib/lodge";

const ACTIONS: Record<SetupStep["key"], { label: string; href?: Route }> = {
  rooms: { label: "Add", href: "/dashboard/rooms" },
  photos: { label: "Upload", href: "/dashboard/gallery" },
  whatsapp: { label: "Check", href: "/dashboard/site" },
  "guest-info": { label: "Add", href: "/dashboard/guest-info" },
  share: { label: "Share" },
};

function StepAction({ step }: { step: SetupStep }) {
  const share = useShareLink();
  const action = ACTIONS[step.key];
  const className = buttonVariants({ variant: "dark", size: "xs" });
  if (action.href) {
    return (
      <Link href={action.href} className={className}>
        {action.label}
      </Link>
    );
  }
  return (
    <a href={share.whatsappUrl()} target="_blank" rel="noreferrer" onClick={share.markShared} className={className}>
      {action.label}
    </a>
  );
}

/**
 * Finish setting up: rooms, photos, WhatsApp number, share the link. A strip on
 * desktop, a list on phones. Gone once everything is done.
 */
export function SetupChecklist() {
  const { lodge } = useLodge();
  const steps = setupSteps(lodge);
  const done = steps.filter((step) => step.done).length;
  if (done === steps.length) return null;
  const left = steps.length - done;

  return (
    <section
      aria-label="Finish setting up"
      className="flex flex-col gap-3 rounded-[14px] border border-[#D6EDF5] bg-[linear-gradient(90deg,#EFF9FD_0%,#F8FCFE_55%,#FFFFFF_100%)] p-3.5 sm:px-4 lg:flex-row lg:items-center lg:gap-[18px]"
    >
      <div className="flex shrink-0 items-center gap-3">
        <ProgressRing value={done} max={steps.length} size={42} label="Setup steps done">
          {done}/{steps.length}
        </ProgressRing>
        <div className="flex flex-col">
          <span className="text-[15px] font-semibold">Finish setting up</span>
          <span className="text-[13px] text-muted">
            {left} {left === 1 ? "step" : "steps"} left
          </span>
        </div>
      </div>

      <ol className="flex flex-col gap-1.5 sm:grid sm:grid-cols-2 lg:ml-auto lg:gap-2 2xl:flex 2xl:flex-row">
        {steps.map((step, index) => (
          <motion.li
            key={step.key}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.15 + index * 0.06, ease: EASE_OUT }}
            className={cn(
              "flex h-11 items-center gap-2 rounded-[10px] border pr-1.5 pl-3 text-[13.5px] lg:h-10",
              step.done
                ? "border-line bg-white/70 text-muted-2"
                : "border-input bg-white font-semibold text-ink shadow-xs",
            )}
          >
            {step.done ? (
              <CircleCheck className="size-4 shrink-0 text-brand" />
            ) : (
              <CircleDashed className="size-4 shrink-0 text-soft" />
            )}
            <span className={cn("flex-1", step.done && "line-through decoration-[#B8C2C8]")}>{step.label}</span>
            {step.done ? <span className="w-1" /> : <StepAction step={step} />}
          </motion.li>
        ))}
      </ol>
    </section>
  );
}
