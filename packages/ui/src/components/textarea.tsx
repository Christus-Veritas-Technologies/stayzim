"use client";

import { useFieldControl } from "@stayzim/ui/components/field";
import { fieldFocus, fieldInvalid, fieldSurface } from "@stayzim/ui/components/input";
import { cn } from "@stayzim/ui/lib/utils";
import * as React from "react";

/** Grows with its content (field-sizing), starting at about three lines. */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  const controlProps = useFieldControl(props);
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        fieldSurface,
        fieldFocus,
        fieldInvalid,
        "field-sizing-content min-h-24 w-full min-w-0 resize-none px-3 py-2.5 leading-6 outline-none placeholder:text-soft disabled:cursor-not-allowed disabled:opacity-60 sm:leading-[22px]",
        className,
      )}
      {...controlProps}
    />
  );
}

export { Textarea };
