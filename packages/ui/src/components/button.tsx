import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { Spinner } from "@stayzim/ui/components/spinner";
import { cn } from "@stayzim/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center gap-2 rounded-[10px] border border-transparent text-sm font-semibold whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] duration-150 outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/30 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 aria-invalid:border-destructive motion-reduce:active:scale-100 data-loading:[&>svg:not([data-slot=spinner])]:hidden [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /** Kariba blue: the one main action on a screen */
        default: "bg-primary text-primary-foreground shadow-brand hover:bg-brand-dark",
        outline: "border-input bg-white text-ink shadow-xs hover:border-[#cfd8dd] hover:bg-surface aria-expanded:bg-surface",
        secondary: "bg-secondary text-ink hover:bg-line-3 aria-expanded:bg-line-3",
        ghost: "text-slate hover:bg-secondary hover:text-ink aria-expanded:bg-secondary aria-expanded:text-ink",
        /** Small inline actions inside a row, e.g. "Upload" in the setup checklist */
        dark: "bg-ink text-white hover:bg-ink-2",
        /** Jacaranda: plans and the trial */
        accent: "bg-purple text-white hover:bg-purple-dark",
        /** Only for buttons that open WhatsApp */
        whatsapp: "rounded-full bg-whatsapp text-ink hover:bg-whatsapp-dark",
        destructive: "bg-destructive text-white hover:bg-[#912018] focus-visible:ring-destructive/25",
        link: "h-auto rounded-sm px-0 text-brand hover:text-brand-dark hover:underline active:scale-100",
      },
      size: {
        xs: "h-7 gap-1 rounded-[7px] px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-[34px] gap-1.5 px-3 text-[13px]",
        default: "h-10 px-3.5",
        lg: "h-11 px-4",
        xl: "h-12 px-5 text-base",
        icon: "size-10",
        "icon-sm": "size-8 rounded-[9px]",
        "icon-xs": "size-7 rounded-[7px] [&_svg:not([class*='size-'])]:size-3.5",
      },
    },
    compoundVariants: [{ variant: "link", className: "h-auto px-0" }],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    /** Shows a spinner in place of the leading icon and blocks clicks while work is in flight. */
    loading?: boolean;
  };

function Button({ className, variant, size, loading = false, disabled, children, ...props }: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      focusableWhenDisabled={loading}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {loading ? <Spinner /> : null}
      {children}
    </ButtonPrimitive>
  );
}

export { Button, buttonVariants, type ButtonProps };
