"use client";

import { useFieldControl } from "@stayzim/ui/components/field";
import { cn } from "@stayzim/ui/lib/utils";
import { ChevronDownIcon } from "lucide-react";
import * as React from "react";

/**
 * The phone's own picker, styled like Input. Best for short fixed lists
 * (times, rooms): it's the fastest to use on a phone and needs no JavaScript.
 */
function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  const controlProps = useFieldControl(props);
  return (
    <span data-slot="native-select" className={cn("relative block w-full min-w-0", className)}>
      <select
        className="h-11 w-full min-w-0 appearance-none rounded-[10px] border border-input bg-field pr-9 pl-3 text-base text-ink shadow-[0_1px_2px_rgba(12,24,31,0.04)] transition-[background-color,border-color,box-shadow] duration-150 outline-none focus-visible:border-ring focus-visible:bg-white focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive aria-invalid:bg-white sm:h-10 sm:text-sm"
        {...controlProps}
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-2" aria-hidden="true" />
    </span>
  );
}

export { NativeSelect };
