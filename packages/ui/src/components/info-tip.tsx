"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@stayzim/ui/components/popover";
import { cn } from "@stayzim/ui/lib/utils";
import { CircleHelp } from "lucide-react";
import type * as React from "react";

/**
 * The "?" beside a label whose meaning isn't obvious: a sentence or two on
 * hover or focus, or on a tap on phones (a popover, since tooltips don't open
 * on touch). Use it sparingly; a hint under the field is better for anything
 * people need to read. Its name stays "More info" (not the field's), so it
 * never competes with the field for its label.
 */
function InfoTip({ label = "More info", children, className }: { label?: string; children: React.ReactNode; className?: string }) {
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={150}
        aria-label={label}
        className={cn(
          "-m-1.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-2 transition-colors outline-none hover:text-brand focus-visible:text-brand focus-visible:ring-3 focus-visible:ring-ring/30 data-[popup-open]:text-brand",
          className,
        )}
      >
        <CircleHelp className="size-4" strokeWidth={2} aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent>{children}</PopoverContent>
    </Popover>
  );
}

export { InfoTip };
