import { cn } from "@stayzim/ui/lib/utils";
import * as React from "react";

/** White card with a hairline ring and a soft drop shadow, 20px corners. */
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "group/card flex flex-col rounded-[20px] bg-card text-sm text-card-foreground shadow-card has-data-[slot=card-footer]:pb-0",
        className,
      )}
      {...props}
    />
  );
}

/** Title row: icon, title and description on the left, actions (`CardAction`) on the right. */
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 px-4 pt-4 pb-3 sm:px-5 sm:pt-[18px] [.border-b]:pb-4",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="card-title"
      className={cn("flex items-center gap-2 text-[15px] leading-5 font-semibold text-ink", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="card-description" className={cn("text-[13px] leading-5 text-muted", className)} {...props} />;
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-action" className={cn("ml-auto flex items-center gap-2", className)} {...props} />;
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("px-4 pb-4 sm:px-5 sm:pb-5", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center gap-3 border-t border-line-3 px-4 py-3 text-[13px] text-muted sm:px-5",
        className,
      )}
      {...props}
    />
  );
}

export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
