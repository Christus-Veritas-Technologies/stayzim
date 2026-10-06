"use client";

import { Badge } from "@stayzim/ui/components/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@stayzim/ui/components/collapsible";
import { cn } from "@stayzim/ui/lib/utils";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type SectionState = "edited" | "set" | "empty";

/**
 * A part of a form that folds away. Closed, it shows a one-line summary and
 * whether it's set, so owners see the whole page at a glance.
 */
export function FormSection({
  icon: Icon,
  title,
  summary,
  state,
  defaultOpen = false,
  children,
}: {
  icon: LucideIcon;
  title: string;
  /** One line under the title, e.g. "WhatsApp +263 77 123 4567" */
  summary: ReactNode;
  state: SectionState;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className="group/section rounded-2xl bg-surface-2 p-1 transition-shadow data-open:bg-[#EEF3F6] data-open:shadow-[0_0_0_1px_rgba(12,24,31,0.05)]"
    >
      <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/30">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-white text-brand shadow-xs">
          <Icon className="size-[18px]" strokeWidth={1.75} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[14px] font-semibold text-ink">{title}</span>
          <span className="truncate text-[12.5px] text-muted">{summary}</span>
        </span>
        {state === "edited" ? (
          <Badge variant="purple" className="animate-in zoom-in-90">
            <span className="size-1.5 rounded-full bg-purple" />
            Edited
          </Badge>
        ) : state === "set" ? (
          <Badge variant="success">
            <Check />
            Set
          </Badge>
        ) : (
          <Badge>Not set</Badge>
        )}
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white text-muted-2 shadow-xs">
          <ChevronDown className={cn("size-4 transition-transform duration-300 group-data-open/section:rotate-180")} />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 flex flex-col gap-4 rounded-xl bg-white p-4 shadow-[0_1px_2px_rgba(12,24,31,0.05)]">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
