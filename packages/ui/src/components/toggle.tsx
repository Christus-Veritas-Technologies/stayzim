"use client";

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { cn } from "@stayzim/ui/lib/utils";
import { CheckIcon } from "lucide-react";

/**
 * A chip that turns Kariba when picked, with a tick, e.g. room amenities.
 * Inside a <ToggleGroup>, it toggles its `value` in the group's list.
 */
function Toggle({ className, children, ...props }: TogglePrimitive.Props) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(
        "group/toggle inline-flex h-9 items-center gap-1.5 rounded-full border border-input bg-white px-3 text-[13px] font-medium text-slate transition-[background-color,border-color,color] duration-150 outline-none select-none hover:border-[#cfd8dd] hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/30 active:scale-[0.97] data-disabled:pointer-events-none data-disabled:opacity-50 data-pressed:border-brand/40 data-pressed:bg-brand-wash data-pressed:font-semibold data-pressed:text-brand-dark motion-reduce:active:scale-100 sm:h-8 [&_svg:not([class*='size-'])]:size-3.5",
        className,
      )}
      {...props}
    >
      <CheckIcon
        aria-hidden="true"
        className="-ml-0.5 hidden size-3.5 animate-in zoom-in-50 group-data-pressed/toggle:block"
        strokeWidth={2.5}
      />
      {children}
    </TogglePrimitive>
  );
}

function ToggleGroup({ className, ...props }: ToggleGroupPrimitive.Props) {
  return (
    <ToggleGroupPrimitive data-slot="toggle-group" className={cn("flex flex-wrap gap-2", className)} {...props} />
  );
}

export { Toggle, ToggleGroup };
