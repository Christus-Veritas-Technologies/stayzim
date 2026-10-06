import { cn } from "@stayzim/ui/lib/utils";
import * as React from "react";

/** Nothing here yet: an icon, one line on why, and what to do about it. */
function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "title"> & {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      data-slot="empty-state"
      className={cn("flex flex-col items-center gap-3 px-6 py-10 text-center animate-in fade-in-0 zoom-in-95 duration-300", className)}
      {...props}
    >
      {icon ? (
        <span className="flex size-12 items-center justify-center rounded-2xl border border-[#cbe9f5] bg-brand-wash text-brand [&_svg]:size-[22px]">
          {icon}
        </span>
      ) : null}
      <div className="flex max-w-sm flex-col gap-1">
        <p className="text-[15px] font-semibold text-ink">{title}</p>
        {description ? <p className="text-[13.5px] leading-5 text-muted">{description}</p> : null}
      </div>
      {action ? <div className="mt-1 flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
    </div>
  );
}

export { EmptyState };
