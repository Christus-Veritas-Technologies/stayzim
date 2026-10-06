"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@stayzim/ui/components/tooltip";
import { cn } from "@stayzim/ui/lib/utils";
import type { ReactElement } from "react";

/**
 * Wraps a control that can be disabled. While `reason` is set, hovering or
 * focusing it says why, e.g. "No changes to save". Disabled buttons ignore the
 * pointer, so the tooltip hangs on a focusable wrapper instead.
 */
export function WhyDisabled({ reason, className, children }: { reason?: string | null; className?: string; children: ReactElement }) {
  if (!reason) return children;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            tabIndex={0}
            className={cn("inline-flex cursor-not-allowed rounded-[10px] outline-none *:flex-1 focus-visible:ring-3 focus-visible:ring-ring/30", className)}
          />
        }
      >
        {children}
        <span className="sr-only">{reason}</span>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  );
}
