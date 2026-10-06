import { cn } from "@stayzim/ui/lib/utils";
import { Loader2Icon } from "lucide-react";

/** Spinning loader. Pass `label` when it stands alone, so screen readers hear what is loading. */
function Spinner({ className, label, ...props }: React.ComponentProps<"svg"> & { label?: string }) {
  return (
    <Loader2Icon
      data-slot="spinner"
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
