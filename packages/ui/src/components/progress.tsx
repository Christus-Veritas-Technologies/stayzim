"use client";

import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import { cn } from "@stayzim/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const indicatorVariants = cva(
  "block h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
  {
    variants: {
      tone: { brand: "bg-primary", success: "bg-success", purple: "bg-purple", danger: "bg-destructive" },
    },
    defaultVariants: { tone: "brand" },
  },
);

/** Thin bar, e.g. room photos 3 of 5. Slides to its value. */
function Progress({
  className,
  value,
  tone,
  ...props
}: ProgressPrimitive.Root.Props & VariantProps<typeof indicatorVariants>) {
  return (
    <ProgressPrimitive.Root data-slot="progress" value={value} className={cn("w-full", className)} {...props}>
      <ProgressPrimitive.Track className="block h-1.5 w-full overflow-hidden rounded-full bg-line-3">
        <ProgressPrimitive.Indicator className={indicatorVariants({ tone })} />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
}

/** Ring with a label in the middle, e.g. the "2/4" setup checklist or an upload's 64%. */
function ProgressRing({
  value,
  max = 100,
  size = 40,
  stroke = 3.5,
  className,
  children,
  label,
}: {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  className?: string;
  children?: React.ReactNode;
  /** What the ring measures, for screen readers */
  label: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;

  return (
    <span
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn("relative inline-flex shrink-0 items-center justify-center text-primary", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-line-2" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          className="transition-[stroke-dashoffset] duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        />
      </svg>
      {children ? (
        <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-ink tabular-nums">
          {children}
        </span>
      ) : null}
    </span>
  );
}

export { Progress, ProgressRing };
