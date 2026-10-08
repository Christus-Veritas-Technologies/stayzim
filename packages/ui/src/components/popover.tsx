"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { cn } from "@stayzim/ui/lib/utils";

function Popover(props: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger(props: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

/** A small card beside its trigger, e.g. the text of an InfoTip. */
function PopoverContent({
  className,
  side = "top",
  sideOffset = 8,
  align = "center",
  children,
  ...props
}: PopoverPrimitive.Popup.Props & Pick<PopoverPrimitive.Positioner.Props, "side" | "sideOffset" | "align">) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner className="isolate z-50" side={side} sideOffset={sideOffset} align={align} collisionPadding={12}>
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            "max-w-[min(18rem,calc(100vw-24px))] origin-(--transform-origin) rounded-[12px] bg-ink px-3 py-2.5 text-[13px] leading-[18px] font-medium text-white shadow-[0_10px_28px_rgba(12,24,31,0.24)] outline-none transition-[opacity,scale] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none",
            className,
          )}
          {...props}
        >
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverContent, PopoverTrigger };
