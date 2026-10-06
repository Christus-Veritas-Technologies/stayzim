import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "@stayzim/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex h-[22px] w-fit shrink-0 items-center justify-center gap-1 rounded-md border px-[7px] text-xs font-semibold whitespace-nowrap tabular-nums [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        neutral: "border-line bg-surface-2 text-slate",
        brand: "border-[#cbe9f5] bg-brand-wash text-brand-dark",
        success: "border-success-line bg-success-tint text-success",
        /** Jacaranda: the trial and booking chats */
        purple: "border-purple-line bg-purple-tint text-purple-dark",
        warning: "border-warning-line bg-warning-tint text-warning",
        danger: "border-danger-line bg-danger-tint text-danger",
        /** On a Kariba or dark card */
        inverse: "border-transparent bg-white/16 text-white",
      },
      /** Uppercase status pill with a dot, e.g. ON SITE, NEEDS PHOTO */
      status: {
        true: "h-6 gap-1.5 rounded-md bg-white px-2 text-[11px] font-bold tracking-[0.04em] uppercase",
        false: "",
      },
    },
    compoundVariants: [
      { status: true, variant: "neutral", className: "border-line text-slate" },
      { status: true, variant: "success", className: "border-line text-ink-2 [&_[data-dot]]:bg-success" },
      { status: true, variant: "warning", className: "border-line text-ink-2 [&_[data-dot]]:bg-[#e8833a]" },
      { status: true, variant: "danger", className: "border-line text-ink-2 [&_[data-dot]]:bg-danger" },
      { status: true, variant: "purple", className: "border-line text-ink-2 [&_[data-dot]]:bg-purple" },
    ],
    defaultVariants: { variant: "neutral", status: false },
  },
);

function Badge({
  className,
  variant,
  status,
  render,
  children,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant, status }), className),
        children: (
          <>
            {status ? <span data-dot aria-hidden="true" className="size-1.5 rounded-full bg-current" /> : null}
            {children}
          </>
        ),
      },
      props,
    ),
    render,
    state: { slot: "badge", variant },
  });
}

export { Badge, badgeVariants };
