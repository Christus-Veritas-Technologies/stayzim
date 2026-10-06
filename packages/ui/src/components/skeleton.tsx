import { cn } from "@stayzim/ui/lib/utils";

/** Grey placeholder in the shape of content that is still loading. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("animate-pulse rounded-[10px] bg-line-3 motion-reduce:animate-none", className)}
      {...props}
    />
  );
}

export { Skeleton };
