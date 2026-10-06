"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "@stayzim/ui/lib/utils";

/** An on/off switch, for settings that save as a whole with the form (e.g. "Show on site"). */
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-soft p-0.5 transition-colors duration-200 outline-none after:absolute after:-inset-2 focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 data-checked:bg-primary motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="block size-5 rounded-full bg-white shadow-xs transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] data-checked:translate-x-4 motion-reduce:transition-none"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
