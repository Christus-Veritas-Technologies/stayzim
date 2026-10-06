"use client";

import { NumberField as NumberFieldPrimitive } from "@base-ui/react/number-field";
import { useFieldControl } from "@stayzim/ui/components/field";
import { fieldSurface } from "@stayzim/ui/components/input";
import { cn } from "@stayzim/ui/lib/utils";
import { MinusIcon, PlusIcon } from "lucide-react";

const stepButton =
  "flex size-8 shrink-0 items-center justify-center rounded-[8px] text-muted-2 transition-colors outline-none hover:bg-secondary hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/30 active:scale-95 disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4";

/** Whole-number stepper, e.g. Sleeps: − 3 +. */
function NumberField({
  className,
  id,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  ...props
}: NumberFieldPrimitive.Root.Props & { "aria-describedby"?: string; "aria-invalid"?: boolean }) {
  const control = useFieldControl({ id, "aria-describedby": describedBy, "aria-invalid": invalid });
  return (
    <NumberFieldPrimitive.Root data-slot="number-field" id={control.id} className={className} {...props}>
      <NumberFieldPrimitive.Group
        className={cn(
          fieldSurface,
          "flex h-11 items-center justify-between gap-1 px-1 has-[input:focus-visible]:border-ring has-[input:focus-visible]:bg-white has-[input:focus-visible]:ring-3 has-[input:focus-visible]:ring-ring/20 sm:h-10",
        )}
      >
        <NumberFieldPrimitive.Decrement aria-label="Fewer" className={stepButton}>
          <MinusIcon />
        </NumberFieldPrimitive.Decrement>
        <NumberFieldPrimitive.Input
          aria-describedby={control["aria-describedby"]}
          aria-invalid={control["aria-invalid"]}
          className="h-full w-full min-w-0 bg-transparent text-center text-base font-semibold text-ink tabular-nums outline-none sm:text-sm"
        />
        <NumberFieldPrimitive.Increment aria-label="More" className={stepButton}>
          <PlusIcon />
        </NumberFieldPrimitive.Increment>
      </NumberFieldPrimitive.Group>
    </NumberFieldPrimitive.Root>
  );
}

export { NumberField };
