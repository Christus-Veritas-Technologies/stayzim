"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { backdropClassName, CloseButton } from "@stayzim/ui/components/dialog";
import { cn } from "@stayzim/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

/** A panel that slides in from the edge, e.g. Add room. Full screen on phones. */
function Sheet(props: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger(props: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose(props: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="sheet-close" {...props} />;
}

const sheetVariants = cva(
  "fixed z-50 flex flex-col bg-popover text-popover-foreground shadow-pop outline-none transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
  {
    variants: {
      side: {
        right:
          "inset-y-0 right-0 w-full data-ending-style:translate-x-full data-starting-style:translate-x-full sm:inset-y-2 sm:right-2 sm:max-w-[460px] sm:rounded-[20px]",
        bottom:
          "inset-x-0 bottom-0 max-h-[92svh] rounded-t-[24px] data-ending-style:translate-y-full data-starting-style:translate-y-full",
      },
    },
    defaultVariants: { side: "right" },
  },
);

function SheetContent({
  className,
  side,
  children,
  ...props
}: DialogPrimitive.Popup.Props & VariantProps<typeof sheetVariants>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className={backdropClassName} />
      <DialogPrimitive.Popup data-slot="sheet-content" className={cn(sheetVariants({ side }), className)} {...props}>
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

/** Title, description and the close button, with a hairline under it. */
function SheetHeader({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex items-start gap-3 border-b border-line-3 px-5 pt-5 pb-4", className)}
      {...props}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">{children}</div>
      <CloseButton />
    </div>
  );
}

function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-body" className={cn("flex-1 overflow-y-auto px-5 py-5", className)} {...props} />;
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        "flex items-center justify-end gap-2 border-t border-line-3 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
        className,
      )}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="sheet-title"
      className={cn("font-display text-lg leading-6 font-semibold tracking-[-0.01em] text-ink", className)}
      {...props}
    />
  );
}

function SheetDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-[13px] leading-5 text-muted", className)}
      {...props}
    />
  );
}

export { Sheet, SheetBody, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger };
